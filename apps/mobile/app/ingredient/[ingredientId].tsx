import { useLocalSearchParams } from 'expo-router';

import { Card, Header, Notice, Screen } from '@/ui';

export default function IngredientTrendScreen() {
  const { ingredientId } = useLocalSearchParams<{ ingredientId: string }>();
  return (
    <Screen>
      <Header backLabel="원가 상세" title="재료 가격 추세" />
      <Card>
        <Notice align="center">준비 중</Notice>
        <Notice align="center">{`ingredientId: ${ingredientId}`}</Notice>
      </Card>
    </Screen>
  );
}
