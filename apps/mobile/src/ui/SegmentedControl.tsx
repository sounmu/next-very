import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, control, lineWidth, opacity, radius, space, typography } from './tokens';

export type SegmentOption<T extends string> = { value: T; label: string };

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** DESIGN.md 8.4: white segments, selected one on the soft blue surface with bold text. */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.root} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.segment, selected && styles.selected, pressed && styles.pressed]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: space.s1,
    padding: space.s1,
    borderRadius: radius.full,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  segment: {
    flex: 1,
    minHeight: control.filterChipHeight,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.s3,
  },
  selected: { backgroundColor: colors.primary50 },
  pressed: { opacity: opacity.pressed },
  label: { ...typography.secondary, color: colors.text2 },
  labelSelected: { color: colors.text, fontWeight: '700' },
});
