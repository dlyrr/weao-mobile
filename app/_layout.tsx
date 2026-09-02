import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingGate } from '../src/components/LoadingScreen';
import { ScreenBackground } from '../src/components/Surface';
import { ThemeRain } from '../src/components/ThemeRain';
import { ensureAndroidChannel } from '../src/notifications';
import { DataProvider } from '../src/state/data';
import { SettingsProvider, useSettings } from '../src/state/settings';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { THEMES } from '../src/theme/tokens';
import { font } from '../src/theme/typography';
import { UpdaterProvider } from '../src/updates/UpdaterProvider';

// Hold the native splash until React has something to show, otherwise the
// window is briefly empty and the device wallpaper shows through.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Fonts are a nice-to-have, not a reason to never start. If Google Fonts is
 * slow or unreachable the app proceeds on the system font rather than sitting
 * on a loading screen forever.
 */
const FONT_TIMEOUT_MS = 6000;

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

  return (
    <LoadingGate ready={hydrated} colors={c}>
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
    </LoadingGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [fontTimedOut, setFontTimedOut] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) return;
    const t = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [fontsLoaded, fontError]);

  const typographyReady = fontsLoaded || !!fontError || fontTimedOut;

  // Hand off from the native splash the moment React can paint. The in-app
  // loading screen carries on from there, so there is never an empty window.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        {typographyReady ? (
          <SettingsProvider>
            <ThemeProvider>
              <DataProvider>
                <UpdaterProvider>
                  <Shell />
                </UpdaterProvider>
              </DataProvider>
            </ThemeProvider>
          </SettingsProvider>
        ) : (
          // No providers exist yet, so the default theme's colours are passed
          // in directly rather than read from context.
          <LoadingGate ready={false} colors={THEMES.dark}>
            <View style={styles.fill} />
          </LoadingGate>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
