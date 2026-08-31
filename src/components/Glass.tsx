import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Liquid Glass surfaces, with a graceful ladder down to every other platform.
 *
 *   iOS 26+          -> GlassView (UIVisualEffectView, the real thing)
 *   older iOS/Android-> BlurView  (expo-blur)
 *   web              -> BlurView, which compiles to backdrop-filter
 *   reduce transparency, or glass off -> the theme's flat surface colour
 *
 * Three constraints from the platform are encoded here rather than left to
 * call sites, because getting any of them wrong is a crash or a dead tap:
 *
 * 1. `isGlassEffectAPIAvailable()` must be checked before rendering a
 *    GlassView — some iOS 26 builds ship without the API and crash.
 * 2. A glass layer inside a React Native <Modal> swallows onPress, so
 *    `inModal` forces the BlurView path.
 * 3. Glass sits under content as an absolutely-positioned layer with
 *    pointerEvents="none", so a parent Pressable still receives its taps.
 */

/** Resolved once per mount; reduce-transparency can change while running. */
export function useGlassCapability(): 'liquid' | 'blur' | 'flat' {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    // Reduce Transparency is an iOS-only API: the function is simply absent on
    // Android and react-native-web, where calling it throws.
    if (Platform.OS !== 'ios') return;
    if (typeof AccessibilityInfo.isReduceTransparencyEnabled !== 'function') return;

    let alive = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((v) => {
        if (alive) setReduceTransparency(v);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener?.('reduceTransparencyChanged', (v) =>
      setReduceTransparency(v),
    );
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);

  if (reduceTransparency) return 'flat';
  if (Platform.OS === 'ios') {
    try {
      if (isLiquidGlassAvailable() && isGlassEffectAPIAvailable()) return 'liquid';
    } catch {
      // Older iOS without the module linked in: fall through to blur.
    }
  }
  return 'blur';
}

interface GlassLayerProps {
  /** Forces the BlurView path — required inside a React Native <Modal>. */
  inModal?: boolean;
  /** `clear` is lighter; `regular` is the system default. */
  variant?: 'regular' | 'clear';
  /** Falls back to this when neither glass nor blur is usable. */
  flatColor: string;
  tint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * An absolutely-positioned glass backdrop. Render it as the first child of a
 * positioned, overflow-hidden container and put the content after it.
 */
export function GlassLayer({ inModal, variant = 'regular', flatColor, tint, style }: GlassLayerProps) {
  const capability = useGlassCapability();
  const { meta } = useTheme();

  const mode = inModal && capability === 'liquid' ? 'blur' : capability;

  if (mode === 'liquid') {
    return (
      <GlassView
        // Never receives touches: parent Pressables must keep theirs.
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, style]}
        glassEffectStyle={variant}
        tintColor={tint}
        colorScheme={meta.scheme}
      />
    );
  }

  if (mode === 'blur') {
    return (
      <BlurView
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, style]}
        intensity={variant === 'clear' ? 24 : 42}
        tint={meta.scheme === 'light' ? 'light' : 'dark'}
      />
    );
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: flatColor }, style]} />
  );
}

/** True when the current device renders genuine Liquid Glass. */
export function useIsLiquidGlass(): boolean {
  return useGlassCapability() === 'liquid';
}
