import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { colors, control, fontSize, iconSize, iconStroke, lineWidth, space } from '@/ui';

type IconProps = { color: ColorValue };

/** 24px line icons (DESIGN.md 7), one path set per tab. */
function TabIcon({ color, d }: IconProps & { d: string[] }) {
  return (
    <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
      {d.map((path) => (
        <Path key={path} d={path} stroke={color} strokeWidth={iconStroke} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

const icons = {
  home: ['M4 10.5L12 4l8 6.5', 'M6 9v10h12V9', 'M10 19v-5h4v5'],
  records: ['M6 3h12v18l-3-2-3 2-3-2-3 2V3z', 'M9 8h6', 'M9 12h6'],
  compare: ['M4 19h16', 'M7 16v-5', 'M12 16V6', 'M17 16v-8'],
  shop: ['M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L19.5 8H6.2', 'M9 19.5h.01', 'M17 19.5h.01'],
} as const;

/** Bottom tabs, fixed order 홈 / 기록 / 비교 / 구매 (PRODUCT.md 탭 구조). Screens draw their own headers. */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text2,
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: '500' },
        tabBarStyle: {
          height: control.tabBarHeight + insets.bottom,
          paddingTop: space.s1,
          paddingBottom: insets.bottom,
          backgroundColor: colors.surface,
          borderTopWidth: lineWidth,
          borderTopColor: colors.line,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: ({ color }) => <TabIcon color={color} d={[...icons.home]} /> }} />
      <Tabs.Screen name="records" options={{ title: '기록', tabBarIcon: ({ color }) => <TabIcon color={color} d={[...icons.records]} /> }} />
      <Tabs.Screen name="compare" options={{ title: '비교', tabBarIcon: ({ color }) => <TabIcon color={color} d={[...icons.compare]} /> }} />
      <Tabs.Screen name="shop" options={{ title: '구매', tabBarIcon: ({ color }) => <TabIcon color={color} d={[...icons.shop]} /> }} />
    </Tabs>
  );
}
