/**
 * Values from DESIGN.md sections 4-7; change DESIGN.md first. Token names predate
 * DESIGN.md, so each color names the DESIGN.md token it maps to.
 */
import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  /** accent.deep */
  primary: '#1E4E8C',
  primary600: '#173D6E',
  /** bg.blue */
  primary50: '#E8F0FA',
  /** bg.highlight: one key cost card per screen, black text only */
  accent: '#F3F86B',
  /** state.warningBg */
  accent50: '#FFF3D6',
  /** state.success; a cost going down */
  profit: '#1E4E8C',
  profit50: '#E8F0FA',
  /** state.error; a cost going up */
  loss: '#B42318',
  loss50: '#FEF0EE',
  /** state.warning */
  warn: '#805300',
  /** text.primary */
  text: '#171A18',
  /** text.secondary */
  text2: '#626A65',
  /** text.placeholder */
  text3: '#727A74',
  /** border.default */
  line: '#DDE2DD',
  /** bg.canvas */
  bg: '#F3F4F2',
  /** bg.surface */
  surface: '#FFFFFF',
  /** bg.subtle */
  subtle: '#F7F8F6',
  /** action.primary */
  action: '#171A18',
  actionPressed: '#303731',
  /** accent.market: lines only (3.1:1 on white) */
  market: '#8593A6',
  disabledBg: '#E3E6E2',
  disabledText: '#737A74',
  scrim: 'rgba(0,0,0,0.32)',
} as const;

export type ColorToken = keyof typeof colors;

export const chartColors = [colors.primary, colors.market, colors.warn, colors.text2, colors.line] as const;

export const fontSize = {
  display: 36,
  title: 28,
  detail: 20,
  h: 18,
  amount: 24,
  row: 17,
  button: 16,
  body: 15,
  sm: 13,
  caption: 12,
  xs: 11,
} as const;

export const space = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 28,
  s8: 32,
  s10: 40,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 28,
  full: 999,
} as const;

/** DESIGN.md 7: cards have no shadow; only floating sheets do. */
export const shadow = {
  card: {},
  sheet: { boxShadow: '0 -8px 24px rgba(23,26,24,0.08)' },
} satisfies Record<string, ViewStyle>;

export const control = {
  appBarHeight: 56,
  /** also the minimum touch target */
  iconButton: 44,
  buttonHeight: 52,
  secondaryButtonHeight: 48,
  buttonFontSize: fontSize.button,
  inputHeight: 52,
  chipHeight: 24,
  filterChipHeight: 36,
  tabBarHeight: 60,
  /** desktop browser demos are centered at this width */
  maxContentWidth: 430,
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export const iconStroke = 1.75;

export const lineWidth = 1;

export const opacity = {
  pressed: 0.85,
  disabled: 0.4,
} as const;

/** Native keeps the system font; web falls back when Pretendard is not installed. */
const fontFamily: TextStyle = Platform.select({
  web: { fontFamily: 'Pretendard, "Noto Sans KR", system-ui, -apple-system, sans-serif' },
  default: {},
});

const numeric: TextStyle = { fontVariant: ['tabular-nums'] };

export const typography = StyleSheet.create({
  display: { ...fontFamily, ...numeric, fontSize: fontSize.display, lineHeight: 44, fontWeight: '600', letterSpacing: -0.5, color: colors.text },
  title: { ...fontFamily, fontSize: fontSize.title, lineHeight: 36, fontWeight: '600', color: colors.text },
  detailTitle: { ...fontFamily, fontSize: fontSize.detail, lineHeight: 28, fontWeight: '600', color: colors.text },
  heading: { ...fontFamily, fontSize: fontSize.h, lineHeight: 26, fontWeight: '600', color: colors.text },
  sectionTitle: { ...fontFamily, fontSize: fontSize.h, lineHeight: 26, fontWeight: '600', color: colors.text },
  amountLg: { ...fontFamily, ...numeric, fontSize: fontSize.amount, lineHeight: 32, fontWeight: '600', letterSpacing: -0.5, color: colors.text },
  rowAmount: { ...fontFamily, ...numeric, fontSize: fontSize.row, lineHeight: 24, fontWeight: '600', color: colors.text },
  cardTitle: { ...fontFamily, fontSize: fontSize.sm, lineHeight: 20, fontWeight: '500', color: colors.text2 },
  body: { ...fontFamily, fontSize: fontSize.body, lineHeight: 23, color: colors.text },
  bodyStrong: { ...fontFamily, fontSize: fontSize.body, lineHeight: 23, fontWeight: '600', color: colors.text },
  secondary: { ...fontFamily, fontSize: fontSize.sm, lineHeight: 20, fontWeight: '500', color: colors.text2 },
  caption: { ...fontFamily, fontSize: fontSize.caption, lineHeight: 18, color: colors.text2 },
  button: { ...fontFamily, fontSize: fontSize.button, lineHeight: 24, fontWeight: '600' },
  amount: { ...fontFamily, ...numeric, fontWeight: '600' },
});
