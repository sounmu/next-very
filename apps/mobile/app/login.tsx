import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { emailError, signInWithEmail } from '@/session/auth';
import { useSession } from '@/session/SessionProvider';
import { Button, Notice, Screen, TextButton, TextField, colors, lineWidth, space, typography } from '@/ui';

export default function LoginScreen() {
  const { startShowcase } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);

  const emailMessage = submitted ? emailError(email) : null;
  const passwordMessage = submitted && password === '' ? '비밀번호를 입력해 주세요' : null;

  async function submit() {
    if (pending) return;
    setSubmitted(true);
    setAuthError(null);
    if (emailError(email) !== null || password === '') return;
    setPending(true);
    try {
      const result = await signInWithEmail(email.trim(), password);
      if (!result.ok) setAuthError(result.message);
    } finally {
      setPending(false);
    }
  }

  async function enter(start: () => Promise<void>) {
    if (entering) return;
    setEntering(true);
    setEnterError(null);
    try {
      await start();
    } catch {
      setEnterError('시작하지 못했어요. 다시 시도해 주세요');
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
      <TextField
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoComplete="current-password"
        error={passwordMessage ?? undefined}
        accessory={<TextButton label={showPassword ? '숨기기' : '표시'} onPress={() => setShowPassword((value) => !value)} />}
      />
      {authError ? <Text style={styles.warn}>{authError}</Text> : null}
      <Button label="로그인" onPress={submit} loading={pending} disabled={pending} />

      <View style={styles.link}>
        <Text style={typography.secondary}>처음이신가요?</Text>
        <TextButton label="회원가입" tone="primary" onPress={() => router.push('/signup')} />
      </View>

      <View style={styles.demo}>
        <Button variant="secondary" label="시연 가게 둘러보기" onPress={() => enter(startShowcase)} disabled={entering} />
        <Notice align="center">계정 없이 한끼식당 데이터로 둘러봐요</Notice>
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
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s1 },
  demo: { gap: space.s2, marginTop: space.s4, paddingTop: space.s6, borderTopWidth: lineWidth, borderTopColor: colors.line },
  warn: { ...typography.secondary, color: colors.warn },
  error: { ...typography.caption, color: colors.loss, textAlign: 'center' },
});
