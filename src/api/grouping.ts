import type { Exploit, ExploitType, Platform } from './types';

/**
 * Section layout copied from weao.xyz's own grouping code: it splits on
 * platform + kind, drops empty sections, and sorts each one by `index`
 * ascending. Section order below is the site's push() order.
 */

export type SectionKind = 'executor' | 'external';
export type SectionPlatform = 'windows' | 'mac' | 'android' | 'ios';

export interface ExploitSection {
  id: string;
  title: string;
  platform: SectionPlatform;
  kind: SectionKind;
  exploits: Exploit[];
}

const PLATFORM_BY_PREFIX: Record<string, SectionPlatform> = {
  w: 'windows',
  m: 'mac',
  a: 'android',
  i: 'ios',
};

const PLATFORM_LABEL: Record<SectionPlatform, string> = {
  windows: 'Windows',
  mac: 'Mac',
  android: 'Android',
  ios: 'iOS',
};

/** Splits "wexecutor" into { platform: 'windows', kind: 'executor' }. */
export function parseExtype(
  extype: ExploitType | string | undefined,
): { platform: SectionPlatform; kind: SectionKind } | null {
  if (!extype) return null;
  const platform = PLATFORM_BY_PREFIX[extype[0]];
  const rest = extype.slice(1);
  if (!platform) return null;
  if (rest === 'executor') return { platform, kind: 'executor' };
  if (rest === 'external') return { platform, kind: 'external' };
  return null;
}

/** Executors first (all four platforms), then externals — the site's order. */
const SECTION_ORDER: Array<{ platform: SectionPlatform; kind: SectionKind }> = [
  { platform: 'windows', kind: 'executor' },
  { platform: 'mac', kind: 'executor' },
  { platform: 'android', kind: 'executor' },
  { platform: 'ios', kind: 'executor' },
  { platform: 'windows', kind: 'external' },
  { platform: 'mac', kind: 'external' },
  { platform: 'android', kind: 'external' },
  { platform: 'ios', kind: 'external' },
];

function sectionTitle(platform: SectionPlatform, kind: SectionKind): string {
  return kind === 'executor'
    ? `${PLATFORM_LABEL[platform]} Script Executor Exploits`
    : `${PLATFORM_LABEL[platform]} External Exploits`;
}

export function groupExploits(exploits: Exploit[]): ExploitSection[] {
  const sections: ExploitSection[] = [];

  for (const { platform, kind } of SECTION_ORDER) {
    const matching = exploits.filter((e) => {
      const parsed = parseExtype(e.extype);
      return parsed?.platform === platform && parsed.kind === kind;
    });

    if (matching.length === 0) continue;

    sections.push({
      id: `${platform}-${kind === 'executor' ? 'script' : 'external'}`,
      title: sectionTitle(platform, kind),
      platform,
      kind,
      exploits: matching.sort((a, b) => a.index - b.index),
    });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Filtering and sorting — option ids match the site's filter panel.
// ---------------------------------------------------------------------------

export type PricingFilter = 'free' | 'paid';
export type KeySystemFilter = 'keyless' | 'keysystem';
export type TypeFilter = 'executor' | 'external';
export type DetectionFilter = 'undetected' | 'detected' | 'clientmod' | 'banwave';
export type SortId = 'cost-high' | 'cost-low' | 'sunc-high' | 'sunc-low';

export interface Filters {
  pricing: PricingFilter[];
  platform: SectionPlatform[];
  keysystem: KeySystemFilter[];
  type: TypeFilter[];
  detection: DetectionFilter[];
  status: Array<'updated' | 'notupdated'>;
}

export const EMPTY_FILTERS: Filters = {
  pricing: [],
  platform: [],
  keysystem: [],
  type: [],
  detection: [],
  status: [],
};

export function countActiveFilters(f: Filters): number {
  return (
    f.pricing.length +
    f.platform.length +
    f.keysystem.length +
    f.type.length +
    f.detection.length +
    f.status.length
  );
}

/**
 * Pulls the first number out of strings like "$22.99 Lifetime" so paid
 * exploits can be ordered by price. Free exploits sort as 0.
 */
export function costValue(exploit: Exploit): number {
  if (exploit.free) return 0;
  const match = exploit.cost?.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

export function matchesSearch(exploit: Exploit, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return (
    exploit.title.toLowerCase().includes(q) ||
    (exploit.version ?? '').toLowerCase().includes(q) ||
    (exploit.platform ?? '').toLowerCase().includes(q) ||
    (exploit.slug?.owner ?? '').toLowerCase().includes(q)
  );
}

export function matchesFilters(exploit: Exploit, f: Filters): boolean {
  const parsed = parseExtype(exploit.extype);

  if (f.pricing.length) {
    const wantsFree = f.pricing.includes('free');
    const wantsPaid = f.pricing.includes('paid');
    if (!((wantsFree && exploit.free) || (wantsPaid && !exploit.free))) return false;
  }

  if (f.platform.length && (!parsed || !f.platform.includes(parsed.platform))) return false;

  if (f.type.length && (!parsed || !f.type.includes(parsed.kind))) return false;

  if (f.keysystem.length) {
    const hasKey = exploit.keysystem === true;
    const wantsKeyless = f.keysystem.includes('keyless');
    const wantsKey = f.keysystem.includes('keysystem');
    if (!((wantsKeyless && !hasKey) || (wantsKey && hasKey))) return false;
  }

  if (f.status.length) {
    const wantsUpdated = f.status.includes('updated');
    const wantsOutdated = f.status.includes('notupdated');
    if (!((wantsUpdated && exploit.updateStatus) || (wantsOutdated && !exploit.updateStatus))) {
      return false;
    }
  }

  if (f.detection.length) {
    // Detection options are OR'd together, matching the site's toggle group.
    const hits = f.detection.some((d) => {
      switch (d) {
        case 'detected':
          return exploit.detected === true;
        case 'undetected':
          return exploit.detected !== true;
        case 'clientmod':
          return exploit.clientmods === true;
        case 'banwave':
          return exploit.possibleBanwave === true;
      }
    });
    if (!hits) return false;
  }

  return true;
}

/** Applies search + filters, then optional sort, keeping section structure. */
export function buildSections(
  exploits: Exploit[],
  query: string,
  filters: Filters,
  sort: SortId | null,
  pinned: string[],
): ExploitSection[] {
  // `hidden` exploits are excluded from the site's frontend entirely.
  const visible = exploits.filter(
    (e) => !e.hidden && matchesSearch(e, query) && matchesFilters(e, filters),
  );

  const sections = groupExploits(visible);

  if (sort) {
    for (const section of sections) {
      section.exploits.sort((a, b) => {
        switch (sort) {
          case 'cost-high':
            return costValue(b) - costValue(a);
          case 'cost-low':
            return costValue(a) - costValue(b);
          case 'sunc-high':
            return (b.suncPercentage ?? -1) - (a.suncPercentage ?? -1);
          case 'sunc-low':
            return (a.suncPercentage ?? 101) - (b.suncPercentage ?? 101);
        }
      });
    }
  }

  // Pinned exploits float to the top of whichever section they belong to.
  if (pinned.length) {
    for (const section of sections) {
      section.exploits.sort((a, b) => {
        const ap = pinned.includes(exploitKey(a)) ? 0 : 1;
        const bp = pinned.includes(exploitKey(b)) ? 0 : 1;
        return ap - bp;
      });
    }
  }

  return sections;
}

/**
 * Stable identity for an exploit. Titles repeat across platforms (Delta ships
 * on both Android and iOS), so the key has to include extype.
 */
export function exploitKey(exploit: Exploit): string {
  return `${exploit.title}::${exploit.extype}`;
}
