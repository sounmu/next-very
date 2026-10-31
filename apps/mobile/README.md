# @marginlog/mobile

마진로그 앱 (Expo + Expo Router). 화면 명세는 `../../docs/PRODUCT.md`, 스택과 API는 `../../docs/TECH.md`.

## 실행

```bash
npm install            # 레포 루트에서 한 번
cp .env.example .env   # EXPO_PUBLIC_API_URL을 서버 주소로
npx expo start         # 발표자 휴대폰은 --tunnel
npx tsc --noEmit       # 타입 검사
```

## 구조

```
app/                       Expo Router 화면 (파일 = 화면), _layout.tsx가 Stack + QueryClientProvider
src/ui/                    tokens.ts(design/tokens.css 값), Screen, Header, Card, Button, Row, Notice, Money
src/api/                   apiFetch(zod 파싱, ApiError), useMenus, useResetDemo
```

색, 글꼴 크기, 간격은 `src/ui/tokens.ts`만 쓴다. 화면에서 값을 하드코딩하지 않는다.
