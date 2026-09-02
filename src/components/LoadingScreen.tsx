import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { ThemeTokens } from '../theme/tokens';

const LOGO = require('../../assets/logo.png');

/**
 * Shown while fonts and saved settings load, and behind the native splash
 * hand-off so there is no blank frame between them.
 *
 * Deliberately self-contained: it takes its colours as a prop rather than
 * reading a context, so it can render before any provider is ready. It also
 * uses the system font, because this is what shows while Poppins is still
 * loading.
 */
export function LoadingScreen({
  colors,
  message,
}: {
  colors: Pick<ThemeTokens, 'background' | 'foreground' | 'foregroundMuted'>;
  message?: string;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    rotation.start();

    // Fades in rather than popping, so a fast load doesn't flash.
    const entrance = Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    entrance.start();

    return () => {
      rotation.stop();
      entrance.stop();
    };
  }, [spin, fade]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Animated.View style={{ opacity: fade }}>
        <Animated.Image
          source={LOGO}
          style={[styles.logo, { transform: [{ rotate }] }]}
          resizeMode="contain"
          // The logo is the brand mark; the spin conveys the loading state.
          accessibilityLabel="Loading"
        />
      </Animated.View>

      {message ? (
        <Animated.Text style={[styles.message, { color: colors.foregroundMuted, opacity: fade }]}>
          {message}
        </Animated.Text>
      ) : null}
    </View>
  );
}

/**
 * Wraps content and cross-fades the loading screen away once ready, so the
 * transition is a dissolve rather than a hard cut.
 */
export function LoadingGate({
  ready,
  colors,
  message,
  children,
}: {
  ready: boolean;
  colors: Pick<ThemeTokens, 'background' | 'foreground' | 'foregroundMuted'>;
  message?: string;
  children: React.ReactNode;
}) {
  const cover = useRef(new Animated.Value(1)).current;
  const [mounted, setMounted] = React.useState(true);

  useEffect(() => {
    if (!ready) return;
    const anim = Animated.timing(cover, {
      toValue: 0,
      duration: 320,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      // Unmounting keeps the spin animation from running for the app's lifetime.
      if (finished) setMounted(false);
    });
    return () => anim.stop();
  }, [ready, cover]);

  return (
    // Plain flex container, never centred: `children` is the whole app, and
    // centring here would shrink it to its content width.
    // The ground colour is painted here rather than only inside the animated
    // overlay, so nothing can show through while the overlay fades.
    <View style={[styles.container, mounted && { backgroundColor: colors.background }]}>
      {children}
      {mounted && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: cover }]}
          pointerEvents={ready ? 'none' : 'auto'}
        >
          <LoadingScreen colors={colors} message={message} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /** Wraps the app; must not impose alignment on it. */
  container: {
    flex: 1,
  },
  /** The loading screen itself, which does centre its logo. */
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 96,
    height: 96,
  },
  message: {
    marginTop: 22,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
