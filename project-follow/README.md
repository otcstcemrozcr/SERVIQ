# project-follow

Proje takip klasörü. Repo ile birlikte commit edilir, VS Code Explorer'da görünür.

## Ana dosyalar

- **[01-master-prompt.md](01-master-prompt.md)** — SERVIQ resmi mimari brief'i (vizyon, 9 modül, data model, API, frontend, UX, "önce analiz et" kuralı). Tüm planlama/uygulama kararları buna göre ölçülür.
- **[current-session.md](current-session.md)** — Yeni AI oturumları için kısa güncel pusula: aktif branch, tamamlanan işler, sıradaki öneriler ve çalışma kuralları.
- **[decisions.md](decisions.md)** — Mimari ve ürün kararları için ADR benzeri kısa kayıt.
- **[backlog.md](backlog.md)** — İş sırası: Now / Next / Later.
- **[session-template.md](session-template.md)** — Yeni AI oturumlarında kullanılacak standart başlangıç prompt'u.
- **[deploy-runbook.md](deploy-runbook.md)** — Vercel Postgres, backend/frontend deploy, env vars ve smoke test adımları.

## Durum dosyaları

- **[02-status-2026-05-28.md](02-status-2026-05-28.md)** — Durum fotoğrafı: tamamlanan commit'ler, açık kontrat uyumsuzlukları, onay bekleyen Phase 0 planı, 8 açık soru.
- **[03-status-2026-05-30.md](03-status-2026-05-30.md)** — Phase 0 tamamlandı (commit `e5af2e0`): 4 kontrat uyumsuzluğu kapandı, pytest yeşil. Env rename ertelendi. Kalan 8 açık soru sıradaki oturumda.
- **[04-status-2026-05-31.md](04-status-2026-05-31.md)** — i18n Stage A tamamlandı (commit `b8de224`): dashboard TR/EN. Deploy planlaması başlandı: Vercel Postgres (Neon) seçildi, FastAPI scaffold tasarlandı. 6 işlem immediate, Stage B ve 8 soru kaldı.
- **[05-status-2026-05-31.md](05-status-2026-05-31.md)** — project-follow süreci iyileştirildi, i18n Stage B tamamlandı, `tsc` ve `next build` doğrulandı. Sıradaki ana iş deploy.
- **[06-status-2026-06-04.md](06-status-2026-06-04.md)** — CURRENT. Neon production DB kuruldu, backend/frontend Vercel deploy edildi, live API smoke testleri geçti.

> Not: Aynı dosyalar Claude'un kalıcı hafızasında da duruyor (`~/.claude/projects/c--Users-ozcir-Desktop-ServiQ/memory/`). Buradaki kopya **insan-okur** içindir; Claude otomatik olarak hafıza yolundakini yükler.

## Yeni durum notu eklerken

`03-status-YYYY-MM-DD.md` şeklinde yeni dosya ekle, README'deki listeye satır ekle.

## Yeni AI oturumu baslatirken

Kisa kullanim:

```text
SERVIQ uzerinde calisiyoruz. Once project-follow/01-master-prompt.md,
project-follow/current-session.md, project-follow/decisions.md,
project-follow/backlog.md ve project-follow/README.md dosyalarini oku.
Sonra gorev icin analiz, dosya listesi, riskler ve validation plani cikar.
Kullanici onayi olmadan kod yazma.
```

Daha tam sablon icin [session-template.md](session-template.md) kullan.
