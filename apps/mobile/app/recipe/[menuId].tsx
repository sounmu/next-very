import { useLocalSearchParams } from 'expo-router';

import { Card, Header, Notice, Screen } from '@/ui';

export default function RecipeEditScreen() {
  const { menuId } = useLocalSearchParams<{ menuId: string }>();
  return (
    <Screen>
      <Header backLabel="메뉴 목록" title="메뉴·레시피 등록" />
      <Card>
        <Notice align="center">준비 중</Notice>
        <Notice align="center">{`menuId: ${menuId}`}</Notice>
      </Card>
    </Screen>
  );
}
