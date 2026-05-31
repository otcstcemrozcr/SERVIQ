# SERVIQ Decisions

Bu dosya urun ve mimari kararlarin kisa ADR kaydidir. Kararlar degisirse yeni karar ekle; eski karari silme.

## 2026-05-31 - Dil stratejisi: TR + EN

- **Durum:** Accepted
- **Karar:** SERVIQ arayuzu Turkce ve Ingilizce destekleyecek.
- **Neden:** Urun Turkiye operasyonlarina yakin basliyor, ama SaaS/enterprise hedefi icin Ingilizce hazirlik gerekli.
- **Not:** i18n Stage A tamamlandi; Stage B devam edecek.

## 2026-05-31 - Database provider: Vercel Postgres / Neon-based

- **Durum:** Accepted
- **Karar:** Deploy icin Vercel Postgres secildi.
- **Neden:** Vercel entegrasyonu kolay, serverless mimariye uygun, ucretsiz plan baslangic icin yeterli ve haftalik duraklama riski yok.
- **Alternatifler:** Supabase Postgres, Neon direct.
- **Sonraki adim:** Marketplace'ten provider ekle, `DATABASE_URL` ile migrasyonlari uygula.

## 2026-05-31 - Payment provider: Iyzico temel, digerleri acik

- **Durum:** Accepted with open scope
- **Karar:** Iyzico kesin desteklenecek; Stripe/PayTR gibi alternatifler acik kalacak.
- **Neden:** Turkiye odakli odeme akisi icin Iyzico oncelikli, ama provider lock-in olmasin.
- **Mimari not:** Odeme entegrasyonu adapter/service layer uzerinden tasarlanmali.

## 2026-05-31 - `OPENOPS_*` env rename ertelendi

- **Durum:** Deferred
- **Karar:** Mevcut `OPENOPS_*` env isimleri simdilik korunacak.
- **Neden:** Deploy ve i18n oncelikli; env rename dusuk aciliyetli ve gereksiz risk yaratabilir.
- **Sonraki adim:** Daha genis config temizlik fazinda yeniden degerlendir.

## 2026-05-31 - Offline-first simdilik tam uygulanmayacak

- **Durum:** Accepted
- **Karar:** Offline-first mimari hazir tutulacak, ancak tam offline mod simdilik uygulanmayacak.
- **Neden:** Mevcut oncelik temel is akisi, i18n ve deploy. Offline sync queue, conflict handling ve local cache sonraki faza kalmali.
- **Mimari not:** Mobil teknisyen akisi tasarlanirken offline imza, local draft ve sync queue icin genisleme noktalari korunmali.

## 2026-05-31 - MongoDB kapsam disi

- **Durum:** Rejected
- **Karar:** SERVIQ ana veritabani MongoDB olmayacak.
- **Neden:** Is emri, musteri, ekipman, teknisyen, malzeme, odeme, imza metadata ve ERP sync verileri iliskisel model ve transaction guvencesi gerektiriyor.
- **Sonuc:** PostgreSQL / Vercel Postgres karari korunur. MongoDB bu fazda degerlendirilmeyecek.
