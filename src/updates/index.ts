import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Directory, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

/**
 * In-app updater for sideloaded builds.
 *
 * The app ships as an APK on GitHub Releases rather than through a store, so
 * nothing updates it automatically. This checks the Releases API, downloads the
 * build matching the device's CPU architecture, and hands it to Android's
 * package installer.
 *
 * Android only. iOS has no sanctioned way for an app to install another app.
 */

const REPO = 'dlyrr/weao-mobile';
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;
export const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;

/** Android intent flags (android.content.Intent). */
const FLAG_GRANT_READ_URI_PERMISSION = 0x00000001;
const FLAG_ACTIVITY_NEW_TASK = 0x10000000;

const APK_MIME = 'application/vnd.android.package-archive';

export interface UpdateInfo {
  /** Semantic version without the leading "v". */
  version: string;
  tag: string;
  notes: string;
  publishedAt: string;
  assetName: string;
  assetUrl: string;
  sizeBytes: number;
}

export class UpdateError extends Error {}

/** Whether an in-app update is possible at all on this platform. */
export function updatesSupported(): boolean {
  return Platform.OS === 'android';
}

/**
 * The version actually installed. `nativeApplicationVersion` is the truth on a
 * real build but is null on web and in some dev contexts, where the value
 * compiled into the config is the best available answer.
 */
export function currentVersion(): string {
  return (
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    '0.0.0'
  );
}

/**
 * Compares dotted numeric versions. Returns >0 when `a` is newer than `b`.
 * Non-numeric suffixes are ignored, so "1.2.3-beta" compares as "1.2.3".
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split(/[.\-+]/)
      .map((p) => Number.parseInt(p, 10))
      .filter((n) => Number.isFinite(n));

  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * The release carries one APK per ABI, so the device's own architecture
 * decides which to fetch. `supportedCpuArchitectures` is ordered best-first.
 */
function pickAssetForDevice(
  assets: Array<{ name: string; browser_download_url: string; size: number }>,
) {
  const apks = assets.filter((a) => a.name.endsWith('.apk'));
  if (apks.length === 0) return null;

  const abis = Device.supportedCpuArchitectures ?? [];
  for (const abi of abis) {
    const match = apks.find((a) => a.name.includes(abi));
    if (match) return match;
  }

  // An unrecognised architecture is better served by nothing than by an APK
  // that cannot install.
  return null;
}

/** Resolves to the newer release, or null when already up to date. */
export async function checkForUpdate(signal?: AbortSignal): Promise<UpdateInfo | null> {
  if (!updatesSupported()) return null;

  const res = await fetch(RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  });

  if (res.status === 403 || res.status === 429) {
    // The unauthenticated API allows 60 requests an hour per IP.
    throw new UpdateError('GitHub rate limit reached. Try again later.');
  }
  if (!res.ok) {
    throw new UpdateError(`Could not reach GitHub (${res.status}).`);
  }

  const release = (await res.json()) as {
    tag_name?: string;
    body?: string;
    published_at?: string;
    draft?: boolean;
    prerelease?: boolean;
    assets?: Array<{ name: string; browser_download_url: string; size: number }>;
  };

  if (release.draft || release.prerelease) return null;

  const latest = (release.tag_name ?? '').replace(/^v/i, '');
  if (!latest) return null;
  if (compareVersions(latest, currentVersion()) <= 0) return null;

  const asset = pickAssetForDevice(release.assets ?? []);
  if (!asset) {
    throw new UpdateError('No build available for this device architecture.');
  }

  return {
    version: latest,
    tag: release.tag_name ?? `v${latest}`,
    notes: release.body ?? '',
    publishedAt: release.published_at ?? '',
    assetName: asset.name,
    assetUrl: asset.browser_download_url,
    sizeBytes: asset.size,
  };
}

export interface DownloadProgress {
  bytesWritten: number;
  totalBytes: number;
}

/** Downloads the APK into the cache directory, reporting progress. */
export async function downloadUpdate(
  info: UpdateInfo,
  onProgress?: (p: DownloadProgress) => void,
): Promise<File> {
  const dir = new Directory(Paths.cache, 'updates');
  try {
    dir.create({ intermediates: true, idempotent: true });
  } catch {
    // Already present.
  }

  const destination = new File(dir, info.assetName);
  // A partial file from an interrupted attempt would install as corrupt.
  try {
    if (destination.exists) destination.delete();
  } catch {
    // Nothing to clean up.
  }

  const task = File.createDownloadTask(info.assetUrl, destination, {
    onProgress: ({ bytesWritten, totalBytes }) =>
      onProgress?.({ bytesWritten, totalBytes: totalBytes || info.sizeBytes }),
  });

  const file = await task.downloadAsync();
  if (!file?.exists) throw new UpdateError('The download did not complete.');
  return file;
}

/**
 * Whether the user has allowed this app to install APKs. Android 8+ gates
 * installs behind a per-app "install unknown apps" grant.
 */
export function canInstallPackages(): boolean {
  // No Expo API surfaces this, so the install attempt itself is the check —
  // Android shows its own prompt when the grant is missing.
  return updatesSupported();
}

/** Opens the system settings page where the install permission is granted. */
export async function openInstallPermissionSettings(): Promise<void> {
  await IntentLauncher.startActivityAsync(
    IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES,
    { data: `package:${Application.applicationId}` },
  );
}

/**
 * Hands the downloaded APK to the system installer.
 *
 * The installer runs in another process, so the file is passed as a
 * `content://` URI from the app's FileProvider with read permission granted —
 * a raw `file://` path throws FileUriExposedException on Android 7+.
 */
export async function installUpdate(file: File): Promise<void> {
  const uri = file.contentUri;
  if (!uri) throw new UpdateError('Could not resolve the downloaded file.');

  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: uri,
    type: APK_MIME,
    flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
  });
}

/** Removes any cached APKs; called after a successful hand-off. */
export function clearDownloads(): void {
  try {
    const dir = new Directory(Paths.cache, 'updates');
    if (dir.exists) dir.delete();
  } catch {
    // Cache cleanup is best-effort.
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
