import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, control, opacity, radius, space } from './tokens';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  /** primary: filled teal (.btn-primary). secondary: primary-50 tint with teal text (.btn-secondary). */
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  /** Shows a spinner in place of the label and blocks presses. */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', disabled = false, loading = false, style }: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? (pressed ? styles.primaryPressed : styles.primary) : styles.secondary,
        !primary && pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.surface : colors.primary} />
      ) : (
        <Text style={[styles.label, primary ? styles.labelPrimary : styles.labelSecondary]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: control.buttonHeight,
    borderRadius: radius.md,
    paddingHorizontal: space.s4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primary600 },
  secondary: { backgroundColor: colors.primary50 },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
  label: { fontSize: control.buttonFontSize, fontWeight: '700' },
  labelPrimary: { color: colors.surface },
  labelSecondary: { color: colors.primary },
});
