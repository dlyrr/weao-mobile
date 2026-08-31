import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassLayer } from '../../src/components/Glass';
import { useSettings } from '../../src/state/settings';
import { useTheme } from '../../src/theme/ThemeProvider';
import { font } from '../../src/theme/typography';

/** Height screens must clear when the bar floats. Mirrors tabBarStyle below. */
export const TAB_BAR_BASE_HEIGHT = 68;

export default function TabsLayout() {
  const { c, meta } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const glass = settings.glassSurfaces && !meta.ballMode;

  // Chrome goes transparent so the glass layer behind it is what shows.
  const chrome = (variant: 'regular' | 'clear') => () => (
    <GlassLayer variant={variant} flatColor={meta.ballMode ? c.backgroundAlt : c.background} />
  );

  return (
    <Tabs
      screenOptions={{
        headerBackground: glass ? chrome('clear') : undefined,
        headerStyle: {
          backgroundColor: glass ? 'transparent' : meta.ballMode ? c.backgroundAlt : c.background,
        },
        headerTintColor: c.foreground,
        headerTitleStyle: { fontFamily: font.semibold, fontSize: 16 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: 'transparent' },
        // Height is set, vertical padding is not. Adding paddingTop/paddingBottom
        // on top of a height collapses the label box to a few pixels and clips
        // the text; 68 leaves the 24px icon and its 15px label room to breathe.
        // The inset keeps the bar clear of a home indicator.
        tabBarBackground: glass ? chrome('regular') : undefined,
        tabBarStyle: {
          backgroundColor: glass ? 'transparent' : meta.ballMode ? c.backgroundAlt : c.background,
          borderTopColor: c.borderPrimary,
          borderTopWidth: 1,
          height: 68 + insets.bottom,
          // Floating over the content is what sells the effect; screens add
          // TAB_BAR_HEIGHT to their bottom padding so nothing hides under it.
          ...(glass ? { position: 'absolute', left: 0, right: 0, bottom: 0 } : null),
        },
        tabBarActiveTintColor: c.interactiveSelectedBorder,
        tabBarInactiveTintColor: c.foregroundSubtle,
        // lineHeight is explicit because the label box is measured from it;
        // without it the box collapses shorter than the glyphs and clips them.
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11, lineHeight: 15 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Exploits',
          headerTitle: 'WhatExpsAre.Online',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="versions"
        options={{
          title: 'Versions',
          headerTitle: 'Roblox Versions',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="git-branch" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
