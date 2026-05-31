# SERVIQ Backlog

Bu dosya is sirasi icindir. Detayli kapsam icin `01-master-prompt.md`, son durum icin `current-session.md` okunur.

## Now

- Vercel Postgres setup.
- DB migration: `supabase/migrations/` SQL dosyalarini yeni DB'ye uygula.
- Backend deploy: `serviq-api`.
- Frontend deploy: `serviq-web`.
- CORS config: frontend domain'ini backend `CORS_ORIGINS` icine ekle.

## Next

- Work order detail page iyilestirmeleri.
- Mobile technician workflow.
- `SignaturePad`.
- `PaymentModal`.
- `MaterialUsageTable`.
- `TimeTrackingForm`.

## Later

- ERP adapters: SAP, Logo, Mikro, Netsis.
- AI technician assistant.
- Offline sync queue.
- Predictive maintenance.
- PDF/email automation.

## Acik kararlar

- Hangi ERP once desteklenecek?
- E-fatura saglayici hangisi olacak?
- Iyzico disinda Stripe veya PayTR gerekli mi?
- Teknisyen auth modeli cihaz login mi, QR/tek-kod mu?
- Mobil strateji PWA mi, React Native mi?
- Imza/foto storage base64 mi, object storage mi?
