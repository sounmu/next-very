import { useLocalSearchParams } from 'expo-router';

import { Card, Header, Notice, Screen } from '@/ui';

export default function InvoiceDoneScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  return (
    <Screen>
      <Header title="메뉴 원가가 갱신됐어요" />
      <Card>
        <Notice align="center">준비 중</Notice>
        <Notice align="center">{`invoiceId: ${invoiceId}`}</Notice>
      </Card>
    </Screen>
  );
}
