import { seed } from '@marginlog/core';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { useCreateInvoice, type InvoiceImageFile } from '@/api/invoice';
import {
  Button,
  Card,
  Header,
  Notice,
  Row,
  Screen,
  colors,
  formatWon,
  lineWidth,
  radius,
  space,
  typography,
} from '@/ui';

const UPLOAD_LONG_SIDE_PX = 1600;
const UPLOAD_JPEG_QUALITY = 0.8;

const demo = seed.demoExtract;
const demoItem = demo.items[0];

function monthDay(isoDate: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(isoDate);
  return match ? `${match[1]}/${match[2]}` : isoDate;
}

async function resizeForUpload(asset: ImagePicker.ImagePickerAsset): Promise<InvoiceImageFile> {
  const context = ImageManipulator.manipulate(asset.uri);
  let { width, height } = asset;
  if (!(width > 0 && height > 0)) {
    const probe = await context.renderAsync();
    ({ width, height } = probe);
  }
  if (Math.max(width, height) > UPLOAD_LONG_SIDE_PX) {
    context.resize(width >= height ? { width: UPLOAD_LONG_SIDE_PX } : { height: UPLOAD_LONG_SIDE_PX });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: UPLOAD_JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri, name: 'invoice.jpg', type: 'image/jpeg' };
}

export default function InvoiceNewScreen() {
  const [image, setImage] = useState<InvoiceImageFile | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const create = useCreateInvoice();

  const busy = preparing || create.isPending;

  async function choose(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    setPreparing(true);
    setPickError(null);
    create.reset();
    try {
      setImage(await resizeForUpload(asset));
    } catch {
      setPickError('사진을 불러오지 못했어요. 다시 선택해 주세요.');
    } finally {
      setPreparing(false);
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPickError('카메라 권한이 필요해요. 설정에서 허용해 주세요.');
      return;
    }
    await choose(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 }));
  }

  async function pickFromLibrary() {
    await choose(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }));
  }

  function extract() {
    if (!image) return;
    create.mutate(image, {
      onSuccess: ({ invoice }) =>
        router.push({ pathname: '/invoice/[invoiceId]/review', params: { invoiceId: invoice.id } }),
    });
  }

  return (
    <Screen
      actions={
        <>
          {create.isPending ? <Notice align="center">품목을 읽고 있어요</Notice> : null}
          {create.isError ? (
            <Notice align="center" style={styles.error}>
              {create.error.message}
            </Notice>
          ) : null}
          <Button
            label={create.isError ? '다시 시도' : '이 사진에서 품목 읽기'}
            onPress={extract}
            disabled={!image || preparing}
            loading={create.isPending}
          />
          <Notice align="center">결제 총액만 있는 사진은 단가 분석이 어려워요.</Notice>
        </>
      }
    >
      <Header backLabel="뒤로" title="거래명세서 등록" subtitle="새 매입가격을 메뉴 원가에 반영해요." />

      <Card>
        <View style={styles.photoFrame}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.photo} resizeMode="cover" accessibilityLabel="선택한 거래명세서 사진" />
          ) : (
            <Text style={styles.placeholder}>[ 거래명세서 사진 ]</Text>
          )}
          {preparing ? (
            <View style={styles.photoOverlay}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null}
        </View>
        <Notice style={styles.photoHint}>품목 · 규격 · 수량 · 금액이 모두 보이도록 촬영해 주세요.</Notice>
        {pickError ? <Notice style={styles.error}>{pickError}</Notice> : null}
        <View style={styles.pickRow}>
          <Button label="사진 촬영" variant="secondary" onPress={takePhoto} disabled={busy} style={styles.pickButton} />
          <Button
            label="앨범에서 선택"
            variant="secondary"
            onPress={pickFromLibrary}
            disabled={busy}
            style={styles.pickButton}
          />
        </View>
      </Card>

      <Card>
        <Text accessibilityRole="header" style={styles.cardHeading}>
          시연할 명세서
        </Text>
        <Text style={styles.demoSupplier}>
          {demo.supplier}
          <Text style={styles.demoDate}>{` · ${monthDay(demo.date)}`}</Text>
        </Text>
        {demoItem ? (
          <Row
            label={`${demoItem.rawName} ${demoItem.packWeightG === null ? '' : `${demoItem.packWeightG / 1000}kg `}× ${demoItem.quantity}`}
          />
        ) : null}
        <Row label="합계" value={formatWon(demo.total)} bold divider={false} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoFrame: {
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.subtle,
  },
  placeholder: { ...typography.caption, textAlign: 'center', paddingHorizontal: space.s4 },
  photoHint: { marginTop: space.s3 },
  error: { color: colors.loss, marginTop: space.s2 },
  pickRow: { flexDirection: 'row', gap: space.s2, marginTop: space.s3 },
  pickButton: { flex: 1 },
  cardHeading: { ...typography.sectionTitle, marginBottom: space.s3 },
  demoSupplier: { ...typography.bodyStrong, marginBottom: space.s1 },
  demoDate: { ...typography.caption, fontWeight: '400' },
});
