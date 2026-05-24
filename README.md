# SERVIQ

SERVIQ is the field service operations module planned for OpenOps AI / OneOpenERP.

This initial commit contains the backend service skeleton:

- FastAPI route definitions for work orders, materials, time tracking, signatures, payments, reports, email, ERP sync placeholder, and AI assistant placeholder
- SQLAlchemy domain models for PostgreSQL/Supabase-compatible persistence
- Pydantic API schemas and workflow validation rules
- Adapter extension points for payment, email, AI technician assistant, and ERP/SAP integrations

The implementation is intentionally incomplete and should be integrated with the main OpenOps AI application before production use.
