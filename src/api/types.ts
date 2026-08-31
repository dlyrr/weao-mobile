/**
 * Response shapes for the public WEAO API (docs.weao.xyz).
 * Field names mirror the API exactly, including its casing quirks.
 */

/** `extype` encodes platform + kind in one string, e.g. "wexecutor". */
export type ExploitType = 'wexecutor' | 'wexternal' | 'aexecutor' | 'aexternal' | 'iexecutor' | 'iexternal' | 'mexecutor' | 'mexternal';

export type Platform = 'Windows' | 'Mac' | 'Android' | 'iOS';

export interface ExploitSlug {
  /** Markdown-ish blurb: `*` bullets, `!` warning lines, [text](url) links. */
  fullDescription?: string;
  logo?: string;
  owner?: string;
  screenshots?: string[];
}

export interface Exploit {
  _id: string;
  title: string;
  version: string;
  /** Preformatted by the API, e.g. "08/28/2026 at 5:31 PM UTC". */
  updatedDate: string;
  uncStatus?: boolean;
  free: boolean;
  detected: boolean;
  /** Roblox client version this build targets. */
  rbxversion?: string;
  /** True when the exploit works on the current Roblox version. */
  updateStatus: boolean;
  websitelink?: string;
  discordlink?: string;
  purchaselink?: string;
  beta?: boolean;
  platform: Platform;
  extype: ExploitType;
  /** Position within its section; the site sorts each section by this ascending. */
  index: number;
  cost?: string;
  decompiler?: boolean;
  multiInject?: boolean;
  raknet?: boolean;
  clientmods?: boolean;
  keysystem?: boolean;
  suncPercentage?: number;
  uncPercentage?: number;
  sunc?: { suncScrap?: string; suncKey?: string };
  /** Stable id used by the changelog endpoint. */
  trackerId?: string;
  slug?: ExploitSlug;
  hidden?: boolean;
  unlinked?: boolean;
  hasIssues?: boolean;
  detectionReason?: string;
  unknown?: boolean;
  unknownDetection?: boolean;
  possibleBanwave?: boolean;
  elementCertified?: boolean;
  longestRunning?: boolean;
  private?: boolean;
  recommendedReason?: { features?: string[] };
}

export interface VersionResponse {
  version: string;
  clientVersionUpload?: string;
  bootstrapperVersion?: string;
  timestamp?: number;
  type?: string;
}

/** `/api/versions/current` carries all four platforms; future/past carry only desktop. */
export interface RobloxVersions {
  Windows?: string;
  WindowsDate?: string;
  WindowsResponse?: VersionResponse;
  Mac?: string;
  MacDate?: string;
  MacResponse?: VersionResponse;
  Android?: string;
  AndroidDate?: string;
  AndroidResponse?: VersionResponse;
  iOS?: string;
  iOSDate?: string;
  iOSResponse?: VersionResponse;
}

export interface ChangelogEntry {
  version?: string;
  date?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ChangelogResponse {
  trackerId?: string;
  name?: string;
  displayName?: string;
  changelogs?: ChangelogEntry[];
  count?: number;
}

/** The API's 429 body. */
export interface RateLimitInfo {
  remainingTime?: number;
  requestsRemaining?: number;
  resetTime?: number;
}

export const VERSION_PLATFORMS = ['Windows', 'Mac', 'Android', 'iOS'] as const;
export type VersionPlatform = (typeof VERSION_PLATFORMS)[number];
