import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useDeletePurchase, usePurchase, useUpdatePurchase } from '@/api/records';
import { Button, Card, Chip, Header, Screen, Sheet, StateView, colors, space, typography } from '@/ui';

import { PurchaseForm } from './new';

export default function PurchaseEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { purchase, isPending, isError, error, refetch } = usePurchase(id);
  const update = useUpdatePurchase(id);
  const remove = useDeletePurchase(id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const header = <Header backLabel="구매 기록" title="구매 기록 수정" />;

  if (isPending || isError || !purchase) {
    return (
      <Screen>
        {header}
        <Card>
          {isPending ? (
            <StateView kind="loading" title="구매 기록을 불러오고 있어요" />
          ) : isError ? (
            <StateView kind="error" title="구매 기록을 불러오지 못했어요" message={error.message} actionLabel="다시 시도" onAction={() => refetch()} />
          ) : (
            <StateView kind="empty" title="이 구매 기록을 찾을 수 없어요" message="삭제됐을 수 있어요." actionLabel="기록으로" onAction={() => router.replace('/records')} />
          )}
        </Card>
      </Screen>
    );
  }

  return (
    <>
      <PurchaseForm
        header={header}
        banner={
          purchase.source === 'order' ? (
            <Card variant="emphasis" style={styles.banner}>
              <Chip label="데모" tone="demo" />
              <Text style={typography.secondary}>데모 주문에서 반영된 기록이에요</Text>
            </Card>
          ) : null
        }
        initial={{
          ingredientId: purchase.ingredientId,
          supplierName: purchase.supplierName,
          date: purchase.date,
          packSize: purchase.packSize,
          packUnit: purchase.packUnit,
          quantity: purchase.quantity,
          amount: purchase.amount,
        }}
        submitLabel="수정 저장"
        saving={update.isPending}
        error={update.error ? `저장하지 못했어요. ${update.error.message}` : null}
        onSubmit={({ supplier, ...values }) =>
          update.mutate(
            { ...values, ...('id' in supplier ? { supplierId: supplier.id } : { supplierName: supplier.name }) },
            { onSuccess: () => router.replace('/records') },
          )
        }
        extraActions={<Button label="이 기록 삭제" variant="secondary" onPress={() => setConfirmDelete(true)} />}
      />
      <Sheet
        visible={confirmDelete}
        title="구매 기록을 삭제할까요?"
        onClose={() => {
          setConfirmDelete(false);
          remove.reset();
        }}
        actions={
          <>
            {remove.error ? <Text style={styles.error}>{remove.error.message}</Text> : null}
            <Button
              label="삭제"
              loading={remove.isPending}
              onPress={() => remove.mutate(undefined, { onSuccess: () => router.replace('/records') })}
            />
            <Button label="취소" variant="secondary" onPress={() => setConfirmDelete(false)} />
          </>
        }
      >
        <Text style={typography.body}>
          {`${purchase.ingredientName} ${purchase.supplierName} 구매 기록을 지워요. 이 재료의 단가와 메뉴 원가가 다시 계산돼요.`}
        </Text>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.s2, paddingVertical: space.s3 },
  error: { ...typography.caption, color: colors.loss, textAlign: 'center' },
});
