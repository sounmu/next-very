import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { emailError, newPasswordError, signUpWithEmail } from '@/session/auth';
import { useSession } from '@/session/SessionProvider';
import { Button, Header, Screen, TextButton, TextField, colors, lineWidth, space, typography } from '@/ui';

export default function SignupScreen() {
  const { startShowcase } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);

  const emailMessage = submitted ? emailError(email) : null;
  const passwordMessage = submitted ? newPasswordError(password) : null;
  const confirmMessage = submitted ? (confirm === '' ? '비밀번호를 한 번 더 입력해 주세요' : confirm !== password ? '비밀번호가 서로 달라요' : null) : null;

  async function submit() {
    if (pending) return;
    setSubmitted(true);
    setAuthError(null);
    if (emailError(email) !== null || newPasswordError(password) !== null || confirm !== password) return;
    setPending(true);
    try {
      const result = await signUpWithEmail(email.trim(), password);
      if (!result.ok) setAuthError(result.message);
    } finally {
      setPending(false);
    }
  }

  async function enterShowcase() {
    if (entering) return;
    setEntering(true);
    setEnterError(null);
    try {
      await startShowcase();
    } catch {
      setEnterError('시작하지 못했어요. 다시 시도해 주세요');
      setEntering(false);
    }
  }

  const toLogin = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  return (
    <Screen contentStyle={styles.content}>
      <Header backLabel="로그인" onBack={toLogin} title="마진로그 시작하기" />

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
        autoComplete="new-password"
        hint="8자 이상, 영문과 숫자를 함께 써 주세요"
        error={passwordMessage ?? undefined}
        accessory={<TextButton label={showPassword ? '숨기기' : '표시'} onPress={() => setShowPassword((value) => !value)} />}
      />
      <TextField
        label="비밀번호 확인"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoComplete="new-password"
        error={confirmMessage ?? undefined}
      />
      {authError ? <Text style={styles.warn}>{authError}</Text> : null}
      <Button label="회원가입" onPress={submit} loading={pending} disabled={pending} />

      <View style={styles.link}>
        <Text style={typography.secondary}>이미 계정이 있으신가요?</Text>
        <TextButton label="로그인" tone="primary" onPress={toLogin} />
      </View>

      <View style={styles.demo}>
        <Button variant="secondary" label="시연 가게 둘러보기" onPress={enterShowcase} disabled={entering} />
        {enterError ? <Text style={styles.error}>{enterError}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.s4 },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s1 },
  demo: { gap: space.s2, marginTop: space.s2, paddingTop: space.s6, borderTopWidth: lineWidth, borderTopColor: colors.line },
  warn: { ...typography.secondary, color: colors.warn },
  error: { ...typography.caption, color: colors.loss, textAlign: 'center' },
});
