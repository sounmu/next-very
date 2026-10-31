import { useLocalSearchParams } from 'expo-router';

import { Card, Header, Notice, Screen } from '@/ui';

export default function InvoiceReviewScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  return (
    <Screen>
      <Header backLabel="명세서 등록" title="매입 내역 확인" />
      <Card>
        <Notice align="center">준비 중</Notice>
        <Notice align="center">{`invoiceId: ${invoiceId}`}</Notice>
      </Card>
    </Screen>
  );
}
