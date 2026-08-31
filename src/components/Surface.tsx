import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ImageBackground,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useSettings } from '../state/settings';
import { useTheme } from '../theme/ThemeProvider';
import { GlassLayer } from './Glass';

const BALL_IMAGE = require('../../assets/themes/ball20.png');

/**
 * A panel that respects Ball 2.0.
 *
 * The site's ball20 theme sets `background-image: url(/ball2.0.png) !important`
 * on essentially every surface. This does the same: under that theme the image
 * goes behind the children instead of a flat colour, with a scrim on top so the
 * card's own text stays readable.
 *
 * Every other theme gets a plain View, so there is no cost when the effect is off.
 */
export function Surface({
  style,
  children,
  inModal,
  glassVariant = 'regular',
  ...rest
}: ViewProps & {
  style?: StyleProp<ViewStyle>;
  /** Set on surfaces rendered inside a React Native <Modal>. */
  inModal?: boolean;
  glassVariant?: 'regular' | 'clear';
}) {
  const { meta } = useTheme();
  const { settings } = useSettings();

  // Ball 2.0 owns its surfaces outright, so glass never applies there.
  if (!meta.ballMode && settings.glassSurfaces) {
    // The caller's backgroundColor becomes the glass tint and the flat
    // fallback; the container itself goes transparent so the effect shows.
    const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
    const surfaceColor = typeof flat?.backgroundColor === 'string' ? flat.backgroundColor : undefined;
    return (
      <View style={[style, styles.ballClip, { backgroundColor: 'transparent' }]} {...rest}>
        <GlassLayer
          inModal={inModal}
          variant={glassVariant}
          flatColor={surfaceColor ?? 'transparent'}
          tint={surfaceColor}
        />
        {children}
      </View>
    );
  }

  if (!meta.ballMode) {
    return (
      <View style={style} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <View style={[style, styles.ballClip]} {...rest}>
      <ImageBackground source={BALL_IMAGE} resizeMode="stretch" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.ballScrim]} pointerEvents="none" />
      {children}
    </View>
  );
}

/**
 * Swaps any picture in the app — exploit logos, screenshots — for the Ball 2.0
 * artwork when that theme is active, and returns the original otherwise.
 *
 * A source swap rather than an overlay: the artwork is a 1024x1024 image whose
 * subject sits in the middle of a wide white margin, so stretching it into a
 * 42px logo tile just showed the margin. Swapping the source lets `contentFit`
 * crop to the subject at any size.
 */
export function useBallSource<T>(original: T): T | number {
  const { meta } = useTheme();
  return meta.ballMode ? BALL_IMAGE : original;
}

/** Full-bleed backdrop; Ball 2.0 covers the whole screen behind everything. */
export function ScreenBackground({ color }: { color: string }) {
  const { meta, c } = useTheme();

  if (!meta.ballMode) {
    // The site paints two accent gradients over its ground at 50% opacity.
    // Reproducing them gives depth, and gives the glass surfaces something to
    // refract — over a flat fill, frosted glass is indistinguishable from paint.
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} pointerEvents="none">
        <LinearGradient
          colors={[c.gradient1, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 0.55 }}
          style={[StyleSheet.absoluteFill, styles.wash]}
        />
        <LinearGradient
          colors={['transparent', c.gradient2]}
          start={{ x: 0.2, y: 0.45 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.wash]}
        />
      </View>
    );
  }

  // ImageBackground has no pointerEvents prop, so the wrapper carries it.
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageBackground source={BALL_IMAGE} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.ballScrim]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Keeps the image inside rounded corners.
  ballClip: { overflow: 'hidden' },
  // Kept faint: this is atmosphere behind the content, not a feature.
  wash: { opacity: 0.16 },
  // Keeps card text legible over the artwork. BallFill (logos, screenshots)
  // deliberately has no scrim — those are meant to be pure ball.
  ballScrim: { backgroundColor: 'rgba(0,0,0,0.45)' },
});
