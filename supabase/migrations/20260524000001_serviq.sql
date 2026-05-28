-- Migration: SERVIQ field service operations tables.
-- Run after: 20260523000002_rbac.sql

CREATE TABLE IF NOT EXISTS public.serviq_customers (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id             UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    code               TEXT,
    email              TEXT,
    phone              TEXT,
    address            TEXT,
    is_current_account BOOLEAN NOT NULL DEFAULT FALSE,
    external_erp_id    TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS serviq_customers_org_idx ON public.serviq_customers (org_id);

CREATE TABLE IF NOT EXISTS public.serviq_technicians (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    external_erp_id TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS serviq_technicians_org_idx ON public.serviq_technicians (org_id);

CREATE TABLE IF NOT EXISTS public.serviq_equipment (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
    customer_id     UUID REFERENCES public.serviq_customers(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    model           TEXT,
    serial_number   TEXT,
    warranty_status TEXT,
    external_erp_id TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS serviq_equipment_org_idx ON public.serviq_equipment (org_id);
CREATE INDEX IF NOT EXISTS serviq_equipment_serial_idx ON public.serviq_equipment (serial_number);

CREATE TABLE IF NOT EXISTS public.serviq_work_orders (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id             UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
    order_no           TEXT NOT NULL,
    title              TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'OPEN',
    priority           TEXT,
    visit_notes        TEXT,
    technician_comment TEXT,
    customer_id        UUID NOT NULL REFERENCES public.serviq_customers(id),
    equipment_id       UUID REFERENCES public.serviq_equipment(id) ON DELETE SET NULL,
    technician_id      UUID REFERENCES public.serviq_technicians(id) ON DELETE SET NULL,
    external_erp_id    TEXT,
    erp_sync_status    TEXT NOT NULL DEFAULT 'NOT_SYNCED',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS serviq_work_orders_org_idx ON public.serviq_work_orders (org_id);
CREATE INDEX IF NOT EXISTS serviq_work_orders_status_idx ON public.serviq_work_orders (status);
CREATE INDEX IF NOT EXISTS serviq_work_orders_order_no_idx ON public.serviq_work_orders (order_no);

CREATE TABLE IF NOT EXISTS public.serviq_work_order_materials (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id             UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
    work_order_id      UUID NOT NULL REFERENCES public.serviq_work_orders(id) ON DELETE CASCADE,
    product_id         TEXT,
    material_code      TEXT NOT NULL,
    material_name      TEXT NOT NULL,
    quantity           NUMERIC(14, 3) NOT NULL,
    unit               TEXT NOT NULL,
    status             TEXT NOT NULL,
    warehouse_location TEXT,
    serial_number      TEXT,
    batch_number       TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS serviq_materials_org_idx ON public.serviq_work_order_materials (org_id);
CREATE INDEX IF NOT EXISTS serviq_materials_work_order_idx ON public.serviq_work_order_materials (work_order_id);

CREATE TABLE IF NOT EXISTS public.serviq_time_tracking (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
    work_order_id       UUID NOT NULL REFERENCES public.serviq_work_orders(id) ON DELETE CASCADE,
    arrival_time        TIMESTAMPTZ,
    departure_time      TIMESTAMPTZ,
    labor_hours         NUMERIC(8, 2),
    travel_hours        NUMERIC(8, 2),
    waiting_hours       NUMERIC(8, 2),
    technician_comment  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS serviq_time_tracking_org_idx ON public.serviq_time_tracking (org_id);
CREATE INDEX IF NOT EXISTS serviq_time_tracking_work_order_idx ON public.serviq_time_tracking (work_order_id);

CREATE TABLE IF NOT EXISTS public.serviq_signatures (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id         UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
    work_order_id  UUID NOT NULL REFERENCES public.serviq_work_orders(id) ON DELETE CASCADE,
    signer_type    TEXT NOT NULL,
    signer_name    TEXT NOT NULL,
    image_data_url TEXT,
    image_url      TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS serviq_signatures_org_idx ON public.serviq_signatures (org_id);
CREATE INDEX IF NOT EXISTS serviq_signatures_work_order_idx ON public.serviq_signatures (work_order_id);

CREATE TABLE IF NOT EXISTS public.serviq_payment_details (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
    work_order_id    UUID NOT NULL REFERENCES public.serviq_work_orders(id) ON DELETE CASCADE,
    method           TEXT NOT NULL,
    status           TEXT NOT NULL,
    amount           NUMERIC(14, 2),
    currency         TEXT NOT NULL DEFAULT 'TRY',
    transaction_id   TEXT,
    provider         TEXT,
    provider_payload JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS serviq_payment_details_org_idx ON public.serviq_payment_details (org_id);
CREATE INDEX IF NOT EXISTS serviq_payment_details_work_order_idx ON public.serviq_payment_details (work_order_id);

CREATE TABLE IF NOT EXISTS public.serviq_service_reports (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES public.serviq_work_orders(id) ON DELETE CASCADE,
    report_no     TEXT NOT NULL,
    data          JSONB NOT NULL,
    email_status  TEXT NOT NULL DEFAULT 'NOT_SENT',
    pdf_url       TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS serviq_service_reports_org_idx ON public.serviq_service_reports (org_id);
CREATE INDEX IF NOT EXISTS serviq_service_reports_work_order_idx ON public.serviq_service_reports (work_order_id);

ALTER TABLE public.serviq_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serviq_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serviq_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serviq_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serviq_work_order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serviq_time_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serviq_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serviq_payment_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serviq_service_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "serviq_customers: org members read"
    ON public.serviq_customers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_customers.org_id
          AND org_members.user_id = auth.uid()
    ));

CREATE POLICY "serviq_technicians: org members read"
    ON public.serviq_technicians FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_technicians.org_id
          AND org_members.user_id = auth.uid()
    ));

CREATE POLICY "serviq_equipment: org members read"
    ON public.serviq_equipment FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_equipment.org_id
          AND org_members.user_id = auth.uid()
    ));

CREATE POLICY "serviq_work_orders: org members read"
    ON public.serviq_work_orders FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_work_orders.org_id
          AND org_members.user_id = auth.uid()
    ));

CREATE POLICY "serviq_work_order_materials: org members read"
    ON public.serviq_work_order_materials FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_work_order_materials.org_id
          AND org_members.user_id = auth.uid()
    ));

CREATE POLICY "serviq_time_tracking: org members read"
    ON public.serviq_time_tracking FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_time_tracking.org_id
          AND org_members.user_id = auth.uid()
    ));

CREATE POLICY "serviq_signatures: org members read"
    ON public.serviq_signatures FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_signatures.org_id
          AND org_members.user_id = auth.uid()
    ));

CREATE POLICY "serviq_payment_details: org members read"
    ON public.serviq_payment_details FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_payment_details.org_id
          AND org_members.user_id = auth.uid()
    ));

CREATE POLICY "serviq_service_reports: org members read"
    ON public.serviq_service_reports FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_service_reports.org_id
          AND org_members.user_id = auth.uid()
    ));

CREATE POLICY "serviq_customers: analysts and owners write"
    ON public.serviq_customers FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_customers.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_customers.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ));

CREATE POLICY "serviq_technicians: analysts and owners write"
    ON public.serviq_technicians FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_technicians.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_technicians.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ));

CREATE POLICY "serviq_equipment: analysts and owners write"
    ON public.serviq_equipment FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_equipment.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_equipment.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ));

CREATE POLICY "serviq_work_orders: analysts and owners write"
    ON public.serviq_work_orders FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_work_orders.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_work_orders.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ));

CREATE POLICY "serviq_work_order_materials: analysts and owners write"
    ON public.serviq_work_order_materials FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_work_order_materials.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_work_order_materials.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ));

CREATE POLICY "serviq_time_tracking: analysts and owners write"
    ON public.serviq_time_tracking FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_time_tracking.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_time_tracking.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ));

CREATE POLICY "serviq_signatures: analysts and owners write"
    ON public.serviq_signatures FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_signatures.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_signatures.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ));

CREATE POLICY "serviq_payment_details: analysts and owners write"
    ON public.serviq_payment_details FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_payment_details.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_payment_details.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ));

CREATE POLICY "serviq_service_reports: analysts and owners write"
    ON public.serviq_service_reports FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_service_reports.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = serviq_service_reports.org_id
          AND org_members.user_id = auth.uid()
          AND org_members.role IN ('analyst', 'owner')
    ));
