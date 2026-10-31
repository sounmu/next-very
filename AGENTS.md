# AGENTS.md

마진로그 해커톤 시연 프로덕트의 작업 규칙. 사람과 코딩 에이전트 모두에게 적용한다.

## 현재 상태

- 제품은 v2다. 핵심 가치는 "구매 기록을 원가 데이터로, 원가 데이터를 더 나은 구매로."이고, 흐름은 구매 기록 -> 재료 단가 -> 메뉴 원가 -> 공급처 비교 -> 데모 구매다. 화면과 숫자는 `docs/PRODUCT.md`가 기준이다.
- 하단 탭은 홈 / 기록 / 비교 / 구매 네 개다(2026-10-31 결정, 쓰는 빈도 순). 식재료, 메뉴 원가, 레시피는 홈에서 들어가는 하위 화면이다. 루프(기록 -> 원가 -> 비교 -> 구매)는 탭 순서가 아니라 홈의 "지금 할 일"과 화면 끝의 다음 단계 버튼으로 보인다.
- 단위는 g, kg, mL, L, 개이고 기본 단위는 g, mL, 개다. g과 mL은 서로 바꾸지 않는다. 메뉴 원가는 확인된 구매를 재고로 보고 먼저 산 재고부터 쓰는 선입선출로 계산한다(판매 기록만큼 재고에서 뺀다, 2026-10-31 결정). 새로 산 재고는 앞 재고를 다 쓴 뒤에 원가에 반영된다. 판매는 데모 "정산하기"(`POST /api/settle`, 날짜 시드 난수)로 만든다. 단가가 없거나 단위가 맞지 않는 재료는 추정하지 않고 표시만 한다.
- 앱 화면에는 "데모" 라벨을 붙이지 않는다(2026-10-31 결정). 실제와 데모의 구분은 `docs/PRODUCT.md`와 `docs/TECH.md`에만 적는다. OCR은 서버에 `GEMINI_API_KEY`가 있을 때만 실제이고, 없으면 고정 추출 결과(`isDemo: true`)를 쓴다. 공급처 상품, 가격, 주문은 데모다. 결제, 외부 주문 전송, 수수료 정산은 없다. 입고 확인은 실제 구매 기록을 만들고, 같은 주문 줄은 두 번 기록되지 않는다.
- 서버는 Next.js 16 App Router(API 라우트만) + Drizzle ORM + postgres.js + Supabase Postgres다. 앱은 Expo SDK 58 + Expo Router다. 공통 코드는 `packages/core`다.
- 비밀값(`DATABASE_URL`, `GEMINI_API_KEY`)은 `apps/server/.env.local`에만 둔다. 출력하거나 복사하거나 커밋하지 않는다.
- 작업 방식은 `docs/TEAM.md`에 있다. 코드를 바꾸면 이 문서와 `docs/TECH.md`를 같이 갱신한다.

## 단일 출처

- `docs/PRODUCT.md`: v2 흐름, 탭과 화면, 화면별 상태, 계산 규칙, 추천 규칙, 실제와 데모의 구분, 범위 밖, 시연 데이터와 시나리오. 앱 화면과 숫자의 기준이다.
- `docs/TECH.md`: 스택, 레포 구조, 도메인 계약(타입, 단위, 원가, 비교, 주문), DB 테이블, API, OCR, 연결 상태, 명령, 비밀값 규칙.
- `docs/TEAM.md`: 작업 방식. 계약 단계, 기능 영역, 공유 파일 규칙, 커밋 전 확인.
- `DESIGN.md`: 앱의 시각 명세. 색(포인트 딥 블루 #1E4E8C), 글꼴, 간격, 컴포넌트, 화면 구성, 상태 표시. 앱 화면에서 색이나 크기를 하드코딩하지 말고 `apps/mobile/src/ui/tokens.ts`로 옮긴 이 값을 쓴다.
- `design/`: 피봇 전 목업 14개(장부, 순수익, 익명 비교, 공급처)와 그 명세 `design/SPEC.md`, 토큰 `design/tokens.css`. v2 앱의 기준이 아니다. `design/` 화면을 고칠 때만 아래 규칙을 따른다.

## 명령

```bash
npm install                                   # 루트, 워크스페이스 전체
npm run dev -w apps/server                    # http://localhost:8787
npm run db:push -w apps/server                # 스키마를 DB에 반영 (.env.local의 DATABASE_URL)
npm run db:seed -w apps/server                # 시드 넣기
npm run db:reset -w apps/server               # 모든 테이블을 비우고 시드로 되돌림
cd apps/mobile && npx expo start              # 앱
npm test -w packages/core                     # core 테스트 (단위, 원가, 비교, 주문)
npm run typecheck                             # 전체 타입 검사
```

## 화면 작성 규칙 (`design/` 목업)

- 파일 하나가 화면 하나다: `design/screens/NN-slug.html`, 프레임 390x844.
- 스타일시트는 `../tokens.css` 하나만 링크하고, 화면 전용 스타일은 파일 안 `<style>`에 둔다.
- 외부 리소스 금지: CDN, 웹폰트, 원격 이미지 모두 쓰지 않는다. 아이콘은 인라인 SVG로 그린다. `grep -rn "http" design/screens`가 아무것도 찾지 않아야 한다.
- 화면 내용은 스크롤 없이 844px 안에 들어가야 한다. 넘치면 내용을 줄인다.
- 하단 탭 순서는 홈, 장부, 리포트, 비교, 공급처로 고정한다.
- 문구는 한국어, 금액은 `1,234,000원` 형식으로 쓴다.
- 숫자는 SPEC.md 시연 데이터만 쓴다. 숫자를 바꾸면 그 숫자를 쓰는 모든 화면을 같이 고친다.

## 검증

화면을 바꾸면 390x844로 렌더해서 `design/screenshots/NN.png`를 다시 만들고 직접 확인한다. 넘침, 겹침, 잘린 글자, 깨진 아이콘이 없어야 한다.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=390,844 --screenshot=design/screenshots/02.png \
  "file://$PWD/design/screens/02-home.html"
```

`--force-device-scale-factor=1`을 빼면 Retina 화면에서 2배 크기(780x1688) PNG가 나온다. 결과 PNG는 정확히 390x844여야 한다.

검증 결과는 `design/VERIFY.md`에 화면별 PASS/FAIL로 기록한다.

`design/svg/*.svg`는 HTML 화면에서 만든 파생 파일이다(dom-to-svg로 `.frame`을 변환). HTML을 고치면 해당 SVG도 다시 만들어야 한다. 03 촬영 화면은 CSS radial-gradient 배경이 변환되지 않아서, 변환 뒤 SVG 맨 앞에 같은 색의 radialGradient 사각형을 넣었다. 화면 사이 링크는 같은 폴더의 `NN-slug.svg` 상대 경로로 바꾼다. 변환 전에 화면 안 인라인 SVG(차트, 아이콘)의 계산된 fill과 stroke를 속성으로 고정해야 CSS 클래스로 준 색이 빠지지 않는다. dom-to-svg는 CSS transform과 dashed 테두리를 옮기지 못한다. 그래서 03의 기울어진 종이와 13의 중앙값 점선은 SVG에서 각각 똑바로 선 종이와 실선으로 나온다.

## 저작권

푸드로직(foodlogic.co.kr)은 기능 참고용이다. 그 서비스의 로고, 이미지, 문구, 화면 디자인을 복사하지 않는다.
