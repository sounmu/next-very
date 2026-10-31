import { useLocalSearchParams } from 'expo-router';

import { Card, Header, Notice, Screen } from '@/ui';

export default function SupplierNewScreen() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();
  return (
    <Screen>
      <Header backLabel="가격 추세" title="다른 구매처 등록" />
      <Card>
        <Notice align="center">준비 중</Notice>
        <Notice align="center">{`ingredientId: ${ingredientId}`}</Notice>
      </Card>
    </Screen>
  );
}
