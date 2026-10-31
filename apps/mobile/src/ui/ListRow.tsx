import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, control, iconSize, iconStroke, lineWidth, opacity, space, typography } from './tokens';

export type ListRowProps = {
  /** Item or menu name, up to 2 lines. */
  title: string;
  /** e.g. "1L × 2개 · 10.31 구매". */
  subtitle?: string;
  /** Right value; a string renders as a row amount. Pass a node (Chip, Money) for custom rendering. */
  value?: ReactNode;
  /** Small text under the value, e.g. "100mL당". */
  valueCaption?: string;
  onPress?: () => void;
  /** Draw a chevron; only when a detail screen exists. */
  chevron?: boolean;
  /** Bottom rule between rows in a card. */
  divider?: boolean;
};

/** DESIGN.md 8.5 list row: name and meta on the left, right-aligned value and caption. */
export function ListRow({ title, subtitle, value, valueCaption, onPress, chevron = false, divider = false }: ListRowProps) {
  const body = (
    <>
      <View style={styles.main}>
        <Text style={typography.bodyStrong} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={typography.caption}>{subtitle}</Text> : null}
      </View>
      {value !== undefined || valueCaption ? (
        <View style={styles.side}>
          {typeof value === 'string' || typeof value === 'number' ? <Text style={typography.rowAmount}>{value}</Text> : value}
          {valueCaption ? <Text style={typography.caption}>{valueCaption}</Text> : null}
        </View>
      ) : null}
      {chevron ? (
        <Svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none">
          <Path d="M9 5l7 7-7 7" stroke={colors.text2} strokeWidth={iconStroke} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </>
  );
  if (!onPress) return <View style={[styles.root, divider && styles.divider]}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.root, divider && styles.divider, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s3,
    minHeight: control.iconButton,
  },
  divider: { borderBottomWidth: lineWidth, borderBottomColor: colors.line },
  main: { flex: 1, minWidth: 0, gap: space.s1 / 2 },
  side: { alignItems: 'flex-end', gap: space.s1 / 2, flexShrink: 0 },
  pressed: { opacity: opacity.pressed },
});
