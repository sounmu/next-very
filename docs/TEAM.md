# 작업 방식

담당자는 한 명이다. 기능 영역마다 코딩 에이전트를 나눠 동시에 돌리고, 담당자가 결과를 확인하고 합친다.

## 단계

| 단계 | 하는 일 | 끝난 상태 |
|---|---|---|
| 계약 | `packages/core`의 타입, 단위, 계산, 스키마, 시드와 `apps/server/db/schema.ts`를 먼저 고친다 | `npm test -w packages/core`와 `npm run typecheck` 통과 |
| 기능 | 영역별 에이전트가 자기 라우트와 화면만 만든다 | 영역마다 아래 확인 항목 통과 |
| 통합 | 담당자가 합치고 `docs/PRODUCT.md`의 시연 시나리오를 처음부터 끝까지 돈다 | 시나리오의 모든 숫자 일치 |

## 기능 영역

| 영역 | 서버 라우트 | 앱 화면 |
|---|---|---|
| 기록 | `/api/purchases*`, `/api/invoices*`, OCR | 기록 탭, 인식 결과 확인, 구매 기록 수정 |
| 원가 | `/api/dashboard`, `/api/ingredients*`, `/api/menus*` | 홈, 식재료, 메뉴 원가, 레시피 |
| 비교와 장보기 | `/api/compare*`, `/api/products`, `/api/cart`, `/api/orders*` | 비교 탭, 장보기 탭, 장바구니, 주문 상세 |

## 공유 파일 규칙

- 공유 파일은 계약 단계에서만 고친다: `packages/core/src`의 기존 파일, `apps/server/db/schema.ts`, `apps/server/lib/seed.ts`, `apps/mobile/src/ui`, `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(tabs)/_layout.tsx`.
- 기능 단계에서 계약을 바꿔야 하면 작업을 멈추고 담당자에게 알린다. 담당자가 계약을 고친 뒤 다시 시작한다.
- 각 에이전트는 자기 영역 파일만 쓴다. 다른 영역 파일이 필요하면 읽기만 한다.
- 숫자는 `docs/PRODUCT.md` 시연 데이터만 쓴다. 바꾸면 그 문서부터 고친다.
- 비밀값(`apps/server/.env.local`)은 출력하거나 복사하거나 커밋하지 않는다.

## 커밋 전 확인

커밋은 담당자가 한다. 커밋하기 전에 매번 아래를 확인한다.

1. `npm test -w packages/core` 통과.
2. `npm run typecheck` 통과.
3. 바뀐 라우트를 `npm run dev -w apps/server`로 띄워 실제로 호출하고, 응답 숫자를 `docs/PRODUCT.md`와 대조한다.
4. 바뀐 화면을 앱에서 열어 확인한다. 로딩, 빈 상태, 오류, 확인 필요 상태를 포함한다.
5. 띄운 서버와 앱 프로세스를 끈다.
6. 코드가 바뀌었으면 `AGENTS.md`와 `docs/TECH.md`를 같이 고친다.
