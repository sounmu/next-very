# 작업 계획 (1인, 워크트리)

혼자 만든다. main에 기반을 먼저 올리고, 화면 묶음 세 개를 git 워크트리 세 개에서 따로 만든 뒤 차례로 합친다. 워크트리마다 폴더와 `node_modules`가 따로 있어서 한 기능을 하다 다른 기능으로 넘어가도 서로 건드리지 않는다.

## main: 기반

기능 브랜치를 만들기 전에 main에 아래를 모두 올린다.

| 영역 | 내용 |
|---|---|
| `packages/core` | 타입(`types.ts`), Zod 스키마(`schemas.ts`), 원가 계산(`cost.ts`), 시드 데이터(`seed.ts`), 테스트(`cost.test.ts`) |
| `apps/server` | Next.js 뼈대, DB 테이블 전체(`db/schema.ts`, invoice_images 포함), `db/client.ts`, 시드(`lib/seed.ts`, `scripts/seed.ts`), CORS, main 라우트 3개(`GET /api/health`, `GET /api/menus`, `POST /api/demo/reset`) |
| `apps/mobile` | Expo Router 라우트(빈 화면 8개 파일), tokens, 공통 UI(`src/ui`), API 클라이언트(`src/api`) |

끝난 상태: `npm test -w packages/core`와 `npm run typecheck`가 통과한다. DB는 아직 연결하지 않으므로 라우트는 타입 검사까지만 확인한다.

## 워크트리

| 브랜치 | 경로 | 화면 | 서버 라우트 | 끝난 상태 |
|---|---|---|---|---|
| feat/menu | `../next-very-menu` | 01, 02, 08 | `GET /api/menus/[id]`, `PUT /api/menus/[id]`, `GET /api/ingredients` | 08에서 메뉴를 추가하면 01에 원가와 함께 뜬다. 01 제목을 길게 누르면 시연 데이터로 초기화된다 |
| feat/supplier | `../next-very-supplier` | 03, 04 | `GET /api/ingredients/[id]`, `GET /api/market/[ingredientId]`, `GET /api/suppliers`, `POST /api/suppliers`, `POST /api/quotes` | 04에서 한우리축산 9,000원/kg을 저장하면 비교 카드가 3,200 -> 3,000원 / 30%를 보이고, 01과 02의 원가는 3,200원 그대로다 |
| feat/invoice | `../next-very-invoice` | 05, 06, 07 + OCR | `POST /api/invoices`, `GET /api/invoices/[id]`, `POST /api/invoices/[id]/confirm` | 실제 사진으로 05 -> 06 -> 07이 돌고, 07 후 01의 제육덮밥이 3,000원 / 30%다. OCR 키가 없어도 폴백으로 같은 결과가 나온다 |

만드는 명령 (레포 루트에서, main 기반이 올라간 뒤):

```bash
git worktree add ../next-very-menu -b feat/menu
git worktree add ../next-very-supplier -b feat/supplier
git worktree add ../next-very-invoice -b feat/invoice

(cd ../next-very-menu && npm install)
(cd ../next-very-supplier && npm install)
(cd ../next-very-invoice && npm install)
```

`.env`는 git에 없으므로 워크트리마다 `apps/server/.env`를 따로 둔다. 서버를 두 곳에서 동시에 띄우면 포트가 겹치니 한 번에 하나만 띄운다.

## 규칙

- 공유 파일은 main에서만 고친다: `packages/core`의 기존 파일, `apps/server/db/schema.ts`, `apps/mobile/src/ui`, `apps/mobile/app/_layout.tsx`. 고친 뒤 각 워크트리에서 `git rebase main`을 한다.
- 기능에 새 스키마가 필요하면 새 파일 `packages/core/src/api/<feature>.ts`에 둔다(menu, supplier, invoice). 기존 `schemas.ts`는 고치지 않는다.
- 합치는 순서: feat/menu -> feat/supplier -> feat/invoice. 하나를 합칠 때마다 남은 브랜치를 main 위로 rebase한다.
- 숫자는 `docs/PRODUCT.md` 시연 데이터만 쓴다. 바꾸면 그 문서부터 고친다.
- 문구는 와이어프레임 문구를 쓰고, 04는 PRODUCT.md 문구를 쓴다. 바꾸고 싶으면 PRODUCT.md에 먼저 반영한다.
- API 키와 `.env`는 커밋하지 않는다.

## 통합 리허설

세 브랜치를 합친 main을 Vercel + Supabase에 올린 뒤 한다.

1. 배포된 서버로 01 -> 07 전체를 실기기에서 3번 돈다. 매번 01 제목을 길게 눌러 초기화한다.
2. OCR 키를 빼고 한 번(폴백), 노트북 `next start` + Cloudflare Tunnel 서버로 한 번 더 돈다.
3. 숫자 대조: 01 3,200 / 32% / +200원, 02 돼지고기 2,000원 (이전 1,800원), 03 10,000원 / +11.1%, 04 비교 카드 3,000 / 30% / 한 그릇당 200원, 06 9,000원/kg과 견적 일치, 07 3,000 / 30% / -200원, 김치찌개 2,700 / 30%, 계란말이 2,000 / 25%.
4. 발표 화면은 휴대폰 미러링. 휴대폰 핫스팟을 예비 네트워크로 둔다.

## 우선순위 (시간이 모자랄 때 버리는 순서)

1. KAMIS 실조회 -> 고정 예시
2. Upstage 비교 -> Gemini 하나만
3. 08 신규 메뉴 추가 -> 기존 메뉴 수정만
4. 03 그래프 -> 지수 숫자 표만
5. 06 원본 사진 보기, 07 반영한 명세서 보기

01 -> 07 주 흐름, 서버 저장, 실제 사진 OCR(폴백 포함), 숫자 일치는 끝까지 지킨다.
