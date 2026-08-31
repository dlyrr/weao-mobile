import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useColors } from '../theme/ThemeProvider';
import { font } from '../theme/typography';

/** The site's pill badges: solid fill, white text, tight radius. */
export function Badge({
  label,
  bg,
  color,
  style,
}: {
  label: string;
  bg: string;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.badgeText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Outlined variant used for neutral metadata (platform, type). */
export function OutlineBadge({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: c.interactivePrimary, borderWidth: 1, borderColor: c.borderPrimary },
        style,
      ]}
    >
      <Text style={[styles.badgeText, { color: c.foregroundAlt }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Updated / Not Updated pill. The site drives this from --status-updated-* and
 * --status-outdated-*, which are theme-independent.
 */
export function StatusPill({ updated, style }: { updated: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const bg = updated ? c.statusUpdatedEnd : c.statusOutdatedEnd;
  return (
    <View style={[styles.statusPill, { backgroundColor: bg }, style]}>
      <View style={styles.statusDot} />
      <Text style={styles.statusText}>{updated ? 'Updated' : 'Not Updated'}</Text>
    </View>
  );
}

/**
 * UNC / sUNC compatibility bar. The site colours the "s" in sUNC purple
 * (--sunc-s-color), which is reproduced in the label here.
 */
export function ScoreBar({
  label,
  value,
  sPrefix,
}: {
  label: string;
  value: number;
  sPrefix?: boolean;
}) {
  const c = useColors();
  // Green at the top end, red at the bottom, matching the site's sUNC palette.
  const tint = value >= 90 ? c.suncGreen : value >= 60 ? '#f59e0b' : c.suncRed;

  return (
    <View style={styles.scoreRow}>
      <Text style={[styles.scoreLabel, { color: c.foregroundMuted }]}>
        {sPrefix ? <Text style={{ color: c.suncSColor }}>s</Text> : null}
        {label}
      </Text>
      <View style={[styles.scoreTrack, { backgroundColor: c.interactiveSecondary }]}>
        <View
          style={[
            styles.scoreFill,
            { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: tint },
          ]}
        />
      </View>
      <Text style={[styles.scoreValue, { color: c.foreground }]}>{value}%</Text>
    </View>
  );
}

/** Section heading + hairline, as used above each exploit group. */
export function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>{title}</Text>
        {right}
      </View>
      <View style={[styles.separator, { backgroundColor: c.borderPrimary }]} />
    </View>
  );
}

/** Coloured callout used for the `!` lines inside exploit descriptions. */
export function Callout({
  children,
  tone = 'yellow',
}: {
  children: React.ReactNode;
  tone?: 'yellow' | 'blue' | 'purple';
}) {
  const c = useColors();
  const map = {
    yellow: { bg: c.warningYellowBg, border: c.warningYellowBorder },
    blue: { bg: c.warningBlueBg, border: c.warningBlueBorder },
    purple: { bg: c.warningPurpleBg, border: c.warningPurpleBorder },
  } as const;
  const { bg, border } = map[tone];

  return (
    <View style={[styles.callout, { backgroundColor: bg, borderLeftColor: border }]}>
      {children}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[styles.divider, { backgroundColor: c.borderSecondary }, style]} />
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.muted, { color: c.foregroundMuted }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: font.medium,
    fontSize: 11,
    letterSpacing: 0.1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffffdd',
  },
  statusText: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: '#fff',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreLabel: {
    fontFamily: font.medium,
    fontSize: 12,
    width: 46,
  },
  scoreTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreValue: {
    fontFamily: font.semibold,
    fontSize: 12,
    width: 38,
    textAlign: 'right',
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontFamily: font.semibold,
    fontSize: 17,
    flexShrink: 1,
  },
  separator: {
    height: 1,
    marginTop: 10,
  },
  callout: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  muted: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
  },
});
