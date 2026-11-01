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

로컬 PostgreSQL 18을 띄우고 마이그레이션과 시드(역할·권한, 아이템 카탈로그)를 적용합니다. 시드는 멱등이라 여러 번 돌려도 됩니다.

```bash
docker compose up -d --wait
pnpm db:migrate
pnpm db:seed
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
pnpm depcruise
pnpm spec:lint
pnpm test
pnpm test:e2e
```

`test:e2e`는 로컬 PostgreSQL이 떠 있어야 합니다. CI(`.github/workflows/ci.yml`)도 PR마다 같은 검사를 돌립니다.

## 구조

```
openapi.yaml       API 계약
prisma/            스키마(도메인마다 파일 하나), 마이그레이션, 시드
src/foundation/    foundation 계층: 설정, DB 클라이언트, 오류 응답, 계약 검증, 세션 확인
src/domains/       도메인: account, club, game, notice
src/api/           컨트롤러
```

의존 방향은 `api → domains → foundation` 한쪽뿐이고, 도메인끼리는 서로 import하지 않습니다. `pnpm depcruise`가 이 규칙을 검사합니다.

## 컨테이너 이미지

```bash
docker build --platform linux/amd64 -t tamagochi-backend .
```

컨테이너에서 마이그레이션과 시드를 적용한 뒤 서버를 띄웁니다.

```bash
docker run --rm --env-file .env tamagochi-backend node_modules/.bin/prisma migrate deploy
```

```bash
docker run --rm --env-file .env tamagochi-backend node_modules/.bin/prisma db seed
```
