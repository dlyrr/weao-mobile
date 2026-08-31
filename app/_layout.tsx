import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenBackground } from '../src/components/Surface';
import { ThemeRain } from '../src/components/ThemeRain';
import { ensureAndroidChannel } from '../src/notifications';
import { DataProvider } from '../src/state/data';
import { SettingsProvider, useSettings } from '../src/state/settings';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { font } from '../src/theme/typography';

function Shell() {
  const { c, meta } = useTheme();
  const { hydrated } = useSettings();

  // Registering the channel early means the first notification already has one.
  useEffect(() => {
    ensureAndroidChannel().catch(() => {});
  }, []);

  /**
   * The navigator paints its own theme background over everything beneath it —
   * DefaultTheme is rgb(242,242,242), which hid ScreenBackground entirely. Feed
   * it our tokens instead. Ball 2.0 needs transparent so its image shows.
   */
  const navTheme = useMemo(() => {
    const base = meta.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: meta.scheme === 'dark',
      colors: {
        ...base.colors,
        primary: c.interactiveSelectedBorder,
        background: meta.ballMode ? 'transparent' : c.background,
        card: c.background,
        text: c.foreground,
        border: c.borderPrimary,
        notification: c.weaoRed,
      },
    };
  }, [c, meta]);

  if (!hydrated) {
    // Held one frame so the app never flashes the default theme before the
    // user's saved one loads.
    return <View style={[styles.fill, { backgroundColor: c.background }]} />;
  }

  return (
    <View style={styles.fill}>
      <ScreenBackground color={c.background} />
      <NavThemeProvider value={navTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: meta.ballMode ? c.backgroundAlt : c.background },
            headerTintColor: c.foreground,
            headerTitleStyle: { fontFamily: font.semibold, fontSize: 16 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="exploit/[key]"
            options={{ title: '', headerBackTitle: 'Back', presentation: 'card' }}
          />
        </Stack>
      </NavThemeProvider>

      {/* Sits above content but never intercepts touches. */}
      <ThemeRain />

      <StatusBar style={meta.scheme === 'light' ? 'dark' : 'light'} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <DataProvider>
              <Shell />
            </DataProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
