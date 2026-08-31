import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { exploitKey } from '../api/grouping';
import { fetchSnapshot } from '../api/transport';
import { VERSION_PLATFORMS, type VersionPlatform } from '../api/types';
import { readSettings } from '../state/settings';

export const UPDATE_CHECK_TASK = 'weao-update-check';

/**
 * The shortest interval either OS will honour. iOS treats it as a hint and
 * wakes the app opportunistically; Android is usually closer to on time.
 */
const MINIMUM_INTERVAL_MINUTES = 15;

const SEEN_KEY = 'weao.seen.v1';

const ANDROID_CHANNEL_ID = 'weao-updates';

/** Last values we notified about, so an unchanged poll stays silent. */
interface SeenState {
  /** exploitKey -> version string last seen. */
  exploitVersions: Record<string, string>;
  /** exploitKey -> updateStatus last seen. */
  exploitUpdateStatus: Record<string, boolean>;
  /** platform -> Roblox version string last seen. */
  robloxVersions: Partial<Record<VersionPlatform, string>>;
}

const EMPTY_SEEN: SeenState = {
  exploitVersions: {},
  exploitUpdateStatus: {},
  robloxVersions: {},
};

async function readSeen(): Promise<SeenState> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    if (!raw) return EMPTY_SEEN;
    return { ...EMPTY_SEEN, ...(JSON.parse(raw) as Partial<SeenState>) };
  } catch {
    return EMPTY_SEEN;
  }
}

async function writeSeen(state: SeenState): Promise<void> {
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(state)).catch(() => {});
}

async function notify(title: string, body: string, data?: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger: null, // deliver now
  });
}

/**
 * Polls WEAO and raises a local notification for anything the user is watching
 * that changed since the last run.
 *
 * Returns the number of notifications sent, which the background task uses to
 * report whether it did useful work.
 */
export async function runUpdateCheck(): Promise<number> {
  const settings = await readSettings();
  if (!settings.notificationsEnabled) return 0;

  const watchesExploits = settings.watchedExploits.length > 0;
  const watchesRoblox = VERSION_PLATFORMS.some((p) => settings.robloxUpdates[p]);
  if (!watchesExploits && !watchesRoblox) return 0;

  const snapshot = await fetchSnapshot();
  const seen = await readSeen();
  const next: SeenState = {
    exploitVersions: { ...seen.exploitVersions },
    exploitUpdateStatus: { ...seen.exploitUpdateStatus },
    robloxVersions: { ...seen.robloxVersions },
  };
  let sent = 0;

  // --- Watched exploits -----------------------------------------------------
  for (const exploit of snapshot.exploits) {
    const key = exploitKey(exploit);
    if (!settings.watchedExploits.includes(key)) continue;

    const previousVersion = seen.exploitVersions[key];
    const previousStatus = seen.exploitUpdateStatus[key];

    next.exploitVersions[key] = exploit.version;
    next.exploitUpdateStatus[key] = exploit.updateStatus;

    // First sighting only records a baseline — notifying here would fire a
    // burst the moment someone enables notifications.
    if (previousVersion === undefined) continue;

    if (previousVersion !== exploit.version) {
      await notify(
        `${exploit.title} updated`,
        `Now on ${exploit.version} (${exploit.platform}).`,
        { type: 'exploit', key },
      );
      sent++;
    } else if (previousStatus === false && exploit.updateStatus === true) {
      await notify(
        `${exploit.title} is back up`,
        `Working again on the current Roblox version.`,
        { type: 'exploit', key },
      );
      sent++;
    }
  }

  // --- Roblox client versions ----------------------------------------------
  for (const platform of VERSION_PLATFORMS) {
    if (!settings.robloxUpdates[platform]) continue;

    const current = snapshot.versions[platform];
    if (!current) continue;

    const previous = seen.robloxVersions[platform];
    next.robloxVersions[platform] = current;

    if (previous === undefined) continue;
    if (previous === current) continue;

    const detail = snapshot.versions[`${platform}Response` as keyof typeof snapshot.versions];
    const humanVersion =
      detail && typeof detail === 'object' && 'version' in detail
        ? String((detail as { version?: string }).version ?? current)
        : current;

    await notify(`Roblox ${platform} updated`, `New version: ${humanVersion}`, {
      type: 'roblox',
      platform,
    });
    sent++;
  }

  await writeSeen(next);
  return sent;
}

// TaskManager requires the task to be defined at module scope, before any
// registration call, so it survives the app being relaunched in the background.
TaskManager.defineTask(UPDATE_CHECK_TASK, async () => {
  try {
    const sent = await runUpdateCheck();
    return sent > 0
      ? BackgroundTask.BackgroundTaskResult.Success
      : BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Foreground behaviour: show the banner even while the app is open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Exploit & Roblox updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3bea57',
  });
}

/** Prompts if needed. Returns whether we may post notifications. */
export async function requestPermissions(): Promise<boolean> {
  await ensureAndroidChannel();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function isBackgroundTaskRegistered(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(UPDATE_CHECK_TASK);
}

export async function registerBackgroundTask(): Promise<void> {
  if (await isBackgroundTaskRegistered()) return;
  await BackgroundTask.registerTaskAsync(UPDATE_CHECK_TASK, {
    minimumInterval: MINIMUM_INTERVAL_MINUTES,
  });
}

export async function unregisterBackgroundTask(): Promise<void> {
  if (!(await isBackgroundTaskRegistered())) return;
  await BackgroundTask.unregisterTaskAsync(UPDATE_CHECK_TASK);
}

/**
 * Records current values without notifying, so enabling a watch mid-session
 * doesn't immediately fire for something that changed before the user cared.
 */
export async function primeBaseline(): Promise<void> {
  try {
    const snapshot = await fetchSnapshot();
    const seen = await readSeen();
    const next: SeenState = {
      exploitVersions: { ...seen.exploitVersions },
      exploitUpdateStatus: { ...seen.exploitUpdateStatus },
      robloxVersions: { ...seen.robloxVersions },
    };
    for (const exploit of snapshot.exploits) {
      const key = exploitKey(exploit);
      if (next.exploitVersions[key] === undefined) {
        next.exploitVersions[key] = exploit.version;
        next.exploitUpdateStatus[key] = exploit.updateStatus;
      }
    }
    for (const platform of VERSION_PLATFORMS) {
      const current = snapshot.versions[platform];
      if (current && next.robloxVersions[platform] === undefined) {
        next.robloxVersions[platform] = current;
      }
    }
    await writeSeen(next);
  } catch {
    // A failed baseline just means the first real poll sets it instead.
  }
}

/** Sends a notification immediately so the user can confirm the setup works. */
export async function sendTestNotification(): Promise<void> {
  await ensureAndroidChannel();
  await notify('Notifications are on', 'This is what an update alert looks like.');
}
