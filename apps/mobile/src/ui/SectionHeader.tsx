import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, control, opacity, space, typography } from './tokens';

export type SectionHeaderProps = {
  title: string;
  /** Text action on the right, e.g. "전체 보기", "메뉴 추가". */
  actionLabel?: string;
  onAction?: () => void;
};

/** Section title with an optional right text action (DESIGN.md 2 "섹션명과 오른쪽 전체 보기"). */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.root}>
      <Text accessibilityRole="header" style={[typography.sectionTitle, styles.title]}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={space.s2}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: space.s3, minHeight: control.iconButton },
  title: { flex: 1 },
  action: { minHeight: control.iconButton, justifyContent: 'center' },
  actionLabel: { ...typography.secondary, color: colors.text },
  pressed: { opacity: opacity.pressed },
});
