# TamaGoChi Backend

다마GoC치 백엔드. NestJS + Prisma + PostgreSQL + better-auth.

API 계약은 [`openapi.yaml`](openapi.yaml) 하나입니다. 요청은 이 파일로 검증하고, TypeScript 타입도 이 파일에서 만듭니다.

## 사전 요구 사항

- Node.js 26 이상
- pnpm 12
- Docker

## 처음 실행

```bash
pnpm install
cp .env.example .env
```

`.env`의 `BETTER_AUTH_SECRET`에 32자 이상의 값을 넣습니다.

```bash
openssl rand -base64 32
```

로컬 PostgreSQL 18을 띄우고 스키마와 시드(역할·권한, 아이템 카탈로그)를 적용합니다. `db:deploy`는 빈 DB에는 스키마를, 이미 있는 DB에는 새 릴리스 파일을 적용하고, 시드는 늘 적용합니다(자세히는 [`deploy/README.md`](deploy/README.md)의 "스키마 릴리스").

```bash
docker compose up -d --wait
pnpm db:deploy
```

개발 중에 스키마를 바꾸면 로컬 DB를 지우고 다시 만듭니다. 데이터가 모두 지워집니다.

```bash
docker compose down -v
```

서버를 띄웁니다. `http://localhost:3000/health`가 `{"status":"ok"}`를 돌려주면 됩니다.

```bash
pnpm start:dev
```

개발 환경에서는 인증 메일을 보내지 않고 서버 로그에 링크를 남깁니다.

## 검사

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm depcruise
pnpm spec:lint
pnpm test
pnpm test:e2e
```

`test:e2e`는 로컬 PostgreSQL이 떠 있어야 합니다. CI(`.github/workflows/ci.yml`)도 PR마다 같은 검사를 돌립니다.

## 스키마

`prisma/build-schema.ts`가 `prisma/schema.sql`(커밋하지 않음)을 만듭니다. 값 목록과 형식(색, 권한, 신청 상태, 부위 등)은 `openapi.yaml`에만 있습니다. Prisma 스키마의 `/// contract: <스키마 이름>` 표시가 그 컬럼을 계약에서 만든 DOMAIN으로 바꿉니다. Prisma와 계약 어느 쪽도 말하지 않는 제약 조건은 `prisma/sql/<도메인>.sql`에 둡니다.

## 구조

```
openapi.yaml       API 계약
prisma/            Prisma 스키마(도메인마다 파일 하나), 도메인별 SQL, 시드, 릴리스 SQL, 스키마 빌드·적용 스크립트
deploy/            EC2 배포: compose, Caddy, 배포 스크립트
src/foundation/    foundation 계층: 설정, DB 클라이언트, 메일 클라이언트, 오류 응답, 계약 검증, 세션 확인, 푸시 발송 포트, 식별자 타입, 쪽 나누기, 글자 수
src/domains/       도메인: account, club, game. 그 안은 루트 컬렉션/자식/ 순서(예: club/clubs/notices/)
src/api/           루트 컬렉션마다 경로 모듈(컨트롤러), health
test/              e2e 시험(개념마다 파일 하나)과 시험 준비(앱 시작·정리, 로그인, DB에 미리 넣는 것)
```

의존 방향은 `api → domains → foundation` 한쪽뿐이고, 도메인끼리는 서로 import하지 않습니다. `pnpm depcruise`가 이 규칙을 검사합니다.

## 컨테이너 이미지

CI가 main 푸시와 `v*` 태그마다 이미지를 빌드해, 빈 DB에서 돌려 본 뒤 GHCR에 올립니다. 로컬에서 빌드하려면 이렇게 합니다.

```bash
docker build --platform linux/amd64 -t tamagochi-backend .
```

이미지에는 빌드할 때 생성한 `prisma/schema.sql`이 들어 있습니다. EC2에 배포하는 방법은 [`deploy/README.md`](deploy/README.md)에 있습니다.
