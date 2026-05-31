# SERVIQ Deploy Runbook

Bu dosya production deploy icin kisa kontrol listesidir. Ana DB karari PostgreSQL / Vercel Postgres olarak kalir.

## 1. Vercel projeleri

Iki ayri Vercel project kullan:

- `serviq-api`
  - Root directory: `apps/api`
  - Framework: FastAPI / Python
  - Entrypoint: `serviq.main:app`
- `serviq-web`
  - Root directory: `apps/web`
  - Framework: Next.js

## 2. Vercel Postgres

1. Vercel Marketplace uzerinden Postgres provider ekle.
2. Provider'i `serviq-api` projesine bagla.
3. `DATABASE_URL` env var'in otomatik geldigini kontrol et.

## 3. DB migration

Migration dosyalari sirasiyla calistirilir:

1. `supabase/migrations/20260524000001_serviq.sql`
2. `supabase/migrations/20260525000001_serviq_schedule.sql`

Not: SQL'leri production DB uzerinde calistirmadan once hedef DB'nin dogru proje oldugunu kontrol et.

## 4. Backend env vars

`serviq-api` icin:

```text
APP_ENV=production
DATABASE_URL=<vercel-postgres-url>
OPENOPS_API_KEY=<strong-random-secret>
OPENOPS_SERVICE_USER_ID=service
DOCS_TOKEN=<strong-random-secret>
CORS_ORIGINS=<frontend-url>
RATE_LIMIT_PER_MINUTE=60
MAX_BODY_BYTES=10485760
```

## 5. Frontend env vars

`serviq-web` icin:

```text
NEXT_PUBLIC_API_URL=<backend-url>
```

## 6. Deploy sirasi

1. Backend'i deploy et.
2. Backend health check:
   - `GET <backend-url>/health`
3. Frontend'i deploy et.
4. Frontend URL'ini backend `CORS_ORIGINS` env var'ina ekle.
5. Backend'i yeniden deploy et.
6. Frontend uzerinden SERVIQ ekranini ac ve is emri listesinin API'ye baglandigini kontrol et.

## 7. Smoke test

- `GET /health` -> `{"status":"ok"}`
- `GET /serviq/work-orders` -> API key yoksa 401, dogru key ile liste.
- Frontend `/serviq` -> TR/EN toggle calisir.
- Frontend `/serviq/dashboard` -> dashboard acilir.

## 8. Notlar

- `OPENOPS_*` env isimleri simdilik korunur.
- MongoDB kapsam disidir; ana DB PostgreSQL olarak kalir.
- Offline-first tam uygulanmayacak, ancak ileride local cache / sync queue icin mimari hazir tutulacak.
