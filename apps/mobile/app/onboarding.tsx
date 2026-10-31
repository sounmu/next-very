import type { NewStorePreset } from '@marginlog/core/src/api/auth';
import { PRESETS } from '@marginlog/core/src/presets';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ApiError } from '@/api';
import { useSession } from '@/session/SessionProvider';
import { Button, Header, Notice, Screen, TextField, colors, iconSize, iconStroke, lineWidth, opacity, radius, space, typography } from '@/ui';

const CHOICES: NewStorePreset[] = ['pasta', 'pizza', 'gimbap'];

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : '잠시 후 다시 시도해 주세요';
}

export default function OnboardingScreen() {
  const { createStore, logout } = useSession();
  const [name, setName] = useState('');
  const [preset, setPreset] = useState<NewStorePreset | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = name.trim() !== '' && preset !== null;

  async function submit() {
    if (!ready || preset === null || pending) return;
    setPending(true);
    setError(null);
    try {
      await createStore({ name: name.trim(), preset });
    } catch (cause) {
      setError(`가게를 만들지 못했어요. ${errorText(cause)}`);
      setPending(false);
    }
  }

  async function toLogin() {
    try {
      await logout();
    } catch (cause) {
      setError(`로그인 화면으로 돌아가지 못했어요. ${errorText(cause)}`);
    }
  }

  return (
    <Screen
      actions={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={error ? '다시 시도' : '우리 가게 시작하기'} onPress={submit} loading={pending} disabled={!ready || pending} />
        </>
      }
    >
      <Header backLabel="로그인" onBack={toLogin} title="어떤 가게로 시작할까요?" />

      <TextField
        label="가게 이름"
        value={name}
        onChangeText={setName}
        placeholder={preset ? PRESETS[preset].name : '가게 이름을 입력해 주세요'}
      />

      <View accessibilityRole="radiogroup" style={styles.choices}>
        {CHOICES.map((id) => {
          const item = PRESETS[id];
          const selected = preset === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={`${item.label}, ${item.description}`}
              onPress={() => setPreset(id)}
              style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}
            >
              <View style={styles.cardText}>
                <Text style={typography.bodyStrong}>{item.label}</Text>
                <Text style={typography.secondary}>{item.description}</Text>
              </View>
              {selected ? (
                <Svg width={iconSize.lg} height={iconSize.lg} viewBox="0 0 24 24" fill="none">
                  <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={colors.primary} strokeWidth={iconStroke} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Notice>고른 가게의 메뉴·재고·구매 기록이 미리 들어 있어요. 원가와 정산을 바로 볼 수 있어요.</Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  choices: { gap: space.s3 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: space.s4,
    borderRadius: radius.lg,
    borderWidth: lineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  cardText: { flex: 1, gap: space.s1 },
  pressed: { opacity: opacity.pressed },
  error: { ...typography.caption, color: colors.loss, textAlign: 'center' },
});
