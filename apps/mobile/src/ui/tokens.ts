/**
 * Design tokens, mirrored from design/tokens.css (the single source for color,
 * type, spacing, radius and shadow). Change tokens.css first, then this file.
 * Screens import these and never hardcode visual values.
 *
 * Font: the app uses the platform system font, so there is no fontFamily token.
 */
import { StyleSheet, type ViewStyle } from 'react-native';

export const colors = {
  primary: '#0F766E',
  primary600: '#0D655E',
  primary50: '#E6F4F2',
  accent: '#F59E0B',
  accent50: '#FEF3C7',
  profit: '#16A34A',
  profit50: '#DCFCE7',
  loss: '#DC2626',
  loss50: '#FEE2E2',
  warn: '#D97706',
  text: '#111827',
  text2: '#4B5563',
  text3: '#9CA3AF',
  line: '#E5E7EB',
  bg: '#F6F7F9',
  surface: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;

/** --chart-1 .. --chart-5, in order. */
export const chartColors = ['#0F766E', '#14B8A6', '#F59E0B', '#6366F1', '#9CA3AF'] as const;

/** --fs-* */
export const fontSize = {
  display: 32,
  title: 22,
  h: 18,
  body: 15,
  sm: 13,
  xs: 11,
} as const;

/** --s-* */
export const space = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
} as const;

/** --r-* */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

/** --shadow-card. React Native 0.76+ and react-native-web accept the CSS box-shadow string. */
export const shadow = {
  card: { boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 4px 12px rgba(17,24,39,0.06)' },
} satisfies Record<string, ViewStyle>;

/** Fixed sizes of the controls that tokens.css defines as classes. */
export const control = {
  /** .appbar */
  appBarHeight: 56,
  /** .icon-btn */
  iconButton: 40,
  /** .btn */
  buttonHeight: 52,
  /** .btn font size (not part of the --fs scale) */
  buttonFontSize: 16,
  /** .input */
  inputHeight: 48,
  /** .chip */
  chipHeight: 24,
} as const;

/** Inline icon sizes. .tab svg is 24px; 20px sits beside body text, 16px beside small text. */
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

/** The 1px rules of .row, .input and .bottom-cta. */
export const lineWidth = 1;

/** Interaction alphas. tokens.css has none, so they live here instead of in screens. */
export const opacity = {
  pressed: 0.85,
  disabled: 0.4,
} as const;

/** Text presets taken from the tokens.css classes named in the comments. */
export const typography = StyleSheet.create({
  /** Key number on 02 and 07 */
  display: { fontSize: fontSize.display, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  /** Screen title (Header) */
  title: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  /** .appbar h1 */
  heading: { fontSize: fontSize.h, fontWeight: '700', color: colors.text },
  /** .section-title */
  sectionTitle: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  /** .card-title */
  cardTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text2 },
  body: { fontSize: fontSize.body, color: colors.text },
  /** .row .t1 */
  bodyStrong: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  /** .field label */
  secondary: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text2 },
  /** .row .t2 */
  caption: { fontSize: fontSize.sm, color: colors.text3 },
  /** .amount */
  amount: { fontWeight: '700', fontVariant: ['tabular-nums'] },
});
