# 배포

API(`https://api.tmgoc.kro.kr`)는 EC2 한 대에서 컨테이너로 돌고, 데이터베이스는 RDS PostgreSQL 18입니다. 이미지는 CI가 만들어 GHCR(`ghcr.io/gdgoc-smu-202602-team6/tamagochi-backend`)에 올립니다. 서버는 이미지를 받아서 돌리기만 하고 빌드하지 않습니다.

| 파일 | 하는 일 |
|---|---|
| `compose.yaml` | 앱 컨테이너와 Caddy(HTTPS 인증서를 스스로 받고 갱신하는 리버스 프록시) |
| `Caddyfile` | `DOMAIN`으로 오는 요청을 앱으로 넘김 |
| `deploy.sh` | 이미지 받기 → DB를 그 릴리스로 맞추기(`prisma/deploy.ts`) → 다시 띄우기 → `/health` 확인 |
| `.env.example` | 서버의 `deploy/.env` 견본 |

## 이미지 태그

| 태그 | 언제 생기나 |
|---|---|
| `main` | main에 푸시할 때마다 |
| `sha-<커밋>` | 커밋마다. 되돌릴 때 씀 |
| `<x.y.z>` | `v<x.y.z>` git 태그를 푸시할 때 |

## 처음 한 번: AWS에서 만들 것

이 저장소는 AWS 리소스를 만들지 않습니다. 콘솔이나 CLI로 사람이 만듭니다.

1. **RDS**: PostgreSQL 18, 데이터베이스 이름 `tamagochi`, 퍼블릭 접근 끔, 자동 백업 켬.
2. **EC2**: t3.micro, Docker와 Docker Compose 플러그인 설치.
3. **보안 그룹**
   - EC2: TCP 80·443과 UDP 443(HTTP/3)은 인터넷에서, 22는 관리자 IP에서만
   - RDS: 5432는 EC2의 보안 그룹에서만
4. **DNS**: `tmgoc.kro.kr`의 하위 도메인 `api`에 A 레코드를 EC2의 탄력적 IP로. Caddy는 80번으로 인증서를 받으므로 배포 전에 DNS가 맞아야 합니다.

## 처음 한 번: 메일(SES)

가입 인증 메일과 비밀번호 재설정 메일은 Amazon SES로 보냅니다. `.env`에 `MAIL_FROM`이 없으면 메일을 보내지 않고 서버 로그에 링크만 남깁니다.

1. **도메인 확인**: SES 콘솔(서울 리전) → 자격 증명 생성 → 도메인 `tmgoc.kro.kr`, Easy DKIM(RSA 2048).
   - SES가 주는 CNAME 3개를 내도메인.한국의 "별칭(CNAME)"에 넣습니다.
   - 확인이 끝나면 `noreply@tmgoc.kro.kr`처럼 이 도메인의 어떤 주소로도 보낼 수 있습니다.
   - Gmail 주소는 보내는 주소로 쓰지 않습니다(DMARC에 걸려 스팸함으로 갑니다).
2. **샌드박스 해제**: 새 계정의 SES는 샌드박스라서, 확인된 주소로만 보낼 수 있습니다. 시험하는 사람의 주소를 SES에 "이메일 주소" 자격 증명으로 하나씩 확인하거나, 계정 대시보드에서 프로덕션 액세스를 요청합니다(AWS 심사).
3. **EC2 인스턴스 역할**: EC2에 IAM 역할을 붙이고 `ses:SendEmail` 권한을 줍니다(리소스는 그 도메인 자격 증명). 액세스 키는 만들지 않습니다.
4. **메타데이터 홉 제한**: 앱은 컨테이너 안에서 인스턴스 역할의 자격 증명을 받으므로, 인스턴스 메타데이터의 IMDSv2 홉 제한이 2 이상이어야 합니다.

```bash
aws ec2 modify-instance-metadata-options --instance-id <인스턴스 ID> --http-put-response-hop-limit 2 --http-tokens required
```

## 처음 한 번: 서버 준비

이 저장소의 `deploy/` 디렉터리를 서버에 복사합니다.

GHCR은 비공개 패키지라 로그인해야 받을 수 있습니다. `read:packages` 권한만 있는 토큰을 씁니다.

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u <GitHub 사용자> --password-stdin
```

`.env.example`을 `deploy/.env`로 복사하고 값을 채웁니다. `.env`는 저장소에 넣지 않습니다.

```bash
cp .env.example .env
```

## HTTPS

Caddy가 `DOMAIN`의 인증서를 받고 만료 전에 갱신합니다. 사람이 할 일은 DNS와 보안 그룹을 맞추고 `.env`에 `ACME_EMAIL`(인증서 문제를 알려 받을 주소)을 넣는 것뿐입니다.

- HTTP(80)로 온 요청은 HTTPS로 넘깁니다. 응답에는 HSTS(`max-age=31536000`)를 붙입니다.
- 발급은 Let's Encrypt로 하고, 실패하면 ZeroSSL로 넘어갑니다. `kro.kr`은 공개 접미사 목록에 없어서, Let's Encrypt의 등록 도메인당 발급 한도를 모든 `kro.kr` 사용자가 함께 쓰기 때문입니다.
- 인증서는 `caddy-data` 볼륨에 남아서, 다시 배포해도 새로 발급하지 않습니다. 이 볼륨은 지우지 않습니다.
- 발급이 안 되면 `docker compose logs caddy`로 원인을 봅니다. 대개 DNS가 아직 EC2를 가리키지 않거나 80번이 막힌 경우입니다.

## 배포와 되돌리기

```bash
./deploy.sh
```

인자 없이 실행하면 `main` 태그를 배포합니다. 특정 커밋이나 버전으로 되돌리거나 고정할 때는 태그를 줍니다.

```bash
./deploy.sh sha-cebe97d
```

DB 스키마는 앞으로만 갑니다. 새 릴리스 파일이 적용된 뒤 옛 이미지로 되돌리면, 옛 코드가 새 스키마에서 돌게 됩니다. 스키마를 바꾸는 릴리스는 옛 코드와 함께 돌 수 있게 씁니다(컬럼은 먼저 더하고, 지우는 것은 다음 릴리스에서).

## 스키마 릴리스

`prisma/deploy.ts`가 KodeKoreaIMS의 릴리스 마이그레이션 방식으로 DB를 맞춥니다.

- 릴리스가 기록되지 않은 빈 DB에는 `prisma/schema.sql`을 적용하고, 지금 버전(`package.json`의 `version`)을 기준(baseline)으로 기록합니다.
- 이미 있는 DB에는 마지막으로 기록한 릴리스보다 새롭고 지금 버전 이하인 `prisma/releases/<x.y.z>.sql`을 버전 순서대로 실행합니다. 파일마다 트랜잭션 하나이고 `schema_releases`에 기록합니다.
- 이미 적용한 파일이 바뀌었거나 없어졌으면, 또는 DB가 지금 버전보다 새로우면 멈춥니다.
- 시드(`prisma/seed/*.sql`)는 멱등이라 배포할 때마다 실행합니다.

스키마를 바꾸는 릴리스를 내는 순서입니다.

1. Prisma 스키마, `openapi.yaml`, `prisma/sql/`을 고칩니다. 새 DB는 이것으로 만들어집니다.
2. 이미 있는 DB를 같은 모양으로 바꾸는 `prisma/releases/<새 버전>.sql`을 손으로 씁니다.
3. `package.json`의 `version`을 새 버전으로 올리고 커밋한 뒤 `v<새 버전>` 태그를 푸시합니다.
4. 서버에서 `./deploy.sh <새 버전>`을 실행합니다.
