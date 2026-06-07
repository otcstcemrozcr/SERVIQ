# SERVIQ

SERVIQ is the field service operations module planned for OpenOps AI / OneOpenERP.

**Status:** Production deploy live on Vercel (backend + frontend + Neon Postgres). See [project-follow](project-follow/) for architecture, deploy runbook, and strategic ideas.

## Core Components

- FastAPI backend: work orders, materials, time tracking, signatures, payments, reports, email, ERP sync, AI technician assistant
- SQLAlchemy domain models for PostgreSQL/Neon persistence
- Pydantic API schemas and workflow validation rules
- Adapter extension points for payment, email, AI, and ERP/SAP integrations
- Next.js frontend with i18n (TR/EN), demo and authenticated modes
- Live demo: `https://serviq-web.vercel.app/serviq` (no login required)

## Documentation & Planning

Start here: **[project-follow/](project-follow/)**
- **[01-master-prompt.md](project-follow/01-master-prompt.md)** — Architecture brief (9 modules, data model, vision)
- **[06-status-2026-06-04.md](project-follow/06-status-2026-06-04.md)** — Production deployment snapshot
- **[07-ideas-2026-06-07.md](project-follow/07-ideas-2026-06-07.md)** — Post-MVP expansion ideas (product features, go-to-market, content)
- **[backlog.md](project-follow/backlog.md)** — Work prioritization (Now/Next/Later)
