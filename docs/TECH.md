# 기술 스택과 구조

전제: 해커톤 심사 시연용이다. 스토어 배포, 로그인, 다중 매장은 없다. 앱은 발표자 휴대폰(Expo Go)에서 돌리고, 서버는 Vercel에 올려 둔다. 데이터(메뉴, 레시피, 구매처, 견적, 매입)와 OCR은 서버가 맡는다.

## 결정 요약

| 영역 | 선택 |
|---|---|
| 앱 | Expo (React Native) + TypeScript + Expo Router |
| 서버 상태 관리(앱) | TanStack Query |
| 서버 | Next.js 16 App Router, `apps/server/app/api` 아래 Route Handlers만 (페이지는 한 줄짜리 index 하나) + Zod |
| DB | Postgres + Drizzle ORM + postgres.js 드라이버, 연결 문자열은 `DATABASE_URL` |
| 공통 코드 | `packages/core`: 타입, Zod 스키마, 원가 계산 함수, 시드 데이터 (앱과 서버가 같이 씀) |
| OCR | 비전 LLM 구조화 출력. 기본 Gemini Flash 계열, 비교 후보 Upstage Information Extract |
| 공공 시세 | 서버 `/api/market` 엔드포인트, 기본은 고정 예시, 여유 있으면 KAMIS Open API |
| 서버 배포 | Vercel + Supabase(Postgres). 예비로 노트북 `next start` + Cloudflare Tunnel |
| 테스트 | Vitest, `packages/core`만 |
| 레포 | npm workspaces 모노레포 |

## 서버는 왜 Next.js인가

- 담당자가 이미 Next.js를 안다. 새 프레임워크를 배우는 시간이 없다.
- 앱과 같은 TypeScript라서 타입, Zod 스키마, 원가 계산 함수를 `packages/core` 하나로 공유한다. 앱에서 보이는 숫자와 서버가 저장하는 숫자가 같은 함수에서 나온다.
- Vercel 배포가 한 단계로 끝난다. 레포를 연결하고 루트 디렉터리를 `apps/server`로 지정하면 된다.

## DB

- Postgres를 Drizzle ORM과 postgres.js로 쓴다. 연결 문자열은 환경변수 `DATABASE_URL` 하나다.
- Supabase는 마지막에 담당자가 직접 연결한다. 그전까지 코드는 `DATABASE_URL`만 바라보고, 로컬 DB는 띄우지도 테스트하지도 않는다. 원가 계산은 `packages/core` 테스트로 확인한다.
- Supabase 연결 풀러(transaction 모드)를 쓰면 postgres.js에 `prepare: false`를 준다. `db/client.ts`에서 한 번만 설정한다.
- 시연용이라 거래명세서 사진도 Postgres에 넣는다. `invoice_images` 테이블의 `bytea` 열에 저장하고, `invoices`는 그 id를 가리킨다. 별도 파일 저장소는 쓰지 않는다.

## 레포 구조

```
apps/
  mobile/                        Expo 앱
    app/                         Expo Router 화면 (파일 = 화면)
      _layout.tsx                스택, QueryClientProvider
      index.tsx                  01 메뉴 목록
      menu/[menuId].tsx          02 메뉴 원가 상세
      ingredient/[ingredientId].tsx   03 재료 가격 추세
      supplier/new.tsx           04 구매처 등록 (?ingredientId=)
      invoice/new.tsx            05 거래명세서 등록
      invoice/[invoiceId]/review.tsx  06 추출 결과 확인
      invoice/[invoiceId]/done.tsx    07 메뉴 원가 갱신
      recipe/[menuId].tsx        08 메뉴·레시피 등록/수정 (new면 신규)
    src/api/                     fetch 래퍼와 TanStack Query 훅
    src/ui/                      tokens.ts(design/tokens.css 값), Card, Button, Row, Notice, Money
    assets/demo-invoice.jpg      시연용 명세서 사진 (앨범 선택 실패 대비)
  server/                        Next.js 16 (API 전용)
    app/layout.tsx               최소 루트 레이아웃
    app/page.tsx                 한 줄짜리 index ("MarginLog API")
    app/api/
      health/route.ts            GET
      menus/route.ts             GET
      menus/[id]/route.ts        GET, PUT
      ingredients/route.ts       GET
      ingredients/[id]/route.ts  GET
      market/[ingredientId]/route.ts  GET
      suppliers/route.ts         GET, POST
      quotes/route.ts            POST
      invoices/route.ts          POST
      invoices/[id]/route.ts     GET
      invoices/[id]/confirm/route.ts  POST
      demo/reset/route.ts        POST
    db/schema.ts                 Drizzle 스키마 (전체 테이블, invoice_images 포함)
    db/client.ts                 postgres.js 연결 (DATABASE_URL)
    lib/seed.ts                  packages/core 시드를 DB에 넣는 함수 (/api/demo/reset과 스크립트가 같이 씀)
    lib/repo.ts                  DB 읽기/쓰기 함수, 라우트는 이것만 부른다
    lib/ocr/                     extract.ts(모델 호출), validate.ts(검증), aliases.ts(별칭 사전), demo-extract.json
    scripts/seed.ts              npm run db:seed
    drizzle.config.ts            drizzle-kit 설정 (DATABASE_URL)
    .env.example                 DATABASE_URL, OCR_PROVIDER, GEMINI_API_KEY, UPSTAGE_API_KEY, KAMIS_KEY, DEMO_FALLBACK=1 (값 없이 이름만)
packages/
  core/
    src/types.ts                 데이터 타입 (계약)
    src/schemas.ts               Zod 스키마 (API 요청/응답)
    src/api/<feature>.ts         기능 브랜치가 추가하는 스키마 (menu, supplier, invoice)
    src/cost.ts                  원가 계산 순수 함수
    src/seed.ts                  docs/PRODUCT.md 시연 데이터 그대로
    src/cost.test.ts
```

## 데이터 계약 (`packages/core/src/types.ts`)

main에서 이 타입을 고정한다. 바꾸려면 main에서 고치고 각 워크트리를 rebase한다.

```ts
type Won = number;          // 정수, 원
type Grams = number;        // 정수, g
type WonPerKg = number;     // 정수, 원/kg

interface Ingredient { id: string; name: string; spec?: string; marketCode?: string }  // marketCode 없으면 '참고 시세 없음'

interface Supplier { id: string; name: string; phone?: string; memo?: string; createdAt: string }

// 04에서 등록하는 받은 단가. 메뉴 원가에 쓰지 않는다.
interface Quote {
  id: string; supplierId: string; ingredientId: string;
  unitPrice: WonPerKg; packWeightG: Grams; terms?: string; date: string;
}

// 확인된 매입만 원가에 쓴다.
interface Purchase {
  id: string; ingredientId: string; supplierId: string; date: string;
  packWeightG: Grams; quantity: number; amount: Won;
  unitPrice: WonPerKg;        // round(amount / (quantity * packWeightG / 1000))
  status: 'confirmed' | 'pending';
  invoiceId?: string;
}

interface Invoice {
  id: string; imageId: string; supplierId?: string;   // imageId: invoice_images.id date?: string;
  status: 'extracted' | 'confirmed';
  extraction: ExtractResult;  // OCR 원본 결과
  isDemo: boolean;            // 폴백 결과면 true
}

interface RecipeLine { ingredientId: string; grams: Grams }
interface Menu { id: string; name: string; price: Won; servings: 1; recipe: RecipeLine[] }

interface MenuCost {
  menuId: string;
  total: Won | null;          // 매입가 없는 재료가 있으면 null
  ratio: number | null;       // total / price
  previousTotal: Won | null;  // 직전 확인 매입가 기준, 이력이 없으면 null
  lines: { ingredientId: string; grams: Grams; unitPrice: WonPerKg | null; supplierId: string | null;
           cost: Won | null; previousCost: Won | null }[];
  missing: string[];          // 매입가 없는 ingredientId
}
```

## 계산 규칙 (`packages/core/src/cost.ts`)

- 재료의 현재 단가 = confirmed 매입 중 날짜가 가장 늦은 것. 직전 단가 = 그다음 것.
- 1인분 재료비 = round(grams x unitPrice / 1000). 메뉴 원가 = 재료비 합. 원가율 표시는 반올림한 정수 %.
- `previewWithPrice(menu, purchases, ingredientId, unitPrice)`: 04의 비교 카드용. 새 MenuCost를 돌려줄 뿐 아무것도 저장하지 않는다. 앱이 서버 호출 없이 바로 계산한다.
- 견적(Quote)은 어떤 계산에도 들어가지 않는다.

`cost.test.ts`는 시연 데이터로 3,000 -> 3,200 -> 3,000, 김치찌개 2,700, 계란말이 2,000, 매입가 누락 시 null, 견적이 원가를 바꾸지 않음을 확인한다.

## API

모든 경로는 `/api`로 시작한다. 요청과 응답은 `packages/core`의 Zod 스키마로 검증한다. 메뉴 원가는 서버가 `cost.ts`로 계산해서 응답에 넣는다. "브랜치"는 그 라우트를 만드는 곳이다(`docs/TEAM.md`).

| 메서드 | 경로 | 화면 | 브랜치 | 내용 |
|---|---|---|---|---|
| GET | `/api/health` | 없음 | main | 서버와 DB 연결 확인 |
| GET | `/api/menus` | 01, 07 | main | 메뉴 목록 + MenuCost + 원가 상승 알림 + 견적 등록 여부 |
| POST | `/api/demo/reset` | 숨김 버튼 | main | 시드로 되돌림 |
| GET | `/api/menus/[id]` | 02 | feat/menu | 메뉴 + MenuCost (재료별) |
| PUT | `/api/menus/[id]` | 08 | feat/menu | 메뉴, 레시피 저장 (`new`면 생성) |
| GET | `/api/ingredients` | 08 | feat/menu | 재료 목록 |
| GET | `/api/ingredients/[id]` | 03, 04 | feat/supplier | 매입 이력, 구매처별 최근 단가, 견적, 이 재료를 쓰는 메뉴 |
| GET | `/api/market/[ingredientId]` | 03 | feat/supplier | 4주 지수 또는 `{ available: false }` |
| GET | `/api/suppliers` | 04, 06 | feat/supplier | 구매처 목록 |
| POST | `/api/suppliers` | 04, 06 | feat/supplier | 구매처 생성 |
| POST | `/api/quotes` | 04 | feat/supplier | 견적 저장 |
| POST | `/api/invoices` | 05 | feat/invoice | multipart `image`. invoice_images에 저장 후 OCR 실행, Invoice 반환 |
| GET | `/api/invoices/[id]` | 06, 07 | feat/invoice | Invoice + 품목별 재료 연결 제안 + 견적 대조 |
| POST | `/api/invoices/[id]/confirm` | 06 | feat/invoice | 사용자가 고친 품목을 받아 Purchase(confirmed) 생성. 바뀐 메뉴 원가 전후 반환 |

`/api/demo/reset`은 앱의 01 제목을 길게 누르면 부른다. 심사 시연 사이마다 누른다.

Vercel 함수의 요청 본문 한도는 4.5MB다. 앱이 사진을 긴 변 1600px로 줄여 올리므로 한도 안에 들어간다.

## OCR

### 추천

**기본은 Gemini Flash 계열 비전 모델에 응답 JSON 스키마를 걸어 한 번에 품목 표를 받는다.** 구현 첫날 Upstage Information Extract와 같은 사진 세트로 비교해서, 필드 정확도가 더 높은 쪽으로 정한다. 두 쪽 다 `apps/server/lib/ocr/extract.ts` 안에서 같은 `ExtractResult`를 돌려주게 해서 `OCR_PROVIDER` 환경변수로 바꾼다.

| 후보 | 장점 | 단점 |
|---|---|---|
| Gemini Flash 계열 (Google AI Studio 키) | 사진 + 스키마 한 번 호출로 끝, 빠르고 쌈, 손글씨와 기울어진 사진에 강함, 품목명 정규화("돈앞다리" -> "돼지고기 앞다리")까지 프롬프트로 처리 | 숫자를 그럴듯하게 지어낼 수 있음. 아래 검증으로 막는다 |
| Upstage Information Extract | 한국 회사의 문서 특화 API, 커스텀 JSON 스키마 지원, 무료 크레딧 $10, 심사에서 "한국어 문서 AI" 설명이 쉬움 | 품목명 정규화는 따로 해야 함, 응답이 더 느릴 수 있음 |
| CLOVA OCR (Document/Template) | 한국어 인식률이 높음 | 거래명세서 양식마다 템플릿을 만들어야 하고 NCP 계정·설정이 무거움. 해커톤 일정에 안 맞음 |
| GPT/Claude 비전 | 품질 좋음 | Gemini Flash보다 비싸고 느림. 이점이 없음 |

모델 이름과 가격은 자주 바뀐다. 구현 담당자가 시작할 때 AI Studio와 Upstage 콘솔에서 현재 버전을 확인하고 이 문서에 적는다.

### "최적화"는 모델보다 이것이 효과가 크다

OpenCV 전처리(기울기 보정, 이진화)는 일부러 하지 않는다. API 비용은 페이지나 토큰 단위라 전처리로 줄지 않고, 비전 LLM은 기울어진 사진도 잘 읽는다.

1. **스키마를 좁힌다.** 받을 것은 `supplier, date, items[{ rawName, packWeightG|null, packUnit, quantity, unitPrice, amount }], total`뿐이다. 모델은 읽기만 하고, 재료 연결과 kg 환산은 서버 코드가 한다.
2. **서버에서 숫자를 검증한다.** `quantity x unitPrice == amount`, 품목 합 == total, packWeightG가 없거나 10g~50kg 밖이면 그 칸을 `confidence: 'low'`로 표시한다. 06은 low 칸을 강조하고 고치기 전에 확인 버튼을 막는다.
3. **재료 연결은 사전으로 한다.** 서버의 별칭 표(`apps/server/lib/ocr/aliases.ts`, `돈앞다리`, `앞다리살`, `돼지 전지` -> `pork-shoulder`)로 먼저 맞추고, 실패하면 모델이 제안한 후보를 보여 주되 자동 연결하지 않는다.
4. **사진을 줄인다.** 앱에서 긴 변 1600px, JPEG 품질 0.8로 줄여 올린다. 업로드와 추론 시간이 줄고 정확도는 거의 같다.
5. **평가 세트를 만든다.** 실제 거래명세서 사진 10~20장(직접 출력해 찍은 시연용 포함)에 정답 JSON을 붙이고 `npm run ocr:eval`로 필드 정확도와 응답 시간을 잰다. 모델·프롬프트를 바꿀 때마다 이 숫자로 판단한다.
6. **시연은 폴백으로 지킨다.** `DEMO_FALLBACK=1`이면 OCR이 실패하거나 8초를 넘길 때 `apps/server/lib/ocr/demo-extract.json`(한우리축산, 11/04, 돼지고기 앞다리 10kg x 1, 90,000원)을 돌려주고 `isDemo: true`로 표시한다.

## 공공 시세

- 기본: 서버 시드에 4주 지수 예시를 넣고 `/api/market/[ingredientId]`가 그대로 돌려준다. 03에 "예시"를 표시한다.
- 여유가 있으면 KAMIS Open API 키를 받아 품목 코드별 소매가를 조회하고 1시간 캐시한다. 조회 실패 시 예시로 돌아간다.

## 배포와 시연 환경

- 서버: Vercel에 `apps/server`를 올리고 환경변수에 `DATABASE_URL`(Supabase)과 OCR 키를 넣는다. 시연 전날 배포하고 URL을 앱의 `EXPO_PUBLIC_API_URL`에 넣는다.
- DB: Supabase Postgres. 연결한 뒤 `db:push`로 테이블을 만들고 `db:seed`로 시연 데이터를 넣는다.
- 예비: 노트북에서 `next build` 후 `next start -p 8787`로 띄우고 `cloudflared tunnel --url http://localhost:8787`로 받은 HTTPS 주소를 쓴다. DB는 같은 Supabase를 쓴다.
- 앱: `npx expo start --tunnel`로 발표자 휴대폰에서 연다. 휴대폰 핫스팟을 예비 네트워크로 준비한다. 화면은 미러링으로 띄운다.

## 명령

```bash
npm install                                   # 루트, 워크스페이스 전체
npm run dev -w apps/server                    # http://localhost:8787
npm run db:push -w apps/server                # DATABASE_URL을 넣은 뒤, 스키마를 DB에 반영
npm run db:seed -w apps/server                # DATABASE_URL을 넣은 뒤, 시드로 초기화
cd apps/mobile && npx expo start              # 앱
npm test -w packages/core                     # 원가 계산 테스트 (Vitest)
npm run typecheck                             # 루트, 워크스페이스 전체 타입 검사
```

OCR 평가 세트는 `npm run ocr:eval -w apps/server`로 돌린다. 스크립트 이름은 레포를 만들 때 이대로 정의한다.

## 디자인

- 화면 구조와 문구는 Figma 와이어프레임을 따르고, 04는 `docs/PRODUCT.md`를 따른다.
- 색, 글꼴, 간격, 카드 모양은 `design/tokens.css` 값을 `apps/mobile/src/ui/tokens.ts`로 옮겨 쓴다. 화면에서 색을 하드코딩하지 않는다.
- 와이어프레임의 굵은 테두리 카드(알림, 핵심 숫자)는 강조 카드(`--c-primary-50` 배경)로, 일반 카드는 `.card`로 옮긴다.
- 원가 증가는 `--c-loss`, 감소는 `--c-profit`.

## 참고

- Expo Router: https://docs.expo.dev/versions/latest/sdk/router/
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Drizzle + Supabase: https://orm.drizzle.team/docs/connect-supabase
- Upstage Information Extract: https://console.upstage.ai/docs/capabilities/extract/universal-extraction
- Gemini 문서 이해: https://ai.google.dev/gemini-api/docs/document-processing
- CLOVA OCR: https://www.ncloud.com/product/aiService/ocr
