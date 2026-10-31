# AGENTS.md

마진로그 해커톤 시연 프로덕트의 작업 규칙. 사람과 코딩 에이전트 모두에게 적용한다.

## 현재 상태

- 제품 방향이 "메뉴 원가 개선"으로 피봇했다. 기준은 Figma 섹션 "MVP 와이어프레임 · 메뉴 원가 개선"(node 39:353)과 이를 옮긴 `docs/PRODUCT.md`다.
- `design/` 아래 HTML 화면 14개는 피봇 전 흐름(장부, 순수익, 익명 비교, 공급처)이다. 새 앱에서는 색, 글꼴, 카드 스타일 참고용으로만 쓴다.
- 04는 와이어프레임의 시뮬레이션 대신 실제 구매처 등록 화면이다(`docs/PRODUCT.md` "와이어프레임과 다른 점").
- main에 기반이 있다: 공통 코드(`packages/core`), 서버 뼈대(`apps/server`), 앱 뼈대(`apps/mobile`, Expo).
- 서버는 Next.js 16 App Router(API 라우트만) + Drizzle ORM + Postgres다. Supabase는 나중에 연결하고, 그전까지 로컬 DB는 쓰지 않는다.
- 기능은 워크트리 세 개에서 만든다: `feat/menu`(`../next-very-menu`, 01·02·08), `feat/supplier`(`../next-very-supplier`, 03·04), `feat/invoice`(`../next-very-invoice`, 05·06·07 + OCR). 스택, 구조, 명령은 `docs/TECH.md`, 작업 계획은 `docs/TEAM.md`에 정했다. 코드를 바꾸면 이 문서와 TECH.md를 같이 갱신한다.

## 단일 출처

- `docs/PRODUCT.md`: 새 MVP의 화면 01~08, 흐름, 예외 상태, 시연 데이터. 앱 화면과 숫자의 기준이다.
- `docs/TECH.md`: 스택, 폴더 구조, 데이터 타입 계약, 원가 계산 규칙, API, OCR 방식.
- `docs/TEAM.md`: 작업 계획. main 기반, 워크트리별 화면과 라우트, 공유 파일 규칙, 합치는 순서.
- `design/SPEC.md`: 피봇 전 목업 14개의 명세. `design/` 화면을 고칠 때만 기준이다.
- `design/tokens.css`: 색, 글꼴, 간격, 반경, 그림자와 공통 클래스(`.frame`, `.statusbar`, `.appbar`, `.content`, `.card`, `.btn-*`, `.chip-*`, `.row`, `.input`, `.tabbar`, `.sheet`). 화면에서 색이나 크기를 하드코딩하지 말고 토큰을 쓴다.

## 명령

```bash
npm install                                   # 루트, 워크스페이스 전체
npm run dev -w apps/server                    # http://localhost:8787
npm run db:push -w apps/server                # DATABASE_URL을 넣은 뒤
npm run db:seed -w apps/server                # DATABASE_URL을 넣은 뒤
cd apps/mobile && npx expo start              # 앱
npm test -w packages/core                     # 원가 계산 테스트
npm run typecheck                             # 전체 타입 검사
```

## 화면 작성 규칙

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
