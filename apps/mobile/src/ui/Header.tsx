import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, control, iconSize, iconStroke, opacity, space, typography } from './tokens';

export type HeaderProps = {
  title: string;
  subtitle?: string;
  /** Label of the back button, usually the previous screen's name. Omit to render no back button. */
  backLabel?: string;
  /** Replaces the default back behaviour (router.back, or replace('/') when there is no history). */
  onBack?: () => void;
  /** 01 binds the demo reset to a long press on the title. */
  onTitleLongPress?: () => void;
  /** Element on the right of the title row (an icon button, a chip). */
  right?: ReactNode;
};

function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

/** Screen title block. Screens draw this themselves; the Stack header is hidden. */
export function Header({ title, subtitle, backLabel, onBack, onTitleLongPress, right }: HeaderProps) {
  return (
    <View style={styles.root}>
      {backLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          onPress={onBack ?? goBack}
          hitSlop={space.s2}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
            <Path d="M15 5l-7 7 7 7" stroke={colors.text} strokeWidth={iconStroke} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={styles.backLabel}>{backLabel}</Text>
        </Pressable>
      ) : null}
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <Text accessibilityRole="header" style={backLabel ? typography.detailTitle : typography.title} onLongPress={onTitleLongPress}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: space.s2, paddingBottom: space.s3, gap: space.s1 },
  back: {
    alignSelf: 'flex-start',
    minHeight: control.iconButton,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    marginLeft: -space.s1,
  },
  backLabel: { ...typography.body, color: colors.text, fontWeight: '500' },
  pressed: { opacity: opacity.pressed },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s3 },
  titles: { flex: 1, gap: space.s1 },
  subtitle: { ...typography.body, color: colors.text2 },
});
