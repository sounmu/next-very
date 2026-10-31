import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, control, iconSize, iconStroke, opacity } from '@/ui';

export function MyPageButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="마이페이지"
      onPress={() => router.push('/mypage')}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={8} r={4} stroke={colors.text} strokeWidth={iconStroke} />
        <Path d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5" stroke={colors.text} strokeWidth={iconStroke} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: control.iconButton, height: control.iconButton, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: opacity.pressed },
});
