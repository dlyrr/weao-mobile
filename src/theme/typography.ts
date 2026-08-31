/**
 * weao.xyz sets `font-family: var(--font-poppins)` on everything, so the app
 * loads the same family. Names match the keys registered in app/_layout.tsx.
 */
export const font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

/** Monospace is used for version hashes, which the site renders in var(--font-mono). */
export const monoFont = {
  fontFamily: undefined as string | undefined,
} as const;
