import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, control, lineWidth, opacity, radius, space, typography } from './tokens';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  /** primary: black pill. secondary: white with a border. */
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
        disabled && (primary ? styles.disabledPrimary : styles.disabled),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.surface : colors.text} />
      ) : (
        <Text style={[styles.label, primary ? styles.labelPrimary : styles.labelSecondary, disabled && primary && styles.labelDisabled]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: control.buttonHeight,
    borderRadius: radius.full,
    paddingHorizontal: space.s5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.action },
  primaryPressed: { backgroundColor: colors.actionPressed },
  secondary: {
    height: control.secondaryButtonHeight,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: lineWidth,
    borderColor: colors.line,
  },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
  disabledPrimary: { backgroundColor: colors.disabledBg },
  label: typography.button,
  labelPrimary: { color: colors.surface },
  labelSecondary: { color: colors.text },
  labelDisabled: { color: colors.disabledText },
});
