import { PRESETS } from '@marginlog/core/src/presets';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useSession } from '@/session/SessionProvider';
import { Button, Card, Header, Row, Screen, SectionHeader, Sheet, colors, typography } from '@/ui';

export default function MyPageScreen() {
  const { logout, store, user } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState(false);

  async function logOut() {
    if (leaving) return;
    setLeaving(true);
    setLeaveError(false);
    try {
      await logout();
    } catch (error) {
      console.warn('[mypage] could not log out', error);
      setLeaveError(true);
      setLeaving(false);
    }
  }

  return (
    <Screen>
      <Header backLabel="홈" title="마이페이지" />

      <SectionHeader title="가게" />
      <Card>
        <Row label="가게 이름" value={store?.name ?? ''} />
        <Row label="시작 데이터" value={store ? PRESETS[store.preset].label : ''} divider={false} />
      </Card>

      <SectionHeader title="계정" />
      <Card>
        <Row label="계정" value={user?.email ?? ''} divider={false} />
      </Card>

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
          로그인 화면으로 돌아가요.
        </Text>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { ...typography.caption, color: colors.loss, textAlign: 'center' },
});
