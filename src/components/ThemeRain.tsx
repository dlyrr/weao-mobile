import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSettings } from '../state/settings';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Recreates weao.xyz's falling-image effect.
 *
 * The site enables it for exactly two themes, with these assets:
 *   voxlis  -> /red-heart.svg      (click burst on)
 *   sirmeme -> /assets/sirmeme.png (click burst off)
 *
 * Particle counts and size ranges below are the site's own quality tiers.
 * Everything animates on the native driver so the list stays smooth.
 */

const RAIN_IMAGES = {
  redHeart: require('../../assets/themes/red-heart.png'),
  sirmeme: require('../../assets/themes/sirmeme.png'),
} as const;

/** Site config: itemCount / itemSize per quality tier. */
const QUALITY = {
  high: { count: 20, size: [20, 40] as const },
  medium: { count: 15, size: [18, 35] as const },
  low: { count: 10, size: [15, 30] as const },
} as const;

interface ParticleProps {
  image: number;
  screenW: number;
  screenH: number;
  sizeRange: readonly [number, number];
  /** Staggers the initial drop so they don't fall in lockstep. */
  index: number;
  total: number;
}

function Particle({ image, screenW, screenH, sizeRange, index, total }: ParticleProps) {
  const progress = useRef(new Animated.Value(0)).current;

  // Randomised once per mount, matching the site's per-item randomisation.
  const cfg = useMemo(() => {
    const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
    return {
      size,
      startX: Math.random() * screenW,
      // The site uses dx in [-0.2, 0.2] px/frame; over a full fall that is a
      // gentle sideways drift, so it is expressed here as a total offset.
      drift: (Math.random() - 0.5) * 120,
      // dy in [0.2, 0.5] px/frame at 60fps -> roughly 12-30 px/s.
      duration: (screenH / (0.2 + Math.random() * 0.3)) * (1000 / 60),
      opacity: 0.3 + Math.random() * 0.5,
      spin: (Math.random() - 0.5) * 2,
      delayFraction: index / Math.max(total, 1),
    };
  }, [screenW, screenH, sizeRange, index, total]);

  useEffect(() => {
    // Start each particle partway through its fall so the screen is populated
    // immediately rather than filling from the top over half a minute.
    progress.setValue(cfg.delayFraction);
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: cfg.duration * (1 - cfg.delayFraction),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [progress, cfg]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-cfg.size, screenH + cfg.size],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [cfg.startX, cfg.startX + cfg.drift],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${cfg.spin * 360}deg`],
  });

  return (
    <Animated.Image
      source={image}
      resizeMode="contain"
      style={{
        position: 'absolute',
        width: cfg.size,
        height: cfg.size,
        opacity: cfg.opacity,
        transform: [{ translateX }, { translateY }, { rotate }],
      }}
    />
  );
}

export function ThemeRain() {
  const { meta } = useTheme();
  const { settings } = useSettings();
  const { width, height } = useWindowDimensions();

  const rain = meta.rain;
  const quality = settings.rainQuality;

  // Remounting every particle on a theme switch is intentional: it re-randomises
  // positions instead of morphing one theme's layout into the next.
  const generation = `${meta.id}-${quality}-${Math.round(width)}`;

  if (!rain || quality === 'off') return null;

  const tier = QUALITY[quality];
  const image = RAIN_IMAGES[rain.image];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: tier.count }).map((_, i) => (
        <Particle
          key={`${generation}-${i}`}
          image={image}
          screenW={width}
          screenH={height}
          sizeRange={tier.size}
          index={i}
          total={tier.count}
        />
      ))}
    </View>
  );
}

/**
 * The click burst the site enables for voxlis only: tapping sprays a handful of
 * items upward from the touch point, which then arc away and fade.
 */
export function useRainBurst() {
  const { meta } = useTheme();
  const { settings } = useSettings();
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const nextId = useRef(0);

  const enabled = !!meta.rain?.clickBurst && settings.rainQuality !== 'off';

  const burst = (x: number, y: number) => {
    if (!enabled) return;
    const id = nextId.current++;
    setBursts((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 1600);
  };

  return { enabled, bursts, burst, image: meta.rain ? RAIN_IMAGES[meta.rain.image] : null };
}

interface BurstProps {
  x: number;
  y: number;
  image: number;
}

/** One tap's worth of particles — the site spawns up to 7. */
export function RainBurst({ x, y, image }: BurstProps) {
  const items = useMemo(
    () =>
      Array.from({ length: 7 }).map(() => ({
        // Site: dx in [-1, 1], dy in [-3, -1] -> up and outward.
        dx: (Math.random() * 2 - 1) * 90,
        dy: -(60 + Math.random() * 120),
        size: 18 + Math.random() * 17,
        spin: (Math.random() - 0.5) * 720,
      })),
    [],
  );
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((item, i) => (
        <Animated.Image
          key={i}
          source={image}
          resizeMode="contain"
          style={{
            position: 'absolute',
            left: x - item.size / 2,
            top: y - item.size / 2,
            width: item.size,
            height: item.size,
            opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.9, 0.7, 0] }),
            transform: [
              {
                translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, item.dx] }),
              },
              {
                // Up first, then gravity pulls it back down past the origin.
                translateY: progress.interpolate({
                  inputRange: [0, 0.45, 1],
                  outputRange: [0, item.dy, item.dy + 220],
                }),
              },
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', `${item.spin}deg`],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
