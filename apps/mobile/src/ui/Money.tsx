import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { colors, fontSize, typography } from './tokens';

export type FormatWonOptions = {
  /** Prefix positive values with "+" (negative values always carry "-"). */
  signed?: boolean;
  /** Suffix. Default "원"; use "원/kg" for unit prices. */
  unit?: string;
};

/** 1234 -> "1,234원"; with signed: 200 -> "+200원", -200 -> "-200원". Rounds to an integer. */
export function formatWon(value: number, { signed = false, unit = '원' }: FormatWonOptions = {}): string {
  const rounded = Math.round(value);
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = rounded < 0 ? '-' : signed && rounded > 0 ? '+' : '';
  return `${sign}${digits}${unit}`;
}

/** Cost going up is a loss, going down is a profit, unchanged is neutral. */
export function deltaColor(delta: number): string {
  if (delta > 0) return colors.loss;
  if (delta < 0) return colors.profit;
  return colors.text2;
}

export type MoneyProps = FormatWonOptions & {
  value: number;
  /** Override size, weight or color; a signed delta keeps its color unless style sets one. */
  style?: StyleProp<TextStyle>;
};

/** Formatted amount. With 'signed', renders a delta ("+200원" / "-200원") colored by deltaColor. */
export function Money({ value, signed = false, unit, style }: MoneyProps) {
  return (
    <Text style={[styles.text, signed && deltaStyle(value), style]}>{formatWon(value, { signed, unit })}</Text>
  );
}

function deltaStyle(delta: number) {
  if (delta > 0) return styles.up;
  if (delta < 0) return styles.down;
  return styles.flat;
}

const styles = StyleSheet.create({
  text: { ...typography.amount, fontSize: fontSize.body, color: colors.text },
  up: { color: colors.loss },
  down: { color: colors.profit },
  flat: { color: colors.text2 },
});
