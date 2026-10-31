import { LoginRequestSchema } from '@marginlog/core/src/api/auth';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api';
import { useSession } from '@/session/SessionProvider';
import { Button, Notice, Screen, TextField, colors, lineWidth, space, typography } from '@/ui';

function emailError(email: string): string | null {
  if (email.trim() === '') return '이메일을 입력해 주세요';
  return LoginRequestSchema.safeParse({ email }).success ? null : '이메일 형식을 확인해 주세요';
}

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : '로그인하지 못했어요. 다시 시도해 주세요';
}

export default function LoginScreen() {
  const { login, loginShowcase } = useSession();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);

  const emailMessage = submitted ? emailError(email) : null;
  const busy = pending || entering;

  async function submit() {
    if (busy) return;
    setSubmitted(true);
    setLoginError(null);
    if (emailError(email) !== null) return;
    setPending(true);
    try {
      await login(email.trim());
    } catch (error) {
      setLoginError(errorText(error));
      setPending(false);
    }
  }

  async function enterShowcase() {
    if (busy) return;
    setEntering(true);
    setEnterError(null);
    try {
      await loginShowcase();
    } catch (error) {
      setEnterError(errorText(error));
      setEntering(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brand}>
        <Text accessibilityRole="header" style={styles.logo}>
          마진로그
        </Text>
        <Text style={styles.tagline}>우리 가게 원가 관리, 여기서 시작하세요.</Text>
      </View>

      <TextField
        label="이메일"
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={emailMessage ?? undefined}
      />
      <Button label="로그인" onPress={submit} loading={pending} disabled={busy} />
      <Notice align="center">처음 쓰는 이메일이면 새 가게를 만들어요</Notice>
      {loginError ? <Text style={styles.error}>{loginError}</Text> : null}

      <View style={styles.demo}>
        <Button variant="secondary" label="시연 가게 둘러보기" onPress={enterShowcase} loading={entering} disabled={busy} />
        <Notice align="center">한끼식당 데이터로 둘러봐요</Notice>
        {enterError ? <Text style={styles.error}>{enterError}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.s10, gap: space.s4 },
  brand: { gap: space.s2, marginBottom: space.s4 },
  logo: { ...typography.title, color: colors.primary },
  tagline: { ...typography.body, color: colors.text2 },
  demo: { gap: space.s2, marginTop: space.s4, paddingTop: space.s6, borderTopWidth: lineWidth, borderTopColor: colors.line },
  error: { ...typography.caption, color: colors.loss, textAlign: 'center' },
});
