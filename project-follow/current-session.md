# SERVIQ Current Session

Bu dosya yeni AI oturumlari icin kisa pusuladir. Detayli vizyon ve kurallar icin once `01-master-prompt.md` okunmalidir.

## Kisa ozet

SERVIQ, OpenOps AI / OneOpenERP icin AI-native saha servis operasyon moduludur. Hedef; is emirleri, teknisyen mobil akisi, malzeme kullanimi, zaman takibi, imza, odeme, servis raporu, e-posta, ERP/SAP entegrasyonu ve ileride AI teknisyen asistani icin olceklenebilir bir temel kurmaktir.

## Aktif branch

- `main`

## Tamamlanan isler

- Phase 0 tamamlandi; backend/frontend kontrat bosluklari kapatildi.
- Pytest dogrulamasi: 4/4 yesil.
- i18n Stage A tamamlandi; dashboard TR/EN katalog sistemine tasindi.
- i18n Stage B tamamlandi; ana is emri ekrani TR/EN katalog sistemine tasindi.
- `tsc` ve `next build` dogrulamasi temiz.
- Production deploy tamamlandi.
- Database karari Vercel Postgres / Neon-based olarak kaydedildi.
- Backend Vercel entrypoint ve deploy runbook hazirlandi.
- Neon resource `serviq-postgres`, `serviq-api` projesine baglandi.
- Production DB semasi SQLAlchemy modellerinden olusturuldu.
- `serviq-api` production env vars ayarlandi ve `https://serviq-api.vercel.app` deploy edildi.
- `serviq-web` production env vars ayarlandi ve `https://serviq-web.vercel.app/serviq` deploy edildi.
- Canli smoke test: `GET /health`, authenticated `GET /serviq/work-orders` ve authenticated `POST /serviq/work-orders` basarili.

## Siradaki onerilen isler

1. Work order detail page iyilestirmeleri.
2. Mobile technician workflow.
3. SignaturePad.
4. PaymentModal.
5. MaterialUsageTable.
6. TimeTrackingForm.

## AI calisma kurallari

- Her SERVIQ gorevinden once `01-master-prompt.md`, `current-session.md`, `decisions.md` ve `backlog.md` oku.
- Kod yazmadan once mevcut kodu analiz et ve uygulanabilir plan cikar.
- Degisecek dosyalari, riskleri ve validation planini listele.
- Kullanici onayi olmadan kod degisikligi yapma.
- `01-master-prompt.md` dosyasini degistirme.
- Status dosyalarini gecmis kayit olarak koru; yeni durum gerekiyorsa yeni status dosyasi ekle.
- Mimari kararlar `decisions.md`, is sirasi `backlog.md` icinde tutulur.
