/**
 * Theme tokens lifted verbatim from weao.xyz's compiled stylesheets
 * (_next/static/css/*.css -> [data-theme=<id>] blocks).
 *
 * Web CSS uses 8-digit hex for alpha (#ffffff1a). React Native understands the
 * same notation, so values are kept byte-identical to the site wherever possible.
 */

export type ThemeId =
  | 'dark'
  | 'light'
  | 'revision'
  | 'voxlis'
  | 'pulsery'
  | 'amoled'
  | 'kyoto'
  | 'sirmeme'
  | 'olemad'
  | 'ball20';

export interface ThemeTokens {
  background: string;
  backgroundAlt: string;
  backgroundSecondary: string;
  foreground: string;
  foregroundAlt: string;
  foregroundMuted: string;
  foregroundSubtle: string;
  borderPrimary: string;
  borderSecondary: string;
  topbarBg: string;
  topbarBorder: string;
  interactivePrimary: string;
  interactivePrimaryHover: string;
  interactiveSecondary: string;
  interactiveSecondaryHover: string;
  interactiveSelected: string;
  interactiveSelectedBorder: string;
  weaoGreen: string;
  weaoRed: string;
  gradient1: string;
  gradient2: string;
  badgeBlueBg: string;
  badgeBlueText: string;
  badgeGreenBg: string;
  badgeGreenText: string;
  badgePurpleBg: string;
  badgePurpleText: string;
  badgePurpleBgAlt: string;
  badgeGrayBg: string;
  badgeGrayText: string;
  suncSColor: string;
  warningYellowBg: string;
  warningYellowBorder: string;
  warningBlueBg: string;
  warningBlueBorder: string;
  warningPurpleBg: string;
  warningPurpleBorder: string;
  modalBg: string;
  modalBorder: string;
  modalOverlay: string;
  statusUpdatedStart: string;
  statusUpdatedEnd: string;
  statusOutdatedStart: string;
  statusOutdatedEnd: string;
  suncGreen: string;
  suncRed: string;
  suncBlue: string;
  suncPurple: string;
}

export interface ThemeMeta {
  id: ThemeId;
  /** Display name exactly as the site's theme picker labels it. */
  name: string;
  /** Four swatch colours the site shows in its picker. */
  swatch: [string, string, string, string];
  /** Falling-image effect, matching the site's ItemRain config. */
  rain?: { image: 'redHeart' | 'sirmeme'; clickBurst: boolean };
  /** ball20 tiles one image across every surface in the app. */
  ballMode?: boolean;
  /** Drives status-bar style and any native chrome. */
  scheme: 'light' | 'dark';
  /** Hidden on the site's picker; reachable here from Settings -> Show hidden themes. */
  hidden?: boolean;
}

/** Shared across every theme on the site (defined on :root, never overridden). */
const STATUS = {
  statusUpdatedStart: '#22c55e',
  statusUpdatedEnd: '#16a34a',
  statusOutdatedStart: '#ef4444',
  statusOutdatedEnd: '#dc2626',
} as const;

const SUNC = {
  suncGreen: '#3bea57',
  suncRed: '#ec3b47',
  suncBlue: '#61afef',
  suncPurple: '#ad97db',
} as const;

const BADGES = {
  badgeBlueBg: '#2563eb',
  badgeBlueText: '#fff',
  badgeGreenBg: '#16a34a',
  badgeGreenText: '#fff',
  badgePurpleBg: '#7c3aed',
  badgePurpleText: '#fff',
  badgePurpleBgAlt: '#7c3aed26',
  badgeGrayBg: '#6b7280',
  badgeGrayText: '#fff',
  suncSColor: '#ad97db',
} as const;

/** Every dark-ish theme reuses these translucent-white interaction layers. */
const DARK_INTERACTIVE = {
  borderPrimary: '#ffffff1a',
  borderSecondary: '#ffffff0d',
  topbarBorder: '#ffffff26',
  interactivePrimary: '#ffffff0d',
  interactivePrimaryHover: '#ffffff14',
  interactiveSecondary: '#ffffff1a',
  interactiveSecondaryHover: '#ffffff26',
} as const;

const DARK_FOREGROUND = {
  foreground: '#fff',
  foregroundAlt: '#ffffffcc',
  foregroundMuted: '#ffffff99',
  foregroundSubtle: '#ffffff66',
} as const;

const DARK_WARNINGS = {
  warningYellowBg: '#f59e0b1a',
  warningYellowBorder: '#f59e0b',
  warningBlueBg: '#3b82f61a',
  warningBlueBorder: '#3b82f6',
  warningPurpleBg: '#7c3aed26',
  warningPurpleBorder: '#a78bfa',
} as const;

/** The site renders its background gradients at --gradient-opacity: .5 */
const g = (r: number, gr: number, b: number) => `rgba(${r},${gr},${b},0.5)`;

export const THEMES: Record<ThemeId, ThemeTokens> = {
  dark: {
    background: '#1a1a1a',
    backgroundAlt: '#000',
    backgroundSecondary: '#2124257c',
    ...DARK_FOREGROUND,
    ...DARK_INTERACTIVE,
    topbarBg: '#191a1a66',
    interactiveSelected: '#3bea5726',
    interactiveSelectedBorder: '#3bea57',
    weaoGreen: '#3bea57',
    weaoRed: '#ec3b47',
    gradient1: g(59, 234, 87),
    gradient2: g(236, 59, 71),
    ...BADGES,
    ...DARK_WARNINGS,
    modalBg: '#1a1a1a',
    modalBorder: '#ffffff26',
    modalOverlay: '#000000bf',
    ...STATUS,
    ...SUNC,
  },

  light: {
    background: '#f5f5f5',
    backgroundAlt: '#fff',
    backgroundSecondary: '#0000000d',
    foreground: '#121212',
    foregroundAlt: '#000000cc',
    foregroundMuted: '#00000099',
    foregroundSubtle: '#00000066',
    borderPrimary: '#0000001a',
    borderSecondary: '#0000000d',
    topbarBg: '#ffffff50',
    topbarBorder: '#00000014',
    interactivePrimary: '#0000000d',
    interactivePrimaryHover: '#00000014',
    interactiveSecondary: '#00000014',
    interactiveSecondaryHover: '#0000001f',
    interactiveSelected: '#3bea5726',
    interactiveSelectedBorder: '#3bea57',
    weaoGreen: '#3bea57',
    weaoRed: '#ec3b47',
    gradient1: g(59, 234, 87),
    gradient2: g(236, 59, 71),
    ...BADGES,
    warningYellowBg: '#f59e0b26',
    warningYellowBorder: '#d97706',
    warningBlueBg: '#3b82f626',
    warningBlueBorder: '#2563eb',
    warningPurpleBg: '#7c3aed26',
    warningPurpleBorder: '#7c3aed',
    modalBg: '#fff',
    modalBorder: '#0000001a',
    modalOverlay: '#00000080',
    ...STATUS,
    ...SUNC,
  },

  revision: {
    background: '#0f0f14',
    backgroundAlt: '#070304',
    backgroundSecondary: '#0b0c0c7c',
    ...DARK_FOREGROUND,
    ...DARK_INTERACTIVE,
    topbarBg: '#0f0f1466',
    interactiveSelected: '#e06c7526',
    interactiveSelectedBorder: '#e06c75',
    weaoGreen: '#e06c75',
    weaoRed: '#e0e0e0',
    gradient1: g(224, 108, 117),
    gradient2: g(224, 224, 224),
    ...BADGES,
    ...DARK_WARNINGS,
    modalBg: '#0f0f14',
    modalBorder: '#ffffff26',
    modalOverlay: '#000000bf',
    ...STATUS,
    ...SUNC,
  },

  voxlis: {
    background: '#000',
    backgroundAlt: '#000',
    backgroundSecondary: '#0707077c',
    ...DARK_FOREGROUND,
    ...DARK_INTERACTIVE,
    topbarBg: '#0000002d',
    interactiveSelected: '#dc262626',
    interactiveSelectedBorder: '#dc2626',
    weaoGreen: '#dc2626',
    weaoRed: '#dc2626',
    gradient1: g(220, 38, 38),
    gradient2: g(0, 0, 0),
    ...BADGES,
    ...DARK_WARNINGS,
    modalBg: '#000',
    modalBorder: '#ffffff26',
    modalOverlay: '#000000bf',
    ...STATUS,
    ...SUNC,
  },

  pulsery: {
    background: '#0a0a0f',
    backgroundAlt: '#0a0a0f',
    backgroundSecondary: '#0a0a0fe6',
    ...DARK_FOREGROUND,
    ...DARK_INTERACTIVE,
    topbarBg: '#0a0a0f66',
    interactiveSelected: '#6366f126',
    interactiveSelectedBorder: '#6366f1',
    weaoGreen: '#6366f1',
    weaoRed: '#8b5cf6',
    gradient1: g(99, 102, 241),
    gradient2: g(139, 92, 246),
    ...BADGES,
    ...DARK_WARNINGS,
    modalBg: '#161625',
    modalBorder: '#ffffff26',
    modalOverlay: '#000000bf',
    ...STATUS,
    ...SUNC,
  },

  amoled: {
    background: '#000',
    backgroundAlt: '#000',
    backgroundSecondary: '#0a0a0a',
    ...DARK_FOREGROUND,
    ...DARK_INTERACTIVE,
    topbarBg: '#00000099',
    interactiveSelected: '#3bea5726',
    interactiveSelectedBorder: '#3bea57',
    weaoGreen: '#3bea57',
    weaoRed: '#ec3b47',
    gradient1: g(59, 234, 87),
    gradient2: g(236, 59, 71),
    ...BADGES,
    ...DARK_WARNINGS,
    modalBg: '#000',
    modalBorder: '#ffffff26',
    modalOverlay: '#000000d9',
    ...STATUS,
    ...SUNC,
  },

  kyoto: {
    background: '#171821',
    backgroundAlt: '#1a1b26',
    backgroundSecondary: '#1a1b26',
    ...DARK_FOREGROUND,
    ...DARK_INTERACTIVE,
    topbarBg: '#171821aa',
    interactiveSelected: '#8b5cf626',
    interactiveSelectedBorder: '#8b5cf6',
    weaoGreen: '#8b5cf6',
    weaoRed: '#ec4899',
    gradient1: g(139, 92, 246),
    gradient2: g(236, 72, 153),
    ...BADGES,
    ...DARK_WARNINGS,
    modalBg: '#1a1b26',
    modalBorder: '#ffffff26',
    modalOverlay: '#000000bf',
    ...STATUS,
    ...SUNC,
  },

  sirmeme: {
    background: '#1a1a1a',
    backgroundAlt: '#000',
    backgroundSecondary: '#2124257c',
    ...DARK_FOREGROUND,
    ...DARK_INTERACTIVE,
    topbarBg: '#191a1a66',
    interactiveSelected: '#ff00d826',
    interactiveSelectedBorder: '#ff00d8',
    weaoGreen: '#ff00d8',
    weaoRed: '#35ff03',
    gradient1: g(255, 0, 216),
    gradient2: g(53, 255, 3),
    ...BADGES,
    ...DARK_WARNINGS,
    modalBg: '#1a1a1a',
    modalBorder: '#ffffff26',
    modalOverlay: '#000000bf',
    ...STATUS,
    ...SUNC,
  },

  olemad: {
    background: '#161616',
    backgroundAlt: '#000',
    backgroundSecondary: '#161616cc',
    ...DARK_FOREGROUND,
    ...DARK_INTERACTIVE,
    topbarBg: '#16161666',
    interactiveSelected: '#8a8a8a26',
    interactiveSelectedBorder: '#8a8a8a',
    weaoGreen: '#7a7a7a',
    weaoRed: '#6a6a6a',
    gradient1: g(122, 122, 122),
    gradient2: g(106, 106, 106),
    ...BADGES,
    ...DARK_WARNINGS,
    modalBg: '#161616',
    modalBorder: '#ffffff26',
    modalOverlay: '#000000bf',
    ...STATUS,
    ...SUNC,
  },

  ball20: {
    // The artwork carries the look; these greys sit under it so text stays
    // readable on top of the cards and chrome.
    background: '#aaaaaa',
    backgroundAlt: '#cccccc',
    backgroundSecondary: '#88888899',
    foreground: '#fff',
    foregroundAlt: '#ffffffee',
    foregroundMuted: '#ffffffcc',
    foregroundSubtle: '#ffffff99',
    borderPrimary: '#ffffff40',
    borderSecondary: '#ffffff26',
    topbarBg: '#00000040',
    topbarBorder: '#ffffff40',
    interactivePrimary: '#00000026',
    interactivePrimaryHover: '#00000040',
    interactiveSecondary: '#00000033',
    interactiveSecondaryHover: '#0000004d',
    interactiveSelected: '#00000059',
    interactiveSelectedBorder: '#ffffff',
    weaoGreen: '#888888',
    weaoRed: '#666666',
    gradient1: g(136, 136, 136),
    gradient2: g(102, 102, 102),
    ...BADGES,
    ...DARK_WARNINGS,
    modalBg: '#aaaaaa',
    modalBorder: '#ffffff40',
    modalOverlay: '#000000bf',
    ...STATUS,
    ...SUNC,
  },
};

/**
 * Picker entries in the site's own order. `olemad` exists in the site's
 * stylesheet and theme class list but is absent from its visible picker, so it
 * is flagged hidden here and revealed behind a Settings toggle.
 */
export const THEME_LIST: ThemeMeta[] = [
  { id: 'dark', name: 'Dark', swatch: ['#000000', '#1a1a1a', '#3bea57', '#ec3b47'], scheme: 'dark' },
  { id: 'light', name: 'Light', swatch: ['#ffffff', '#f5f5f5', '#3bea57', '#ec3b47'], scheme: 'light' },
  { id: 'revision', name: 'Revision', swatch: ['#070304', '#0f0f14', '#e06c75', '#e0e0e0'], scheme: 'dark' },
  {
    id: 'voxlis',
    name: 'voxlis.NET',
    swatch: ['#000000', '#000000', '#dc2626', '#ef4444'],
    scheme: 'dark',
    rain: { image: 'redHeart', clickBurst: true },
  },
  { id: 'pulsery', name: 'Pulsery', swatch: ['#0a0a0f', '#161625', '#6366f1', '#8b5cf6'], scheme: 'dark' },
  { id: 'amoled', name: 'Amoled', swatch: ['#000000', '#000000', '#3bea57', '#ec3b47'], scheme: 'dark' },
  { id: 'kyoto', name: 'Kyoto', swatch: ['#171821', '#1a1b26', '#8b5cf6', '#ec4899'], scheme: 'dark' },
  {
    id: 'sirmeme',
    name: 'Sirmeme',
    swatch: ['#000000', '#1a1a1a', '#ff00d8', '#35ff03'],
    scheme: 'dark',
    rain: { image: 'sirmeme', clickBurst: false },
  },
  {
    id: 'ball20',
    name: 'Ball 2.0',
    swatch: ['#cccccc', '#aaaaaa', '#888888', '#666666'],
    scheme: 'light',
    ballMode: true,
  },
  { id: 'olemad', name: 'Olemad', swatch: ['#000000', '#161616', '#7a7a7a', '#6a6a6a'], scheme: 'dark', hidden: true },
];

export const THEME_META: Record<ThemeId, ThemeMeta> = Object.fromEntries(
  THEME_LIST.map((t) => [t.id, t]),
) as Record<ThemeId, ThemeMeta>;

export const DEFAULT_THEME: ThemeId = 'dark';
