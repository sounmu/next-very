/**
 * Email sign-in and sign-up. No auth server is connected yet (phase 1), so both answer
 * "not connected" without storing or sending the password. Phase 2 replaces these two
 * functions; the screens only read `ok` and `message`.
 */
export type AuthResult = { ok: true } | { ok: false; message: string };

const NOT_CONNECTED_SIGN_IN = '아직 로그인 서버에 연결되지 않았어요. 아래 데모로 시작하기로 둘러볼 수 있어요.';
const NOT_CONNECTED_SIGN_UP = '아직 회원가입 서버에 연결되지 않았어요. 계정은 만들어지지 않았고, 아래 데모로 시작하기로 둘러볼 수 있어요.';

export async function signInWithEmail(_email: string, _password: string): Promise<AuthResult> {
  return { ok: false, message: NOT_CONNECTED_SIGN_IN };
}

export async function signUpWithEmail(_email: string, _password: string): Promise<AuthResult> {
  return { ok: false, message: NOT_CONNECTED_SIGN_UP };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(email: string): string | null {
  const value = email.trim();
  if (value === '') return '이메일을 입력해 주세요';
  return EMAIL.test(value) ? null : '이메일 형식을 확인해 주세요';
}

/** No auth provider policy exists yet; phase 2 should match the provider's rule. */
export function newPasswordError(password: string): string | null {
  if (password === '') return '비밀번호를 입력해 주세요';
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return '8자 이상, 영문과 숫자를 함께 써 주세요';
  }
  return null;
}
