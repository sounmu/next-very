import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, space, typography } from './tokens';

export type CardProps = {
  children: ReactNode;
  /** 'emphasis' is the wireframe's bold-border card (alert, key number): primary-50 background, no shadow. */
  variant?: 'default' | 'emphasis';
  /** Small grey caption above the content (tokens.css .card-title). */
  title?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, variant = 'default', title, style }: CardProps) {
  return (
    <View style={[styles.base, variant === 'emphasis' ? styles.emphasis : styles.default, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, padding: space.s4 },
  default: { backgroundColor: colors.surface, ...shadow.card },
  emphasis: { backgroundColor: colors.primary50 },
  title: { ...typography.cardTitle, marginBottom: space.s2 },
});
