import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { typography } from './tokens';

export type NoticeProps = {
  children: ReactNode;
  align?: 'left' | 'center';
  style?: StyleProp<TextStyle>;
};

/** Small grey disclaimer, e.g. "식재료 원가 기준 · 인건비 등 제외". */
export function Notice({ children, align = 'left', style }: NoticeProps) {
  return <Text style={[styles.text, align === 'center' && styles.center, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: typography.caption,
  center: { textAlign: 'center' },
});
