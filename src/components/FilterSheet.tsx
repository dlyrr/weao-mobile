import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  countActiveFilters,
  EMPTY_FILTERS,
  type Filters,
  type SortId,
} from '../api/grouping';
import { useColors } from '../theme/ThemeProvider';
import { font } from '../theme/typography';
import { Surface } from './Surface';

/** Option ids and labels match weao.xyz's filter panel exactly. */
const SORT_OPTIONS: Array<{ id: SortId; label: string }> = [
  { id: 'cost-high', label: 'Cost: High to Low' },
  { id: 'cost-low', label: 'Cost: Low to High' },
  { id: 'sunc-high', label: 'sUNC: High to Low' },
  { id: 'sunc-low', label: 'sUNC: Low to High' },
];

const GROUPS = [
  {
    key: 'pricing' as const,
    title: 'Pricing',
    options: [
      { id: 'free', label: 'Free' },
      { id: 'paid', label: 'Paid' },
    ],
  },
  {
    key: 'platform' as const,
    title: 'Platform',
    options: [
      { id: 'windows', label: 'Windows' },
      { id: 'mac', label: 'Mac' },
      { id: 'android', label: 'Android' },
      { id: 'ios', label: 'iOS' },
    ],
  },
  {
    key: 'status' as const,
    title: 'Status',
    options: [
      { id: 'updated', label: 'Updated' },
      { id: 'notupdated', label: 'Not Updated' },
    ],
  },
  {
    key: 'keysystem' as const,
    title: 'Key System',
    options: [
      { id: 'keyless', label: 'Keyless' },
      { id: 'keysystem', label: 'Key System' },
    ],
  },
  {
    key: 'type' as const,
    title: 'Type',
    options: [
      { id: 'executor', label: 'Executor' },
      { id: 'external', label: 'External' },
    ],
  },
  {
    key: 'detection' as const,
    title: 'Detection',
    options: [
      { id: 'undetected', label: 'Undetected' },
      { id: 'detected', label: 'Detected' },
      { id: 'clientmod', label: 'Client Mod Bypass' },
      { id: 'banwave', label: 'Possible Banwave' },
    ],
  },
];

interface Props {
  visible: boolean;
  filters: Filters;
  sort: SortId | null;
  onChange: (filters: Filters) => void;
  onSortChange: (sort: SortId | null) => void;
  onClose: () => void;
}

export function FilterSheet({ visible, filters, sort, onChange, onSortChange, onClose }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  const toggle = (groupKey: keyof Filters, id: string) => {
    const current = filters[groupKey] as string[];
    const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
    onChange({ ...filters, [groupKey]: next } as Filters);
  };

  const activeCount = countActiveFilters(filters) + (sort ? 1 : 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: c.modalOverlay }]} onPress={onClose}>
        {/* Stops taps inside the sheet from dismissing it. */}
        <Pressable style={styles.sheetWrapper} onPress={(e) => e.stopPropagation()}>
          <Surface
            inModal
            style={[
              styles.sheet,
              {
                backgroundColor: c.modalBg,
                borderColor: c.modalBorder,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={styles.grabber}>
              <View style={[styles.grabberBar, { backgroundColor: c.borderPrimary }]} />
            </View>

            <View style={styles.headerRow}>
              <Text style={[styles.heading, { color: c.foreground }]}>Filters</Text>
              <Pressable
                onPress={() => {
                  onChange(EMPTY_FILTERS);
                  onSortChange(null);
                }}
                disabled={activeCount === 0}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.clear,
                    { color: activeCount === 0 ? c.foregroundSubtle : c.interactiveSelectedBorder },
                  ]}
                >
                  Clear All
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.groupTitle, { color: c.foregroundMuted }]}>Sort By</Text>
              <View style={styles.chipRow}>
                {SORT_OPTIONS.map((option) => {
                  const active = sort === option.id;
                  return (
                    <Chip
                      key={option.id}
                      label={option.label}
                      active={active}
                      onPress={() => onSortChange(active ? null : option.id)}
                    />
                  );
                })}
              </View>

              {GROUPS.map((group) => (
                <View key={group.key}>
                  <Text style={[styles.groupTitle, { color: c.foregroundMuted }]}>
                    {group.title}
                  </Text>
                  <View style={styles.chipRow}>
                    {group.options.map((option) => (
                      <Chip
                        key={option.id}
                        label={option.label}
                        active={(filters[group.key] as string[]).includes(option.id)}
                        onPress={() => toggle(group.key, option.id)}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <Pressable
              onPress={onClose}
              style={[styles.done, { backgroundColor: c.interactiveSelectedBorder }]}
            >
              <Text style={styles.doneText}>Show results</Text>
            </Pressable>
          </Surface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? c.interactiveSelected : c.interactivePrimary,
          borderColor: active ? c.interactiveSelectedBorder : c.borderPrimary,
        },
      ]}
    >
      {active && <Ionicons name="checkmark" size={13} color={c.interactiveSelectedBorder} />}
      <Text
        style={[
          styles.chipText,
          { color: active ? c.foreground : c.foregroundAlt },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    maxHeight: '85%',
  },
  sheet: {
    // Must be shrinkable too, or the sheet ignores sheetWrapper's 85% cap and
    // there is nothing for the scroll area to shrink inside of.
    flexShrink: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  grabber: {
    alignItems: 'center',
    paddingVertical: 9,
  },
  grabberBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heading: {
    fontFamily: font.semibold,
    fontSize: 18,
  },
  clear: {
    fontFamily: font.medium,
    fontSize: 13,
  },
  scroll: {
    // flexShrink defaults to 0 in React Native, so without this the scroll area
    // insists on its full content height, overflows the sheet's 85% cap and
    // pushes the "Show results" button off-screen on shorter or wider screens.
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  groupTitle: {
    fontFamily: font.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 9,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: font.medium,
    fontSize: 13,
  },
  done: {
    overflow: 'hidden',
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  doneText: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: '#0b0b0b',
  },
});
