# 기술 스택과 구조 (v2)

전제: 해커톤 심사 시연용이다. 스토어 배포, 로그인, 여러 매장은 없다. 앱은 발표자 휴대폰(Expo Go)에서 돌리고, 서버는 Vercel에 올린다. 데이터와 원가 계산, OCR은 서버가 맡는다. 화면과 숫자는 `docs/PRODUCT.md`, 시각 규칙은 `DESIGN.md`가 기준이다.

## 스택

| 영역 | 선택 |
|---|---|
| 앱 | Expo SDK 58 + Expo Router + TypeScript, 서버 상태는 TanStack Query |
| 서버 | Next.js 16 App Router, `apps/server/app/api` 아래 Route Handlers만 쓴다. 요청 검증은 Zod |
| DB | Supabase Postgres + Drizzle ORM + postgres.js. 연결 문자열은 `DATABASE_URL` 하나 |
| 공통 코드 | `packages/core`(`@marginlog/core`): 타입, Zod 스키마, 단위 변환, 원가 계산, 비교, 주문 계산, 표시 형식, 시드 |
| OCR | Lablup(OpenAI 호환, DeepSeek-V4.1-Flash) 또는 Gemini 비전 모델 + 응답 JSON 스키마, 키가 없으면 데모 추출 결과 |
| 테스트 | Vitest, `packages/core` |
| 레포 | npm workspaces 모노레포 |

앱과 서버가 같은 `packages/core` 함수를 쓴다. 앱이 미리 보여 주는 숫자와 서버가 응답하는 숫자가 같은 코드에서 나온다.

## 레포 구조

```
apps/
  mobile/                              Expo 앱
    app/
      _layout.tsx                      루트 스택, QueryClientProvider
      (tabs)/_layout.tsx               하단 탭: 홈 / 기록 / 비교 / 구매
      (tabs)/index.tsx                 홈 대시보드
      (tabs)/compare.tsx               비교할 재료 목록과 추천 요약
      (tabs)/records.tsx               구매 기록: 영수증 등록 + 버튼, 대기 명세서, 목록, 검색
      (tabs)/shop.tsx                  구매: 공급처 상품, 입고 대기, 장바구니 진입
      ingredients/index.tsx            식재료 목록
      ingredients/[id].tsx             식재료 상세: 단위, 최근 단가, 이력, 별칭
      menus/index.tsx                  메뉴 목록
      menus/[id].tsx                   메뉴 원가 상세
      recipe/[menuId].tsx              레시피 편집 (new면 신규)
      records/upload.tsx               사진 업로드와 인식 중 상태, 직접 입력으로 가는 버튼
      records/[invoiceId]/review.tsx   인식 결과 확인
      records/[invoiceId]/done.tsx     저장 완료와 바뀐 원가
      purchases/new.tsx                구매 기록 직접 입력
      purchases/[id].tsx               구매 기록 수정
      compare/[ingredientId].tsx       재료별 공급처 비교와 추천
      shop/cart.tsx                    장바구니와 주문 확인
      shop/orders/index.tsx            주문 목록
      shop/orders/[id].tsx             주문 상세와 입고 확인
    src/api/                           fetch 래퍼와 TanStack Query 훅
    src/ui/                            tokens.ts(DESIGN.md 값)와 공통 컴포넌트
  server/                              Next.js 16 (API 전용)
    app/api/
      health/route.ts                  GET
      dashboard/route.ts               GET
      purchases/route.ts               GET, POST
      purchases/[id]/route.ts          PUT, DELETE
      ingredients/route.ts             GET, POST
      ingredients/[id]/route.ts        GET, PUT
      ingredients/[id]/aliases/route.ts  POST
      menus/route.ts                   GET
      menus/[id]/route.ts              GET, PUT, DELETE
      invoices/route.ts                GET, POST
      invoices/[id]/route.ts           GET, DELETE
      invoices/[id]/image/route.ts     GET
      invoices/[id]/confirm/route.ts   POST
      compare/route.ts                 GET
      compare/[ingredientId]/route.ts  GET
      products/route.ts                GET
      cart/route.ts                    GET, PUT, DELETE
      orders/route.ts                  GET, POST
      orders/[id]/route.ts             GET
      orders/[id]/receive/route.ts     POST
      demo/reset/route.ts              POST
    db/schema.ts                       Drizzle 스키마 (전체 테이블)
    db/client.ts                       postgres.js 연결, prepare: false
    lib/repo.ts                        DB 읽기/쓰기. 라우트는 이것만 부른다
    lib/seed.ts                        core 시드를 DB에 넣는다 (/api/demo/reset과 스크립트가 같이 씀)
    lib/ocr/                           extract.ts(모델 호출), validate.ts(숫자 검사), aliases.ts(별칭 연결)
    scripts/seed.ts                    npm run db:seed
    drizzle.config.ts                  drizzle-kit 설정
    .env.example                       변수 이름만, 값 없음
packages/
  core/src/
    types.ts                           도메인 타입 (계약)
    units.ts                           Unit, baseOf, toBase
    inventory.ts                       재고 묶음(선입선출), consumption, stockOf, drawCost, settleDay, nextSettleDate, seededRandom
    cost.ts                            원가 계산, costAlert, priceChanges, previewWithPrice
    compare.ts                         compareOffers
    order.ts                           buildOrder
    format.ts                          unitLabel, formatWon, formatQty, formatUnitPrice, formatDate*
    schemas.ts                         API 요청/응답 Zod 스키마
    seed.ts                            docs/PRODUCT.md 시연 데이터 그대로
    *.test.ts                          Vitest
```

v1 라우트인 `/api/market`, `/api/quotes`, `/api/suppliers`는 v2 계약에 없다. 시장 참고 지수는 `/api/compare/[ingredientId]` 응답에 들어간다. v1의 견적(Quote)은 v2에서 공급처 상품(SupplierProduct)으로 바뀐다.

## 도메인 계약 요약

이름과 필드는 `packages/core/src/types.ts`가 기준이다. 바꾸려면 계약 단계에서 core를 먼저 고친다(`docs/TEAM.md`).

### 단위

```ts
type Unit = 'g' | 'kg' | 'mL' | 'L' | 'ea';   // 'ea'의 화면 표기는 "개"
type BaseUnit = 'g' | 'mL' | 'ea';
```

- `baseOf(unit)`: g, kg -> 'g'. mL, L -> 'mL'. ea -> 'ea'.
- 기본 단위 배수: kg 1000, L 1000, 나머지 1.
- `toBase(value, unit, baseUnit): number | null`. `baseOf(unit) !== baseUnit`이면 null. g과 mL은 서로 바꾸지 않는다.

### 엔티티

```ts
type Won = number;  // 정수 원

interface Ingredient { id: string; name: string; spec?: string; baseUnit: BaseUnit; marketCode?: string; aliases: string[] }
interface Supplier { id: string; name: string; phone?: string; memo?: string; createdAt: string }

interface Purchase {
  id: string; ingredientId: string; supplierId: string; date: string;   // 'YYYY-MM-DD'
  packSize: number; packUnit: Unit; quantity: number;
  amount: Won;                          // 줄 합계, 정수
  status: 'confirmed';
  source: 'receipt' | 'manual' | 'order';
  invoiceId?: string; orderLineId?: string; rawName?: string;
}

interface RecipeLine { ingredientId: string; amount: number; unit: Unit }
interface Menu { id: string; name: string; price: Won; servingLabel: string; recipe: RecipeLine[] }   // '1인분', '1잔'

interface MenuCostLine {
  ingredientId: string; amount: number; unit: Unit;
  baseQty: number | null; unitPricePerBase: number | null;
  priceDate: string | null; supplierId: string | null;
  cost: Won | null; previousCost: Won | null;
  issue: null | 'no-price' | 'unit-mismatch';
}
interface MenuCost {
  menuId: string;
  total: Won | null;        // 모든 줄에 재료비가 있을 때만
  partialTotal: Won;        // 재료비가 있는 줄의 합
  ratio: number | null;     // total / price
  previousTotal: Won | null;
  lines: MenuCostLine[];
  missing: string[];        // no-price ingredientId
  unitIssues: string[];     // unit-mismatch ingredientId
}
```

- `purchaseBaseQty(p, baseUnit)` = `toBase(packSize, packUnit, baseUnit) * quantity`, 또는 null.
- `unitPricePerBase(p, baseUnit)` = `amount / baseQty`. 실수 그대로 두고 저장과 계산에서 반올림하지 않는다.

### 원가 규칙 (`cost.ts`)

- 재고(`inventory.ts`): 기본 단위와 같은 계열인 확인된 구매 하나가 묶음(`Lot`) 하나다(날짜, 그다음 id). `consumption(menus, ingredients, sales)`는 판매 수 x 지금 레시피 사용량을 재료별 기본 단위 합으로 낸다. `stockOf(ingredient, purchases, used)`는 그 양을 오래된 묶음부터 빼고 `{ lots, current, previous, next, last, remaining }`을 돌려준다. 재고는 저장하지 않고 읽을 때마다 계산한다.
- 원가 함수는 모두 마지막 인자로 `used`(`Usage`, 재료 id -> 사용량)를 받는다. 생략하면 아무것도 안 쓴 상태다. 서버는 항상 `consumption()` 결과를 넘긴다.
- 줄: `baseQty = toBase(line.amount, line.unit, ingredient.baseUnit)`. null이면 `'unit-mismatch'`, 구매가 없으면 `'no-price'`, 아니면 `cost = Math.round(drawCost(stock, baseQty).cost)`. `drawCost`는 오래된 묶음부터 꺼내 묶음 사이를 나눠 계산하고, 재고 전체가 모자란 양은 마지막 묶음 단가로 계산해 `stockShort: true`를 준다. `unitPricePerBase`와 `priceDate`, `supplierId`는 지금 쓰는 묶음(없으면 마지막 묶음)의 값이다. 직전 단가는 `stock.previous`.
- `total` = 반올림한 줄 재료비의 합. `previousTotal`은 total이 있고 적어도 한 줄에 직전 단가가 있을 때만 값이 있다. 직전 단가가 없는 줄은 현재 재료비를 쓴다.
- `ratioPercent(total, price)` = `Math.round(total / price * 100)`.
- `costAlert(menus, ingredients, purchases, used)`: `total - previousTotal`이 가장 크게 양수인 메뉴, 그 차이, 현재 단가가 직전보다 높은 ingredientId 목록. 없으면 null.
- `priceChanges(ingredients, purchases, used)`: 지금 쓰는 묶음과 그 앞 묶음이 모두 있는 재료마다 `{ ingredientId, previousUnitPrice, currentUnitPrice, changeRate, currentDate, previousDate }`. `changeRate = current / previous - 1`.
- `previewWithPrice(menu, ingredients, purchases, ingredientId, unitPricePerBase)`: 그 재료의 현재 단가를 바꾼 가정의 MenuCost. `previousTotal`은 실제 현재 total. 아무것도 저장하지 않는다.

### 표시 형식 (`format.ts`)

| 함수 | 예 |
|---|---|
| `unitLabel(unit)` | 'ea' -> "개", 나머지는 그대로 |
| `formatWon(n)` | "1,234원" |
| `formatQty(value, unit)` | "250mL", "18g", "1.5kg", "2개" |
| `formatUnitPrice(p, baseUnit)` | g "100g당 1,000원", mL "100mL당 280원", ea "개당 50원". g과 mL은 100단위, 개는 1개 가격을 정수 원으로 반올림 |
| `formatDateKo('2026-10-28')` | "10월 28일" |
| `formatDateFull('2026-10-28')` | "2026.10.28" |

### 공급처 비교 (`compare.ts`, 데모 데이터)

```ts
interface SupplierProduct {
  id: string; supplierId: string; ingredientId: string; name: string;
  spec?: string; grade?: string; origin?: string;
  packSize: number; packUnit: Unit; price: Won;   // 포장당
  shippingFee: Won; minOrderAmount: Won; deliveryNote?: string; isDemo: boolean;
}
interface Offer {
  product: SupplierProduct; comparable: boolean; reason: null | 'unit' | 'spec';
  unitPricePerBase: number | null;
  packs: number;            // Math.ceil(neededBaseQty / packBaseQty), 최소 1
  itemsTotal: Won;          // packs * price
  shippingFee: Won; total: Won;   // itemsTotal + shippingFee
  meetsMinOrder: boolean;   // itemsTotal >= minOrderAmount
}
compareOffers(ingredient, products, neededBaseQty): { offers: Offer[]; recommendedId: string | null }
```

- `comparable` = `baseOf(packUnit) === ingredient.baseUnit` 그리고 (재료에 spec이 없거나 `product.spec === ingredient.spec`). 단위가 다르면 reason `'unit'`, 규격이 다르면 `'spec'`.
- `recommendedId`: comparable이고 meetsMinOrder인 offer 중 total이 가장 낮은 것. 같으면 unitPricePerBase가 낮은 것, 그다음 id. 없으면 null.
- 정렬: comparable을 total 순으로 먼저, 나머지를 뒤에.

### 장바구니와 주문 (`order.ts`, 데모)

```ts
interface CartItem { productId: string; quantity: number }   // 포장 수, 1 이상 정수
interface OrderLine { id: string; productId: string; supplierId: string; ingredientId: string; name: string;
                      packSize: number; packUnit: Unit; quantity: number; price: Won; amount: Won }
interface Order { id: string; status: 'placed' | 'received'; isDemo: true; createdAt: string; receivedAt?: string;
                  lines: OrderLine[]; itemsTotal: Won; shippingTotal: Won; total: Won }
```

- `buildOrder(cartItems, products)`: 줄과 합계를 만든다. 배송비는 주문에 들어간 공급처마다 한 번, 그 공급처 상품의 shippingFee 중 최댓값.
- 입고(`receive`)는 줄마다 Purchase를 하나 만든다. `source: 'order'`, `orderLineId = line.id`, `amount = line.amount`(배송비 제외). `purchases.order_line_id`의 UNIQUE 인덱스가 두 번째 입고의 중복을 막는다.
- 결제와 외부 전송은 없다. 주문은 DB에만 남는다.

### 명세서 (`Invoice`)

```ts
interface ExtractItem {
  rawName: string; packSize: number | null; packUnit: Unit | null;
  quantity: number; unitPrice: Won;   // 포장당, 인쇄된 그대로
  amount: Won; confidence: 'high' | 'low'; note?: string;
}
interface ExtractResult { supplier: string; date: string; items: ExtractItem[]; total: Won }
interface Invoice { id: string; hasImage: boolean; supplierId?: string; date?: string;
                    status: 'extracted' | 'confirmed'; extraction: ExtractResult; isDemo: boolean; createdAt: string }
```

## DB 테이블

금액은 정수 원(integer). 포장 용량, 수량, 레시피 사용량은 실수(double precision)다. 단가는 저장하지 않고 계산한다.

| 테이블 | 주요 열 | 비고 |
|---|---|---|
| `ingredients` | id, name, spec, base_unit, market_code | |
| `ingredient_aliases` | alias (PK), ingredient_id | 한 별칭은 한 재료에만 |
| `suppliers` | id, name, phone, memo, created_at | |
| `purchases` | id, ingredient_id, supplier_id, date, pack_size, pack_unit, quantity, amount, status, source, invoice_id, order_line_id, raw_name | `order_line_id` UNIQUE |
| `sales` | id, menu_id, date, quantity | 하루 메뉴별 판매 수. id는 `sale-{날짜}-{menuId}`라 같은 날 두 번 정산되지 않는다. 메뉴를 지우면 같이 지운다 |
| `invoices` | id, supplier_id, date, status, extraction(jsonb), is_demo, created_at | |
| `invoice_images` | invoice_id (PK), mime, data(bytea) | 사진은 Postgres에 둔다. `hasImage`는 이 행의 유무 |
| `menus` | id, name, price, serving_label | |
| `recipe_lines` | menu_id, ingredient_id, amount, unit, position | PK (menu_id, ingredient_id) |
| `market_index` | ingredient_id, week, mine, market | 4주 지수 예시 |
| `supplier_products` | id, supplier_id, ingredient_id, name, spec, grade, origin, pack_size, pack_unit, price, shipping_fee, min_order_amount, delivery_note, is_demo | 데모 카탈로그 |
| `cart_items` | product_id (PK), quantity | 매장이 하나라 장바구니도 하나 |
| `orders` | id, status, is_demo, created_at, received_at, items_total, shipping_total, total | |
| `order_lines` | id, order_id, product_id, supplier_id, ingredient_id, name, pack_size, pack_unit, quantity, price, amount | |

Supabase transaction pooler(6543)를 쓰므로 postgres.js에 `prepare: false`를 준다. `db/client.ts`에서 한 번만 설정한다.

## API

모든 경로는 `/api`로 시작한다. 요청은 `packages/core`의 Zod 스키마로 검증하고, 메뉴 원가와 비교 결과는 서버가 core 함수로 계산해 응답에 넣는다.

| 메서드 | 경로 | 화면 | 내용 |
|---|---|---|---|
| GET | `/api/health` | 없음 | 서버와 DB 연결, OCR 모드(실제/데모) 확인 |
| GET | `/api/dashboard` | 홈 | 이번 달 구매 합계, 메뉴별 MenuCost와 원가율과 누적 판매 수(`sold`), costAlert, priceChanges, 다음 정산 날짜(`nextSettleDate`), 확인 대기 명세서 수 |
| POST | `/api/settle` | 홈 | 본문 없음. `settleDay()`로 하루 판매를 만들어 `sales`에 저장하고 `{ date, nextDate, lines: [{ menuId, menuName, target, quantity }], changes }`를 돌려준다. 같은 날짜가 이미 있으면 409 |
| GET | `/api/purchases` | 기록 | 구매 기록 목록. `?q=`(재료 이름, 별칭, 구매처)와 `?ingredientId=` 검색 |
| POST | `/api/purchases` | 기록 | 직접 입력한 구매 기록 저장(`source: 'manual'`) |
| GET | `/api/purchases/[id]` | 구매 기록 수정 | 구매 기록 한 건 |
| PATCH | `/api/purchases/[id]` | 구매 기록 수정 | 구매 기록 수정 |
| DELETE | `/api/purchases/[id]` | 구매 기록 수정 | 구매 기록 삭제 |
| GET | `/api/ingredients` | 식재료 목록, 레시피 편집 | 재료 목록과 현재 단가, 단가 기준일 |
| POST | `/api/ingredients` | 레시피 편집, 인식 결과 확인 | 재료 추가 |
| GET | `/api/ingredients/[id]` | 식재료 상세 | 재료, 별칭, 현재와 직전 단가, 구매 이력, 이 재료를 쓰는 메뉴 |
| PATCH | `/api/ingredients/[id]` | 식재료 상세 | 이름, 규격 수정. 구매 기록이 있으면 base_unit 변경 거부 |
| POST | `/api/ingredients/[id]/aliases` | 인식 결과 확인, 식재료 상세 | 별칭 추가. 다른 재료가 쓰는 별칭이면 409 |
| GET | `/api/menus` | 홈, 레시피 편집 | 메뉴 목록과 MenuCost |
| GET | `/api/menus/[id]` | 메뉴 원가 상세 | 메뉴와 줄별 MenuCost |
| POST | `/api/menus` | 레시피 편집 | 새 메뉴와 레시피 저장 |
| PUT | `/api/menus/[id]` | 레시피 편집 | 메뉴와 레시피 수정 |
| DELETE | `/api/menus/[id]` | 메뉴 원가 상세 | 메뉴 삭제 |
| GET | `/api/invoices` | 기록 | 명세서 목록. `?status=extracted`로 확인 대기만 |
| POST | `/api/invoices` | 기록 | multipart `image`. 사진 저장 후 OCR, Invoice 반환 |
| GET | `/api/invoices/[id]` | 인식 결과 확인 | Invoice, 품목별 재료 연결 제안, 구매처 연결 제안 |
| DELETE | `/api/invoices/[id]` | 인식 결과 확인 | 저장하지 않고 나간 명세서와 사진을 지운다. 저장한 명세서는 409, 없으면 404 |
| GET | `/api/invoices/[id]/image` | 인식 결과 확인 | 원본 사진. 사진이 없으면 404 |
| POST | `/api/invoices/[id]/confirm` | 인식 결과 확인 | 고친 품목으로 Purchase(`source: 'receipt'`) 생성. 이미 confirmed면 409. 바뀐 메뉴 원가 전후 반환 |
| GET | `/api/compare` | 비교 | 비교할 수 있는 재료 목록과 재료별 추천 요약 |
| GET | `/api/compare/[ingredientId]` | 비교 | `?neededQty=&unit=`(기본값 최근 구매량). compareOffers 결과, 내 단가 이력, 시장 참고 지수 |
| GET | `/api/products` | 구매 | 공급처 상품 목록. `?ingredientId=` 필터 |
| GET | `/api/cart` | 구매 | 장바구니와 buildOrder 미리 계산 |
| PUT | `/api/cart` | 구매 | 장바구니 항목 넣기, 수량 바꾸기. quantity 0이면 뺀다 |
| DELETE | `/api/cart` | 구매 | 장바구니 비우기 |
| DELETE | `/api/cart/[productId]` | 장바구니 | 장바구니에서 상품 하나 빼기 |
| GET | `/api/orders` | 구매 | 주문 목록 |
| POST | `/api/orders` | 주문 확인 | 장바구니로 데모 주문 생성, 장바구니 비우기. 아무것도 외부로 보내지 않는다 |
| GET | `/api/orders/[id]` | 주문 상세 | 주문과 줄 |
| POST | `/api/orders/[id]/receive` | 주문 상세 | 입고 확인. 줄마다 Purchase(`source: 'order'`). 이미 입고한 주문은 새 기록 없이 기존 상태를 돌려준다 |
| POST | `/api/demo/reset` | 숨김 버튼 | 모든 테이블을 시드로 되돌림 |

Vercel 함수의 요청 본문 한도는 4.5MB다. 앱이 사진을 긴 변 1600px로 줄여 올리므로 한도 안에 들어간다.

## 로그인 세션 (앱, 1단계)

- `apps/mobile/src/session/SessionProvider.tsx`: 세션 상태 `mode`(`null` 로그아웃, `'showcase'` 한끼식당 서버 데이터) 하나만 있다. AsyncStorage 키 `marginlog.session.v1`에 `{ mode }` JSON으로 저장하고 읽을 때 Zod로 검사한다. 없앤 새 가게 모드(`'demo'`)가 남아 있으면 `'showcase'`로 읽고, 옛 새 가게 데이터의 다른 키는 무시한다. 쓰기는 하나씩 줄 세우고 저장이 성공한 뒤에만 화면 상태를 바꾼다. 비밀번호와 토큰은 저장하지 않는다.
- `apps/mobile/src/session/auth.ts`: `signInWithEmail`, `signUpWithEmail`은 지금 "서버에 연결되지 않았어요"를 돌려준다. 2단계에서는 이 두 함수만 실제 인증으로 바꾼다.
- `app/_layout.tsx`: `Stack.Protected`로 로그인·회원가입(로그아웃)과 탭·마이페이지·시연 상세 화면(로그인)을 나눈다. 주소를 직접 입력해도 다른 쪽 화면은 열리지 않는다.
- 2단계 할 일: 인증 서버, `stores` 테이블, 메뉴·재료·구매·판매·장바구니·주문에 가게 열.

## OCR

`apps/server/lib/ocr/extract.ts`가 사진 한 장을 받아 `ExtractResult`를 돌려준다.

1. **실제 인식 조건.** `OCR_PROVIDER`(`lablup` | `gemini`)로 공급자를 고른다. 비우면 `LABLUP_API_KEY`가 있을 때 Lablup, 없으면 Gemini다. Lablup은 `https://api.console.lablup.ai/v1/chat/completions`(OpenAI 호환)에 이미지와 `response_format: json_schema`를 보내고, 모델은 `LABLUP_MODEL`(기본 `DeepSeek-V4.1-Flash-B300`), 주소는 `LABLUP_BASE_URL`로 바꿀 수 있다. 추론(thinking)은 끈다(`chat_template_kwargs.thinking: false`). 켜면 15품목 영수증이 8초를 넘기고, 꺼도 인식 결과는 같다(1~3초). Gemini 모델은 `GEMINI_MODEL`로 바꿀 수 있다. 고른 공급자의 키가 없거나, 호출이 실패하거나, 8초를 넘기면 데모 추출 결과를 돌려주고 `isDemo: true`로 저장한다. 앱 화면에는 데모 여부를 표시하지 않는다.
2. **좁은 JSON 스키마.** 모델은 `supplier, date, items[{ rawName, packSize|null, packUnit|null, quantity, unitPrice, amount }], total`만 읽는다. packUnit은 `g, kg, mL, L, ea` 중 하나이거나 null이다. 재료 연결, 단위 환산, 단가 계산은 서버 코드가 한다. 숫자는 인쇄된 그대로 옮기고 계산하거나 지어내지 말라고 프롬프트에 적는다.
3. **서버 숫자 검사(`validate.ts`).** 다음이면 그 품목을 `confidence: 'low'`로 두고 `note`에 이유를 적는다: `quantity x unitPrice != amount`, packSize나 packUnit이 null, 포장 용량이 범위 밖(기본 단위로 1 미만 또는 50,000 초과), 품목 합 != total. 앱은 low 칸을 "확인 필요"로 표시하고 고치기 전에는 저장 버튼을 막는다.
4. **별칭 연결(`aliases.ts`).** `ingredient_aliases`와 재료 이름으로 rawName을 먼저 맞춘다. 공백과 괄호를 지운 뒤 비교한다. 맞지 않으면 후보만 제안하고 자동 연결하지 않는다.
5. **사진 줄이기.** 앱과 서버 모두 긴 변 1600px, JPEG 품질 0.8로 줄인다. 서버는 sharp로 회전 정보를 반영한다.
6. **데모 추출 결과.** 시드의 대기 명세서와 같은 값(한우리축산, 2026-10-31, 돼지고기 앞다리 10kg x 1, 90,000원)이다.

## 연결 상태

| 영역 | 지금 실제 | 데모 | 범위 밖 |
|---|---|---|---|
| DB | Supabase Postgres 저장과 조회 | | |
| OCR | `LABLUP_API_KEY` 또는 `GEMINI_API_KEY`가 있을 때 모델 인식 | 키가 없거나 실패하면 고정 추출 결과 | 그 밖의 OCR 공급자 |
| 원가 계산 | core 함수로 서버와 앱이 같이 계산 | | g과 mL 환산, 배송비 배분 |
| 시장 참고 지수 | | 돼지고기 앞다리 4주 예시 | KAMIS 실조회 |
| 공급처 상품과 가격 | | 시드 카탈로그(`is_demo`) | 공급처 연동 |
| 주문 | DB에 주문 저장, 입고 시 구매 기록 생성 | 주문 자체는 데모 | 외부 주문 전송 |
| 결제 | | | 없음 |
| 수수료 정산 | | | 없음 |

## 명령

```bash
npm install                                   # 루트, 워크스페이스 전체
npm run dev -w apps/server                    # http://localhost:8787
npm run db:push -w apps/server                # 스키마를 DB에 반영
npm run db:seed -w apps/server                # 시드 넣기
npm run db:reset -w apps/server               # 모든 테이블을 비우고 시드로 되돌림
cd apps/mobile && npx expo start              # 앱
npm test -w packages/core                     # core 테스트 (Vitest)
npm run typecheck                             # 워크스페이스 전체 타입 검사
```

`db:*` 스크립트는 `apps/server/.env.local`의 `DATABASE_URL`을 읽는다.

## 비밀값

- `DATABASE_URL`, `LABLUP_API_KEY`, `GEMINI_API_KEY`는 `apps/server/.env.local`에만 둔다. 이 파일은 git에 올리지 않는다.
- `.env.example`에는 변수 이름만 적는다.
- 값을 로그, 응답, 문서, 커밋 메시지에 남기지 않는다. 스크립트에서 쓸 때는 `node --env-file=.env.local`이나 기존 npm 스크립트로 읽는다.
- Vercel에는 프로젝트 환경변수로 넣는다.

## 배포와 시연 환경

- 서버: Vercel에 `apps/server`를 올리고 환경변수에 `DATABASE_URL`과 OCR 키(`LABLUP_API_KEY` 또는 `GEMINI_API_KEY`)를 넣는다. URL은 앱의 `EXPO_PUBLIC_API_URL`에 넣는다.
- 예비: 노트북에서 `next build` 뒤 `next start -p 8787`, `cloudflared tunnel --url http://localhost:8787`로 받은 HTTPS 주소를 쓴다. DB는 같은 Supabase다.
- 앱: `npx expo start --tunnel`로 발표자 휴대폰에서 연다. 휴대폰 핫스팟을 예비 네트워크로 둔다.
- 시연마다 `/api/demo/reset`으로 초기화한다.

## 참고

- Expo Router: https://docs.expo.dev/versions/latest/sdk/router/
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Drizzle + Supabase: https://orm.drizzle.team/docs/connect-supabase
- Gemini 구조화 출력: https://ai.google.dev/gemini-api/docs/structured-output
