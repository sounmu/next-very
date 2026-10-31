import { Card, Header, Notice, Screen } from '@/ui';

export default function MenuListScreen() {
  return (
    <Screen>
      <Header title="우리 가게 메뉴" subtitle="최근 매입가격을 반영한 1인분 원가" />
      <Card>
        <Notice align="center">준비 중</Notice>
      </Card>
    </Screen>
  );
}
