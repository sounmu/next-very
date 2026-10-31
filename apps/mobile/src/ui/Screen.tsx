import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors, control, glass, lineWidth, space } from './tokens';

/** Soft blue glow behind the glass cards (DESIGN.md 7). Purely decorative. */
function Backdrop() {
  return (
    <View style={styles.backdrop}>
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMin slice">
        <Defs>
          <RadialGradient id="glowA" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.glow} stopOpacity={0.55} />
            <Stop offset="1" stopColor={colors.glow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glowB" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.glow2} stopOpacity={0.45} />
            <Stop offset="1" stopColor={colors.glow2} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={350} cy={40} r={260} fill="url(#glowA)" />
        <Circle cx={10} cy={430} r={250} fill="url(#glowB)" />
        <Circle cx={380} cy={800} r={230} fill="url(#glowA)" />
      </Svg>
    </View>
  );
}

export type ScreenProps = {
  children: ReactNode;
  /**
   * Fixed slot below the scroll area for the screen's call-to-action buttons
   * (tokens.css .bottom-cta). Children stack vertically with an s2 gap.
   */
  actions?: ReactNode;
  /** Extra style for the scroll content container (default: s4 side padding, s3 gap). */
  contentStyle?: StyleProp<ViewStyle>;
};

/** Safe area + scrolling content + optional bottom actions. Every route renders one. */
export function Screen({ children, actions, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <Backdrop />
      <View style={styles.column}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          actions ? null : { paddingBottom: insets.bottom + space.s6 },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {actions ? (
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, space.s3) }]}>{actions}</View>
      ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
  column: { flex: 1, width: '100%', maxWidth: control.maxContentWidth, alignSelf: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.s5, paddingBottom: space.s6, gap: space.s3 },
  actions: {
    paddingHorizontal: space.s5,
    paddingTop: space.s3,
    gap: space.s2,
    ...glass,
    borderWidth: 0,
    borderTopWidth: lineWidth,
    borderTopColor: colors.line,
  },
});
