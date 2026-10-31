import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { colors, control, iconSize, iconStroke, opacity, radius, shadow, space, typography } from './tokens';

export type SheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Fixed bottom slot, usually the apply button. Keep pending choices in local state until it is pressed. */
  actions?: ReactNode;
};

/** DESIGN.md 8.8 bottom sheet: white, top radius 28, padding 20, title 20, max 90% height, scrim behind. */
export function Sheet({ visible, title, onClose, children, actions }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" style={styles.scrim} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.s5) }]}>
          <View style={styles.head}>
            <Text accessibilityRole="header" style={[typography.detailTitle, styles.title]}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
                <Path d="M6 6l12 12M18 6L6 18" stroke={colors.text} strokeWidth={iconStroke} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    width: '100%',
    maxWidth: control.maxContentWidth,
    alignSelf: 'center',
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.s5,
    gap: space.s4,
    ...shadow.sheet,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  title: { flex: 1 },
  close: {
    width: control.iconButton,
    height: control.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -space.s3,
  },
  pressed: { opacity: opacity.pressed },
  body: { flexGrow: 0 },
  bodyContent: { gap: space.s3 },
  actions: { gap: space.s2 },
});
