import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from './Chip';
import { colors, radius, space, typography } from './tokens';

export type DemoNoticeProps = {
  /** What is demo, e.g. "공급처 상품과 가격은 시연용 데이터예요". */
  children: ReactNode;
};

/** Small strip that marks the data on screen as demo (catalog, orders, demo OCR extract). */
export function DemoNotice({ children }: DemoNoticeProps) {
  return (
    <View style={styles.root} accessibilityRole="text">
      <Chip label="데모" tone="demo" />
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    paddingVertical: space.s2,
    paddingHorizontal: space.s3,
    borderRadius: radius.sm,
    backgroundColor: colors.subtle,
  },
  text: { ...typography.caption, flex: 1, color: colors.text2 },
});
