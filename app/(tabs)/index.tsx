import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  buildSections,
  countActiveFilters,
  EMPTY_FILTERS,
  exploitKey,
  type Filters,
  type SortId,
} from '../../src/api/grouping';
import type { Exploit } from '../../src/api/types';
import { TAB_BAR_BASE_HEIGHT } from './_layout';
import { ExploitCard } from '../../src/components/ExploitCard';
import { FilterSheet } from '../../src/components/FilterSheet';
import { RainBurst, useRainBurst } from '../../src/components/ThemeRain';
import { SectionHeader } from '../../src/components/ui';
import { useWeaoData } from '../../src/state/data';
import { useSettings } from '../../src/state/settings';
import { useColors } from '../../src/theme/ThemeProvider';
import { font } from '../../src/theme/typography';

/** Flattened section list so one FlatList can virtualise everything. */
type Row =
  | { type: 'header'; id: string; title: string }
  | { type: 'exploit'; id: string; exploit: Exploit };

export default function ExploitsScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { exploits, loading, refreshing, error, stale, refresh } = useWeaoData();
  const { settings, togglePinned } = useSettings();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortId | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const { enabled: burstEnabled, bursts, burst, image: burstImage } = useRainBurst();

  // The tab bar floats when glass is on, so content has to clear it.
  const bottomInset =
    insets.bottom + 24 + (settings.glassSurfaces ? TAB_BAR_BASE_HEIGHT : 0);

  const rows = useMemo<Row[]>(() => {
    const sections = buildSections(exploits, query, filters, sort, settings.pinnedExploits);
    const out: Row[] = [];
    for (const section of sections) {
      out.push({ type: 'header', id: section.id, title: section.title });
      for (const exploit of section.exploits) {
        out.push({ type: 'exploit', id: `${section.id}:${exploitKey(exploit)}`, exploit });
      }
    }
    return out;
  }, [exploits, query, filters, sort, settings.pinnedExploits]);

  const activeFilterCount = countActiveFilters(filters) + (sort ? 1 : 0);

  const renderRow = ({ item }: { item: Row }) => {
    if (item.type === 'header') return <SectionHeader title={item.title} />;

    const key = exploitKey(item.exploit);
    return (
      <ExploitCard
        exploit={item.exploit}
        pinned={settings.pinnedExploits.includes(key)}
        watched={settings.watchedExploits.includes(key)}
        compact={settings.listView}
        onPress={() => router.push(`/exploit/${encodeURIComponent(key)}`)}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          togglePinned(key);
        }}
      />
    );
  };

  return (
    <View
      style={styles.fill}
      onStartShouldSetResponder={() => burstEnabled}
      onResponderRelease={(e) => burst(e.nativeEvent.pageX, e.nativeEvent.pageY)}
    >
      <View style={styles.toolbar}>
        <View
          style={[
            styles.search,
            { backgroundColor: c.interactivePrimary, borderColor: c.borderPrimary },
          ]}
        >
          <Ionicons name="search" size={16} color={c.foregroundSubtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search exploits..."
            placeholderTextColor={c.foregroundSubtle}
            style={[styles.searchInput, { color: c.foreground }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={c.foregroundSubtle} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setFilterOpen(true)}
          style={[
            styles.filterButton,
            {
              backgroundColor: activeFilterCount ? c.interactiveSelected : c.interactivePrimary,
              borderColor: activeFilterCount ? c.interactiveSelectedBorder : c.borderPrimary,
            },
          ]}
        >
          <Ionicons name="options" size={17} color={c.foreground} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterCount, { backgroundColor: c.interactiveSelectedBorder }]}>
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {error && !loading && (
        <View style={[styles.banner, { backgroundColor: c.warningYellowBg, borderColor: c.warningYellowBorder }]}>
          <Ionicons name="warning" size={14} color={c.warningYellowBorder} />
          <Text style={[styles.bannerText, { color: c.foregroundAlt }]} numberOfLines={2}>
            {stale ? `${error} Showing cached data.` : error}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.interactiveSelectedBorder} />
          <Text style={[styles.loadingText, { color: c.foregroundMuted }]}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.id}
          renderItem={renderRow}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={c.interactiveSelectedBorder}
              colors={[c.interactiveSelectedBorder]}
              progressBackgroundColor={c.backgroundSecondary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="sad-outline" size={34} color={c.foregroundSubtle} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No exploits found</Text>
              <Text style={[styles.emptySub, { color: c.foregroundMuted }]}>
                Try adjusting your search terms or filters
              </Text>
            </View>
          }
          // Long-press hint lives at the bottom so it doesn't push content down.
          ListFooterComponent={
            rows.length > 0 ? (
              <Text style={[styles.hint, { color: c.foregroundSubtle }]}>
                Long-press an exploit to pin it to the top of its section.
              </Text>
            ) : null
          }
        />
      )}

      <FilterSheet
        visible={filterOpen}
        filters={filters}
        sort={sort}
        onChange={setFilters}
        onSortChange={setSort}
        onClose={() => setFilterOpen(false)}
      />

      {burstImage &&
        bursts.map((b) => <RainBurst key={b.id} x={b.x} y={b.y} image={burstImage} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  search: {
    overflow: 'hidden',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 11,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    padding: 0,
  },
  filterButton: {
    overflow: 'hidden',
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCountText: {
    fontFamily: font.bold,
    fontSize: 10,
    color: '#0b0b0b',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
  bannerText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 8,
  },
  loadingText: {
    fontFamily: font.regular,
    fontSize: 13,
  },
  emptyTitle: {
    fontFamily: font.semibold,
    fontSize: 15,
    marginTop: 4,
  },
  emptySub: {
    fontFamily: font.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  hint: {
    fontFamily: font.regular,
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 14,
  },
});
