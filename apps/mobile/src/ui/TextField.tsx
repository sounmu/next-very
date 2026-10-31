import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { colors, control, lineWidth, radius, space, typography } from './tokens';

export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Unit shown inside the field on the right, e.g. "원", "g". */
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
  /** Error message under the field; also draws the error border. */
  error?: string;
  /** Grey help text under the field (hidden while an error shows). */
  hint?: string;
  /** Amounts align right (DESIGN.md 8.3). */
  align?: 'left' | 'right';
};

/** DESIGN.md 8.3: label above, 52 high subtle field, 2px accent border on focus, 1px error border. */
export function TextField({ label, value, onChangeText, placeholder, suffix, keyboardType, error, hint, align = 'left' }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.root}>
      <Text style={typography.secondary}>{label}</Text>
      <View style={[styles.box, error ? styles.boxError : null, focused && styles.boxFocused]}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text3}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, align === 'right' && styles.right]}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={typography.caption}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.s2 },
  box: {
    minHeight: control.inputHeight,
    borderRadius: radius.md,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.subtle,
    paddingHorizontal: space.s4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  boxError: { borderColor: colors.loss },
  /** 2px border; padding shrinks by the extra 1px so the text does not shift. */
  boxFocused: { borderWidth: lineWidth * 2, borderColor: colors.primary, paddingHorizontal: space.s4 - lineWidth },
  /** outlineWidth 0: the box draws the focus border, so web's default outline is dropped. */
  input: { flex: 1, minWidth: 0, ...typography.body, color: colors.text, paddingVertical: 0, outlineStyle: 'solid', outlineWidth: 0 },
  right: { textAlign: 'right' },
  suffix: typography.secondary,
  error: { ...typography.caption, color: colors.loss },
});
