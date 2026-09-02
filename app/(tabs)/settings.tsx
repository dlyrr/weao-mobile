import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exploitKey } from '../../src/api/grouping';
import { VERSION_PLATFORMS, type VersionPlatform } from '../../src/api/types';
import { TAB_BAR_BASE_HEIGHT } from './_layout';
import { useIsLiquidGlass } from '../../src/components/Glass';
import { Surface } from '../../src/components/Surface';
import { UpdateCard } from '../../src/components/UpdateCard';
import { SectionHeader } from '../../src/components/ui';
import {
  isBackgroundTaskRegistered,
  primeBaseline,
  registerBackgroundTask,
  requestPermissions,
  sendTestNotification,
  unregisterBackgroundTask,
} from '../../src/notifications';
import { useWeaoData } from '../../src/state/data';
import { useSettings, type Settings } from '../../src/state/settings';
import { useTheme } from '../../src/theme/ThemeProvider';
import { THEME_LIST, type ThemeId } from '../../src/theme/tokens';
import { font } from '../../src/theme/typography';

const PLATFORM_ICON: Record<VersionPlatform, keyof typeof Ionicons.glyphMap> = {
  Windows: 'desktop-outline',
  Mac: 'laptop-outline',
  Android: 'logo-android',
  iOS: 'logo-apple',
};

export default function SettingsScreen() {
  const { c, id: activeTheme, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update, setRobloxUpdate, toggleWatched } = useSettings();
  const { exploits } = useWeaoData();

  const [taskRegistered, setTaskRegistered] = useState(false);
  const isLiquid = useIsLiquidGlass();

  useEffect(() => {
    isBackgroundTaskRegistered().then(setTaskRegistered).catch(() => {});
  }, [settings.notificationsEnabled]);

  const themes = THEME_LIST.filter((t) => !t.hidden || settings.showHiddenThemes);

  const onMasterToggle = async (next: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    if (next) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications blocked',
          'Enable notifications for WEAO in your system settings, then try again.',
        );
        return;
      }
      await primeBaseline();
      await registerBackgroundTask().catch(() => {});
    } else {
      await unregisterBackgroundTask().catch(() => {});
    }
    update({ notificationsEnabled: next });
    setTaskRegistered(await isBackgroundTaskRegistered().catch(() => false));
  };

  const watched = exploits.filter((e) => settings.watchedExploits.includes(exploitKey(e)));

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 + (settings.glassSurfaces ? TAB_BAR_BASE_HEIGHT : 0) }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ------------------------------- Themes ------------------------------ */}
      <SectionHeader title="Theme" />
      <View style={styles.themeGrid}>
        {themes.map((theme) => {
          const active = theme.id === activeTheme;
          return (
            <Pressable
              key={theme.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setTheme(theme.id as ThemeId);
              }}
              style={[
                styles.themeCard,
                {
                  backgroundColor: active ? c.interactiveSelected : c.backgroundSecondary,
                  borderColor: active ? c.interactiveSelectedBorder : c.borderPrimary,
                },
              ]}
            >
              <View style={styles.swatchRow}>
                {theme.swatch.map((color, i) => (
                  <View
                    key={i}
                    style={[styles.swatch, { backgroundColor: color, borderColor: c.borderPrimary }]}
                  />
                ))}
              </View>
              <View style={styles.themeNameRow}>
                <Text style={[styles.themeName, { color: c.foreground }]} numberOfLines={1}>
                  {theme.name}
                </Text>
                {active && (
                  <Ionicons name="checkmark-circle" size={15} color={c.interactiveSelectedBorder} />
                )}
              </View>
              {/* Flags the two themes that carry an animated effect. */}
              {theme.rain && (
                <Text style={[styles.themeNote, { color: c.foregroundSubtle }]}>
                  {theme.rain.image === 'redHeart' ? 'Raining hearts' : 'Raining Sirmeme'}
                  {theme.rain.clickBurst ? ' · tap to burst' : ''}
                </Text>
              )}
              {theme.ballMode && (
                <Text style={[styles.themeNote, { color: c.foregroundSubtle }]}>
                  Ball on every surface
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Row
        icon="sparkles-outline"
        title="Show hidden themes"
        subtitle="Reveals Olemad, which ships on the site but isn't in its picker."
        value={settings.showHiddenThemes}
        onChange={(v) => update({ showHiddenThemes: v })}
      />

      <SettingCard>
        <Text style={[styles.rowTitle, { color: c.foreground }]}>Effect quality</Text>
        <Text style={[styles.rowSub, { color: c.foregroundMuted }]}>
          Particle budget for the raining themes. Matches the site's own tiers.
        </Text>
        <View style={styles.segmented}>
          {(['off', 'low', 'medium', 'high'] as const).map((level) => {
            const active = settings.rainQuality === level;
            return (
              <Pressable
                key={level}
                onPress={() => update({ rainQuality: level })}
                style={[
                  styles.segment,
                  {
                    backgroundColor: active ? c.interactiveSelected : c.interactivePrimary,
                    borderColor: active ? c.interactiveSelectedBorder : c.borderPrimary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? c.foreground : c.foregroundMuted },
                  ]}
                >
                  {level[0].toUpperCase() + level.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SettingCard>

      <Row
        icon="list-outline"
        title="Compact list"
        subtitle="Condensed rows instead of full cards."
        value={settings.listView}
        onChange={(v) => update({ listView: v })}
      />

      <Row
        icon="layers-outline"
        title="Glass surfaces"
        subtitle={
          isLiquid
            ? 'Liquid Glass is active on this device.'
            : 'Frosted cards and chrome. Renders as Liquid Glass on iOS 26.'
        }
        value={settings.glassSurfaces}
        onChange={(v) => update({ glassSurfaces: v })}
      />

      {/* --------------------------- Notifications --------------------------- */}
      <SectionHeader title="Notifications" />
      <Row
        icon="notifications-outline"
        title="Enable notifications"
        subtitle="Master switch. Off means nothing is checked in the background."
        value={settings.notificationsEnabled}
        onChange={onMasterToggle}
      />

      {settings.notificationsEnabled && (
        <>
          <SettingCard>
            <Text style={[styles.rowTitle, { color: c.foreground }]}>Roblox client updates</Text>
            <Text style={[styles.rowSub, { color: c.foregroundMuted }]}>
              Alerts when Roblox ships a new version on a platform.
            </Text>
            <View style={styles.platformList}>
              {VERSION_PLATFORMS.map((platform) => (
                <View key={platform} style={styles.platformRow}>
                  <Ionicons name={PLATFORM_ICON[platform]} size={17} color={c.foregroundAlt} />
                  <Text style={[styles.platformName, { color: c.foregroundAlt }]}>{platform}</Text>
                  <Switch
                    value={settings.robloxUpdates[platform]}
                    onValueChange={async (next) => {
                      Haptics.selectionAsync().catch(() => {});
                      if (next) await primeBaseline();
                      setRobloxUpdate(platform, next);
                    }}
                    trackColor={{ false: c.interactiveSecondary, true: c.interactiveSelectedBorder }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          </SettingCard>

          <SettingCard>
            <Text style={[styles.rowTitle, { color: c.foreground }]}>
              Watched exploits ({settings.watchedExploits.length})
            </Text>
            <Text style={[styles.rowSub, { color: c.foregroundMuted }]}>
              Turn these on from an exploit's page. Tap to stop watching.
            </Text>
            {watched.length === 0 ? (
              <Text style={[styles.rowSub, { color: c.foregroundSubtle, marginTop: 4 }]}>
                Not watching anything yet.
              </Text>
            ) : (
              <View style={styles.watchList}>
                {watched.map((exploit) => (
                  <Pressable
                    key={exploitKey(exploit)}
                    onPress={() => toggleWatched(exploitKey(exploit))}
                    style={[
                      styles.watchChip,
                      { backgroundColor: c.interactivePrimary, borderColor: c.borderPrimary },
                    ]}
                  >
                    <Text style={[styles.watchChipText, { color: c.foregroundAlt }]}>
                      {exploit.title} · {exploit.platform}
                    </Text>
                    <Ionicons name="close" size={13} color={c.foregroundMuted} />
                  </Pressable>
                ))}
              </View>
            )}
          </SettingCard>

          <SettingCard>
            <View style={styles.statusLine}>
              <Ionicons
                name={taskRegistered ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={taskRegistered ? c.badgeGreenBg : c.warningYellowBorder}
              />
              <Text style={[styles.rowSub, { color: c.foregroundMuted, flex: 1 }]}>
                {taskRegistered
                  ? 'Background checks are registered. The OS decides exactly when they run — expect roughly every 15–30 minutes, and less often on low battery.'
                  : 'Background checks are not registered yet.'}
              </Text>
            </View>
            <Pressable
              onPress={() => sendTestNotification()}
              style={[
                styles.button,
                { backgroundColor: c.interactivePrimary, borderColor: c.borderPrimary },
              ]}
            >
              <Ionicons name="paper-plane-outline" size={15} color={c.foreground} />
              <Text style={[styles.buttonText, { color: c.foreground }]}>
                Send a test notification
              </Text>
            </Pressable>
          </SettingCard>
        </>
      )}

      {/* ------------------------------- Updates ----------------------------- */}
      <SectionHeader title="Updates" />
      <UpdateCard />

      {/* ------------------------------- About ------------------------------- */}
      <SectionHeader title="About" />
      <SettingCard>
        <Text style={[styles.rowSub, { color: c.foregroundMuted }]}>
          An unofficial mobile client for WhatExpsAre.Online, built on its public API. All exploit
          data, logos and descriptions belong to WEAO / Vienna Softworks.
        </Text>
        <View style={styles.linkRow}>
          <LinkChip label="weao.xyz" onPress={() => WebBrowser.openBrowserAsync('https://weao.xyz')} />
          <LinkChip
            label="API Docs"
            onPress={() => WebBrowser.openBrowserAsync('https://docs.weao.xyz')}
          />
        </View>
        <Text style={[styles.version, { color: c.foregroundSubtle }]}>
          Version {Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </SettingCard>
    </ScrollView>
  );
}

function SettingCard({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Surface
      style={[styles.card, { backgroundColor: c.backgroundSecondary, borderColor: c.borderPrimary }]}
    >
      {children}
    </Surface>
  );
}

function Row({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const { c } = useTheme();
  return (
    <Surface
      style={[
        styles.card,
        styles.rowCard,
        { backgroundColor: c.backgroundSecondary, borderColor: c.borderPrimary },
      ]}
    >
      <Ionicons name={icon} size={19} color={c.foreground} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: c.foreground }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: c.foregroundMuted }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: c.interactiveSecondary, true: c.interactiveSelectedBorder }}
        thumbColor="#fff"
      />
    </Surface>
  );
}

function LinkChip({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.linkChip, { backgroundColor: c.interactivePrimary, borderColor: c.borderPrimary }]}
    >
      <Text style={[styles.linkChipText, { color: c.foregroundAlt }]}>{label}</Text>
      <Ionicons name="open-outline" size={13} color={c.foregroundMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16 },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  themeCard: {
    overflow: 'hidden',
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: 13,
    borderWidth: 1,
    padding: 11,
    gap: 8,
  },
  swatchRow: { flexDirection: 'row', gap: 4 },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
  },
  themeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  themeName: { fontFamily: font.medium, fontSize: 13.5, flexShrink: 1 },
  themeNote: { fontFamily: font.regular, fontSize: 10.5 },
  card: {
    borderRadius: 13,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
    gap: 7,
  },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.medium, fontSize: 14 },
  rowSub: { fontFamily: font.regular, fontSize: 12, lineHeight: 17 },
  segmented: { flexDirection: 'row', gap: 7, marginTop: 4 },
  segment: {
    overflow: 'hidden',
    flex: 1,
    borderRadius: 9,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentText: { fontFamily: font.medium, fontSize: 12 },
  platformList: { gap: 2, marginTop: 4 },
  platformRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  platformName: { fontFamily: font.regular, fontSize: 13.5, flex: 1 },
  watchList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 5 },
  watchChip: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  watchChipText: { fontFamily: font.regular, fontSize: 12 },
  statusLine: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  button: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 11,
    marginTop: 4,
  },
  buttonText: { fontFamily: font.medium, fontSize: 13 },
  linkRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  linkChip: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  linkChipText: { fontFamily: font.medium, fontSize: 12.5 },
  version: { fontFamily: font.regular, fontSize: 11.5, marginTop: 4 },
});
