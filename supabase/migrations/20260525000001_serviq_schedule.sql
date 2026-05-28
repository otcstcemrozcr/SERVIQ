-- Migration: SERVIQ scheduling support for dashboard calendar views.

ALTER TABLE public.serviq_work_orders
    ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS serviq_work_orders_scheduled_for_idx
    ON public.serviq_work_orders (scheduled_for);
