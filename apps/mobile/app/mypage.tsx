import { INDUSTRIES } from '@marginlog/core';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useSession } from '@/session/SessionProvider';
import { Button, Card, Header, Notice, Row, Screen, SectionHeader, Sheet, colors, typography } from '@/ui';

export default function MyPageScreen() {
  const { mode, store, menus, leave } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState(false);

  async function logOut() {
    if (leaving) return;
    setLeaving(true);
    setLeaveError(false);
    try {
      await leave();
    } catch (error) {
      console.warn('[mypage] could not log out', error);
      setLeaveError(true);
      setLeaving(false);
    }
  }

  const industry = store ? INDUSTRIES.find((item) => item.id === store.industry)?.name : undefined;

  return (
    <Screen>
      <Header backLabel="홈" title="마이페이지" />

      <SectionHeader title="가게" />
      <Card>
        {mode === 'demo' && store ? (
          <>
            <Row label="가게 이름" value={store.name} />
            <Row label="지역" value={`${store.sido} ${store.sigungu}`} />
            <Row label="업종" value={industry ?? '-'} />
            <Row label="등록된 메뉴" value={`${menus.length}개`} divider={false} />
          </>
        ) : (
          <>
            <Row label="가게 이름" value="한끼식당" />
            <Row label="구분" value="시연 가게" divider={false} />
          </>
        )}
      </Card>

      <SectionHeader title="계정" />
      <Card>
        <Row label="로그인" value={mode === 'demo' ? '이 기기에서만 사용 중' : '시연 가게 둘러보는 중'} divider={false} />
      </Card>
      <Notice>계정 로그인은 아직 서버에 연결되지 않았어요.</Notice>

      <Button variant="secondary" label="로그아웃" onPress={() => setConfirming(true)} />

      <Sheet
        visible={confirming}
        title="로그아웃할까요?"
        onClose={() => setConfirming(false)}
        actions={
          <>
            {leaveError ? <Text style={styles.error}>로그아웃하지 못했어요. 다시 시도해 주세요</Text> : null}
            <Button label="로그아웃" onPress={logOut} loading={leaving} disabled={leaving} />
            <Button label="취소" variant="secondary" onPress={() => setConfirming(false)} disabled={leaving} />
          </>
        }
      >
        <Text style={typography.body}>
          {mode === 'demo'
            ? '이 기기에 가게 정보, 메뉴, 재고는 남아 있어요. 데모로 시작하기를 누르면 이어서 쓸 수 있어요.'
            : '로그인 화면으로 돌아가요.'}
        </Text>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { ...typography.caption, color: colors.loss, textAlign: 'center' },
});
