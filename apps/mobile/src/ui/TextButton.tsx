import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, control, opacity, space, typography } from './tokens';

export type TextButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
};

/** DESIGN.md 8.2 text button: no surface, bold label, 44px touch target. */
export function TextButton({ label, onPress, tone = 'default', disabled = false }: TextButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={space.s2}
      style={({ pressed }) => [styles.root, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.label, tone === 'primary' && styles.primary, tone === 'danger' && styles.danger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: control.iconButton, justifyContent: 'center' },
  label: { ...typography.secondary, color: colors.text, fontWeight: '600' },
  primary: { color: colors.primary },
  danger: { color: colors.loss },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
});
