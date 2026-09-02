import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme/ThemeProvider';
import { font } from '../theme/typography';
import { formatBytes, RELEASES_PAGE } from '../updates';
import { useUpdater } from '../updates/UpdaterProvider';
import { Surface } from './Surface';

/** Settings panel: current version, manual check, download and install. */
export function UpdateCard() {
  const c = useColors();
  const { stage, update, progress, error, supported, version, check, download, install } =
    useUpdater();

  const busy = stage === 'checking' || stage === 'downloading';

  return (
    <Surface
      style={[styles.card, { backgroundColor: c.backgroundSecondary, borderColor: c.borderPrimary }]}
    >
      <View style={styles.headRow}>
        <Ionicons name="cloud-download-outline" size={19} color={c.foreground} />
        <View style={styles.headText}>
          <Text style={[styles.title, { color: c.foreground }]}>App updates</Text>
          <Text style={[styles.sub, { color: c.foregroundMuted }]}>
            {supported
              ? `You have ${version}. Checked automatically every few hours.`
              : `Version ${version}. In-app updates are Android only.`}
          </Text>
        </View>
      </View>

      {supported && stage === 'available' && update && (
        <View style={[styles.notice, { backgroundColor: c.interactiveSelected, borderColor: c.interactiveSelectedBorder }]}>
          <Text style={[styles.noticeTitle, { color: c.foreground }]}>
            {update.version} is available
          </Text>
          <Text style={[styles.sub, { color: c.foregroundMuted }]}>
            {formatBytes(update.sizeBytes)} · {update.assetName.includes('arm64') ? '64-bit' : '32-bit'} build for this device
          </Text>
        </View>
      )}

      {supported && stage === 'downloading' && (
        <View style={styles.progressBlock}>
          <View style={[styles.track, { backgroundColor: c.interactiveSecondary }]}>
            <View
              style={[
                styles.fill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: c.interactiveSelectedBorder },
              ]}
            />
          </View>
          <Text style={[styles.sub, { color: c.foregroundMuted }]}>
            Downloading… {Math.round(progress * 100)}%
          </Text>
        </View>
      )}

      {supported && stage === 'ready' && (
        <Text style={[styles.sub, { color: c.foregroundAlt }]}>
          Downloaded. Android will ask you to confirm the install.
        </Text>
      )}

      {stage === 'uptodate' && (
        <Text style={[styles.sub, { color: c.foregroundMuted }]}>
          You&apos;re on the latest version.
        </Text>
      )}

      {stage === 'error' && error && (
        <View style={[styles.notice, { backgroundColor: c.warningYellowBg, borderColor: c.warningYellowBorder }]}>
          <Text style={[styles.sub, { color: c.foregroundAlt }]}>{error}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {supported && stage === 'available' && (
          <Button label="Download" icon="download-outline" primary onPress={download} />
        )}
        {supported && stage === 'ready' && (
          <Button label="Install" icon="checkmark-circle-outline" primary onPress={install} />
        )}
        {supported && stage !== 'available' && stage !== 'ready' && (
          <Button
            label={busy ? 'Checking…' : 'Check for updates'}
            icon="refresh-outline"
            disabled={busy}
            busy={stage === 'checking'}
            onPress={() => check(true)}
          />
        )}
        <Button
          label="Releases"
          icon="open-outline"
          onPress={() => WebBrowser.openBrowserAsync(RELEASES_PAGE).catch(() => {})}
        />
      </View>
    </Surface>
  );
}

/** Dismissible banner shown above the exploit list when a build is waiting. */
export function UpdateBanner({ onOpenSettings }: { onOpenSettings: () => void }) {
  const c = useColors();
  const { stage, update, skip } = useUpdater();

  if (stage !== 'available' || !update) return null;

  return (
    <Surface
      style={[
        styles.banner,
        { backgroundColor: c.backgroundSecondary, borderColor: c.interactiveSelectedBorder },
      ]}
    >
      <Ionicons name="arrow-up-circle" size={18} color={c.interactiveSelectedBorder} />
      <Pressable style={styles.bannerText} onPress={onOpenSettings}>
        <Text style={[styles.bannerTitle, { color: c.foreground }]}>
          Version {update.version} is available
        </Text>
        <Text style={[styles.sub, { color: c.foregroundMuted }]}>
          Tap to update · {formatBytes(update.sizeBytes)}
        </Text>
      </Pressable>
      <Pressable onPress={skip} hitSlop={10} accessibilityLabel="Dismiss this update">
        <Ionicons name="close" size={17} color={c.foregroundMuted} />
      </Pressable>
    </Surface>
  );
}

function Button({
  label,
  icon,
  onPress,
  primary,
  disabled,
  busy,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? c.interactiveSelectedBorder : c.interactivePrimary,
          borderColor: primary ? c.interactiveSelectedBorder : c.borderPrimary,
          opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={primary ? '#0b0b0b' : c.foreground} />
      ) : (
        <Ionicons name={icon} size={15} color={primary ? '#0b0b0b' : c.foreground} />
      )}
      <Text style={[styles.buttonText, { color: primary ? '#0b0b0b' : c.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 13, borderWidth: 1, padding: 13, marginBottom: 10, gap: 10 },
  headRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  headText: { flex: 1, gap: 2 },
  title: { fontFamily: font.medium, fontSize: 14 },
  sub: { fontFamily: font.regular, fontSize: 12, lineHeight: 17 },
  notice: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 3 },
  noticeTitle: { fontFamily: font.semibold, fontSize: 13 },
  progressBlock: { gap: 6 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    flexGrow: 1,
    flexBasis: 120,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 11,
  },
  buttonText: { fontFamily: font.medium, fontSize: 13 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  bannerText: { flex: 1, gap: 1 },
  bannerTitle: { fontFamily: font.semibold, fontSize: 13 },
});
