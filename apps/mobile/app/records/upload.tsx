import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useUploadInvoice } from '@/api/records';
import { Button, Card, Header, Notice, Screen, colors, iconSize, iconStroke, lineWidth, radius, space, typography } from '@/ui';

type Picked = { uri: string };

const LONG_SIDE = 1600;

/** Long side down to 1600px, JPEG 0.8, so uploads stay well under the server's 4MB limit. */
async function prepareImage(uri: string): Promise<string> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const long = Math.max(original.width, original.height);
  const context = ImageManipulator.manipulate(original);
  if (long > LONG_SIDE) {
    context.resize(original.width >= original.height ? { width: LONG_SIDE } : { height: LONG_SIDE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

export default function ReceiptUploadScreen() {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const upload = useUploadInvoice();
  const busy = preparing || upload.isPending;

  async function pick(source: 'camera' | 'library') {
    setError(null);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('카메라 권한이 필요해요. 설정에서 허용하거나 앨범에서 선택해 주세요.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1 };
      const result =
        source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || result.assets.length === 0) return;
      setPicked({ uri: result.assets[0].uri });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '사진을 불러오지 못했어요');
    }
  }

  async function submit() {
    if (!picked) return;
    setError(null);
    setPreparing(true);
    let uri: string;
    try {
      uri = await prepareImage(picked.uri);
    } catch {
      setPreparing(false);
      setError('사진을 준비하지 못했어요. 다른 사진을 골라 주세요.');
      return;
    }
    setPreparing(false);
    upload.mutate(
      { uri, mimeType: 'image/jpeg', fileName: 'receipt.jpg' },
      {
        onSuccess: ({ invoice }) =>
          router.replace({ pathname: '/records/[invoiceId]/review', params: { invoiceId: invoice.id } }),
        onError: (cause) => setError(`업로드하지 못했어요. ${cause.message}`),
      },
    );
  }

  return (
    <Screen
      actions={
        <Button
          label={busy ? '구매 내역을 읽고 있어요' : '이 사진에서 품목 읽기'}
          onPress={submit}
          disabled={!picked || busy}
        />
      }
    >
      <Header backLabel="구매 기록" title="영수증 등록" />

      <Card>
        <View style={styles.photo}>
          {picked ? (
            <Image source={{ uri: picked.uri }} style={styles.image} resizeMode="contain" accessibilityLabel="선택한 영수증 사진" />
          ) : (
            <View style={styles.placeholder}>
              <Svg width={iconSize.lg * 2} height={iconSize.lg * 2} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 8h3l2-3h6l2 3h3v11H4z"
                  stroke={colors.text2}
                  strokeWidth={iconStroke}
                  strokeLinejoin="round"
                />
                <Circle cx={12} cy={13} r={3.5} stroke={colors.text2} strokeWidth={iconStroke} />
              </Svg>
              <Text style={[typography.secondary, styles.center]}>영수증이나 거래명세서 사진을 골라 주세요</Text>
            </View>
          )}
          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={colors.primary} />
              <Text style={typography.bodyStrong}>구매 내역을 읽고 있어요</Text>
              <Text style={typography.caption}>품목, 수량, 금액을 찾는 중이에요</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.pickActions}>
          <Button label="사진 촬영" variant="secondary" onPress={() => pick('camera')} disabled={busy} style={styles.flex} />
          <Button label="앨범에서 선택" variant="secondary" onPress={() => pick('library')} disabled={busy} style={styles.flex} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <Card variant="emphasis">
        <Text style={typography.body}>
          결제 총액만 있는 사진은 단가 분석이 어려워요. 품목·수량이 보이는 영수증이나 주문내역을 올려 주세요.
        </Text>
      </Card>
      <Notice>읽은 결과는 저장하기 전에 한 번 더 확인해요. 인식하지 못한 값은 비워 두고 표시해요.</Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    aspectRatio: 3 / 4,
    width: '100%',
    borderRadius: radius.md,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.subtle,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.s3, padding: space.s5 },
  busy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s2,
    backgroundColor: colors.primary50,
  },
  center: { textAlign: 'center' },
  pickActions: { flexDirection: 'row', gap: space.s2, marginTop: space.s4 },
  flex: { flex: 1 },
  error: { ...typography.caption, color: colors.loss, marginTop: space.s3 },
});
