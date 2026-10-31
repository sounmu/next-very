import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, space, typography } from './tokens';

export type CardProps = {
  children: ReactNode;
  /** highlight: the one key cost card per screen (DESIGN.md bg.highlight). emphasis: soft blue info surface. */
  variant?: 'default' | 'emphasis' | 'highlight';
  /** Small grey caption above the content (tokens.css .card-title). */
  title?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, variant = 'default', title, style }: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, padding: space.s5 },
  default: { backgroundColor: colors.surface, ...shadow.card },
  emphasis: { backgroundColor: colors.primary50 },
  highlight: { backgroundColor: colors.accent, borderRadius: radius.xl },
  title: { ...typography.cardTitle, marginBottom: space.s2 },
});
