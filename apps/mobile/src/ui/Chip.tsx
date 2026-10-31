import { StyleSheet, Text, View } from 'react-native';

import { colors, control, radius, space, typography } from './tokens';

export type ChipTone = 'neutral' | 'info' | 'warning' | 'error' | 'demo';

export type ChipProps = {
  label: string;
  tone?: ChipTone;
};

/** Small status label, e.g. "확인 필요", "데모". Color is never the only signal: the label carries the meaning. */
export function Chip({ label, tone = 'neutral' }: ChipProps) {
  return (
    <View style={[styles.base, surfaces[tone]]}>
      <Text style={[styles.label, labels[tone]]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    minHeight: control.chipHeight,
    paddingHorizontal: space.s2,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  label: { ...typography.caption, fontWeight: '600' },
});

const surfaces = StyleSheet.create({
  neutral: { backgroundColor: colors.subtle },
  info: { backgroundColor: colors.primary50 },
  warning: { backgroundColor: colors.accent50 },
  error: { backgroundColor: colors.loss50 },
  demo: { backgroundColor: colors.accent50 },
});

const labels = StyleSheet.create({
  neutral: { color: colors.text2 },
  info: { color: colors.primary },
  warning: { color: colors.warn },
  error: { color: colors.loss },
  demo: { color: colors.warn },
});
