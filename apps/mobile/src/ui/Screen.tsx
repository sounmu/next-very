import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, control, lineWidth, space } from './tokens';

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
  column: { flex: 1, width: '100%', maxWidth: control.maxContentWidth, alignSelf: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.s5, paddingBottom: space.s6, gap: space.s3 },
  actions: {
    paddingHorizontal: space.s5,
    paddingTop: space.s3,
    gap: space.s2,
    backgroundColor: colors.surface,
    borderTopWidth: lineWidth,
    borderTopColor: colors.line,
  },
});
