import { Card, Header, Screen, StateView } from '@/ui';

/** A new store's 기록 / 비교 / 구매 tab before the server keeps per-store data (phase 2). */
export function NewStoreEmpty({ title, emptyTitle, message }: { title: string; emptyTitle: string; message: string }) {
  return (
    <Screen>
      <Header title={title} />
      <Card>
        <StateView kind="empty" title={emptyTitle} message={message} />
      </Card>
    </Screen>
  );
}
