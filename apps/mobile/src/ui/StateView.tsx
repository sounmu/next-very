import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { colors, space, typography } from './tokens';

export type StateViewProps = {
  kind: 'loading' | 'empty' | 'error';
  title: string;
  message?: string;
  /** e.g. "다시 시도", "영수증 등록". */
  actionLabel?: string;
  onAction?: () => void;
};

/** Loading, empty and error states (DESIGN.md 12). No fake numbers, the layout keeps its place. */
export function StateView({ kind, title, message, actionLabel, onAction }: StateViewProps) {
  return (
    <View style={styles.root} accessibilityLiveRegion={kind === 'error' ? 'assertive' : 'polite'}>
      {kind === 'loading' ? <ActivityIndicator color={colors.primary} /> : null}
      <Text style={[typography.bodyStrong, styles.center, kind === 'error' && styles.error]}>{title}</Text>
      {message ? <Text style={[typography.caption, styles.center]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button variant={kind === 'empty' ? 'primary' : 'secondary'} label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: space.s2, paddingVertical: space.s8, paddingHorizontal: space.s4 },
  center: { textAlign: 'center' },
  error: { color: colors.loss },
  action: { marginTop: space.s4, alignSelf: 'stretch' },
});
