import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { weao } from '../../src/api/client';
import {
  VERSION_PLATFORMS,
  type RobloxVersions,
  type VersionPlatform,
} from '../../src/api/types';
import { TAB_BAR_BASE_HEIGHT } from './_layout';
import { Surface } from '../../src/components/Surface';
import { SectionHeader } from '../../src/components/ui';
import { primeBaseline, requestPermissions } from '../../src/notifications';
import { useWeaoData } from '../../src/state/data';
import { useSettings } from '../../src/state/settings';
import { useColors } from '../../src/theme/ThemeProvider';
import { font } from '../../src/theme/typography';

const PLATFORM_ICON: Record<VersionPlatform, keyof typeof Ionicons.glyphMap> = {
  Windows: 'desktop-outline',
  Mac: 'laptop-outline',
  Android: 'logo-android',
  iOS: 'logo-apple',
};

export default function VersionsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { versions, refresh, refreshing } = useWeaoData();
  const { settings, setRobloxUpdate, update } = useSettings();

  // future/past aren't part of the shared snapshot — only this screen needs them.
  const [future, setFuture] = useState<RobloxVersions | null>(null);
  const [past, setPast] = useState<RobloxVersions | null>(null);

  const loadExtras = useCallback(() => {
    weao.futureVersions().then(setFuture).catch(() => setFuture(null));
    weao.pastVersions().then(setPast).catch(() => setPast(null));
  }, []);

  useEffect(loadExtras, [loadExtras]);

  const onRefresh = async () => {
    loadExtras();
    await refresh();
  };

  const onToggleNotify = async (platform: VersionPlatform, next: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    if (next) {
      const granted = await requestPermissions();
      if (!granted) return;
      if (!settings.notificationsEnabled) update({ notificationsEnabled: true });
      await primeBaseline();
    }
    setRobloxUpdate(platform, next);
  };

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 + (settings.glassSurfaces ? TAB_BAR_BASE_HEIGHT : 0) }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.interactiveSelectedBorder}
          colors={[c.interactiveSelectedBorder]}
          progressBackgroundColor={c.backgroundSecondary}
        />
      }
    >
      <SectionHeader title="Current Versions" />
      {VERSION_PLATFORMS.map((platform) => (
        <VersionCard
          key={platform}
          platform={platform}
          hash={versions[platform]}
          date={versions[`${platform}Date` as keyof RobloxVersions] as string | undefined}
          humanVersion={
            (versions[`${platform}Response` as keyof RobloxVersions] as { version?: string } | undefined)
              ?.version
          }
          notify={settings.robloxUpdates[platform]}
          onNotifyChange={(next) => onToggleNotify(platform, next)}
        />
      ))}

      {/* The API only ever returns Windows and Mac for future/past. */}
      {future && (future.Windows || future.Mac) && (
        <>
          <SectionHeader title="Future Versions" />
          {(['Windows', 'Mac'] as const).map((platform) =>
            future[platform] ? (
              <VersionCard
                key={`future-${platform}`}
                platform={platform}
                hash={future[platform]}
                date={future[`${platform}Date` as keyof RobloxVersions] as string | undefined}
                humanVersion={
                  (future[`${platform}Response` as keyof RobloxVersions] as { version?: string } | undefined)
                    ?.version
                }
              />
            ) : null,
          )}
        </>
      )}

      {past && (past.Windows || past.Mac) && (
        <>
          <SectionHeader title="Past Versions" />
          {(['Windows', 'Mac'] as const).map((platform) =>
            past[platform] ? (
              <VersionCard
                key={`past-${platform}`}
                platform={platform}
                hash={past[platform]}
                date={past[`${platform}Date` as keyof RobloxVersions] as string | undefined}
                humanVersion={
                  (past[`${platform}Response` as keyof RobloxVersions] as { version?: string } | undefined)
                    ?.version
                }
              />
            ) : null,
          )}
        </>
      )}
    </ScrollView>
  );
}

function VersionCard({
  platform,
  hash,
  date,
  humanVersion,
  notify,
  onNotifyChange,
}: {
  platform: VersionPlatform;
  hash?: string;
  date?: string;
  humanVersion?: string;
  notify?: boolean;
  onNotifyChange?: (next: boolean) => void;
}) {
  const c = useColors();
  const [copied, setCopied] = useState(false);

  if (!hash) return null;

  const copy = async () => {
    await Clipboard.setStringAsync(hash);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Surface
      style={[styles.card, { backgroundColor: c.backgroundSecondary, borderColor: c.borderPrimary }]}
    >
      <View style={styles.cardHead}>
        <Ionicons name={PLATFORM_ICON[platform]} size={19} color={c.foreground} />
        <Text style={[styles.platform, { color: c.foreground }]}>{platform}</Text>
        {onNotifyChange && (
          <Switch
            value={!!notify}
            onValueChange={onNotifyChange}
            trackColor={{ false: c.interactiveSecondary, true: c.interactiveSelectedBorder }}
            thumbColor="#fff"
          />
        )}
      </View>

      {/* Desktop reports a build number plus a separate version hash; mobile
          reports the same string for both, so only show it once there. */}
      {humanVersion && humanVersion !== hash && (
        <Text style={[styles.humanVersion, { color: c.foregroundAlt }]}>{humanVersion}</Text>
      )}

      <Pressable
        onPress={copy}
        style={[styles.hashRow, { backgroundColor: c.interactivePrimary, borderColor: c.borderPrimary }]}
      >
        <Text style={[styles.hash, { color: c.foregroundAlt }]} numberOfLines={1}>
          {hash}
        </Text>
        <Ionicons
          name={copied ? 'checkmark' : 'copy-outline'}
          size={15}
          color={copied ? c.interactiveSelectedBorder : c.foregroundMuted}
        />
      </Pressable>

      {date && <Text style={[styles.date, { color: c.foregroundSubtle }]}>{date}</Text>}
    </Surface>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 9,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  platform: { fontFamily: font.semibold, fontSize: 15, flex: 1 },
  humanVersion: { fontFamily: font.medium, fontSize: 13.5 },
  hashRow: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  hash: { fontFamily: font.regular, fontSize: 12, flex: 1 },
  date: { fontFamily: font.regular, fontSize: 11.5 },
});
