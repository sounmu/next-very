import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, control, lineWidth, space, typography } from './tokens';

export type RowProps = {
  label: string;
  /** Smaller second line under the label (tokens.css .row .t2). */
  hint?: string;
  /** A string or number renders as an amount (semibold, tabular digits). Pass a node such as <Money /> for custom rendering. */
  value?: ReactNode;
  /** Total rows: label and value in 700 weight, label in the primary text color. */
  bold?: boolean;
  /** Bottom rule (tokens.css .row). Pass false on the last row of a card. */
  divider?: boolean;
};

/** Label on the left, value on the right. */
export function Row({ label, hint, value, bold = false, divider = true }: RowProps) {
  const isText = typeof value === 'string' || typeof value === 'number';
  return (
    <View style={[styles.root, divider && styles.divider]}>
      <View style={styles.grow}>
        <Text style={bold ? styles.labelBold : styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {isText ? <Text style={bold ? styles.valueBold : styles.value}>{value}</Text> : value}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingVertical: space.s3, minHeight: control.iconButton },
  divider: { borderBottomWidth: lineWidth, borderBottomColor: colors.line },
  grow: { flex: 1, minWidth: 0 },
  label: { ...typography.body, color: colors.text2 },
  labelBold: { ...typography.body, fontWeight: '700' },
  hint: { ...typography.caption, marginTop: space.s1 },
  value: typography.rowAmount,
  valueBold: { ...typography.rowAmount, fontWeight: '700' },
});
