"""SQLAlchemy models for SERVIQ field service operations."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from serviq.db.models import Base

# Use PostgreSQL JSONB in production but fall back to the generic JSON type on
# other dialects (e.g. SQLite used by the test suite), which lacks JSONB.
JSONColumn = JSONB().with_variant(JSON(), "sqlite")


def _uuid() -> str:
    return str(uuid.uuid4())


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )


class ServiqCustomer(Base, TimestampMixin):
    __tablename__ = "serviq_customers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    code: Mapped[str | None] = mapped_column(String(80))
    email: Mapped[str | None] = mapped_column(String(240))
    phone: Mapped[str | None] = mapped_column(String(80))
    address: Mapped[str | None] = mapped_column(Text)
    is_current_account: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    external_erp_id: Mapped[str | None] = mapped_column(String(120))


class ServiqTechnician(Base, TimestampMixin):
    __tablename__ = "serviq_technicians"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str | None] = mapped_column(String(240))
    phone: Mapped[str | None] = mapped_column(String(80))
    external_erp_id: Mapped[str | None] = mapped_column(String(120))


class ServiqEquipment(Base, TimestampMixin):
    __tablename__ = "serviq_equipment"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    customer_id: Mapped[str | None] = mapped_column(ForeignKey("serviq_customers.id"))
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    model: Mapped[str | None] = mapped_column(String(160))
    serial_number: Mapped[str | None] = mapped_column(String(160), index=True)
    warranty_status: Mapped[str | None] = mapped_column(String(80))
    external_erp_id: Mapped[str | None] = mapped_column(String(120))

    customer: Mapped[ServiqCustomer | None] = relationship()


class ServiqWorkOrder(Base, TimestampMixin):
    __tablename__ = "serviq_work_orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    order_no: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="OPEN", index=True, nullable=False)
    priority: Mapped[str | None] = mapped_column(String(40))
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    visit_notes: Mapped[str | None] = mapped_column(Text)
    technician_comment: Mapped[str | None] = mapped_column(Text)
    customer_id: Mapped[str] = mapped_column(ForeignKey("serviq_customers.id"), nullable=False)
    equipment_id: Mapped[str | None] = mapped_column(ForeignKey("serviq_equipment.id"))
    technician_id: Mapped[str | None] = mapped_column(ForeignKey("serviq_technicians.id"))
    external_erp_id: Mapped[str | None] = mapped_column(String(120))
    erp_sync_status: Mapped[str] = mapped_column(String(40), default="NOT_SYNCED", nullable=False)

    customer: Mapped[ServiqCustomer] = relationship()
    equipment: Mapped[ServiqEquipment | None] = relationship()
    technician: Mapped[ServiqTechnician | None] = relationship()
    materials: Mapped[list[ServiqWorkOrderMaterial]] = relationship(
        back_populates="work_order", cascade="all, delete-orphan"
    )
    time_entries: Mapped[list[ServiqTimeTracking]] = relationship(
        back_populates="work_order", cascade="all, delete-orphan"
    )
    signatures: Mapped[list[ServiqSignature]] = relationship(
        back_populates="work_order", cascade="all, delete-orphan"
    )
    payments: Mapped[list[ServiqPaymentDetails]] = relationship(
        back_populates="work_order", cascade="all, delete-orphan"
    )
    reports: Mapped[list[ServiqServiceReport]] = relationship(
        back_populates="work_order", cascade="all, delete-orphan"
    )


class ServiqWorkOrderMaterial(Base, TimestampMixin):
    __tablename__ = "serviq_work_order_materials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    work_order_id: Mapped[str] = mapped_column(ForeignKey("serviq_work_orders.id"), nullable=False)
    product_id: Mapped[str | None] = mapped_column(String(120))
    material_code: Mapped[str] = mapped_column(String(120), nullable=False)
    material_name: Mapped[str] = mapped_column(String(240), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    warehouse_location: Mapped[str | None] = mapped_column(String(160))
    serial_number: Mapped[str | None] = mapped_column(String(160))
    batch_number: Mapped[str | None] = mapped_column(String(160))

    work_order: Mapped[ServiqWorkOrder] = relationship(back_populates="materials")


class ServiqTimeTracking(Base, TimestampMixin):
    __tablename__ = "serviq_time_tracking"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    work_order_id: Mapped[str] = mapped_column(ForeignKey("serviq_work_orders.id"), nullable=False)
    arrival_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    departure_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    labor_hours: Mapped[float | None] = mapped_column(Numeric(8, 2))
    travel_hours: Mapped[float | None] = mapped_column(Numeric(8, 2))
    waiting_hours: Mapped[float | None] = mapped_column(Numeric(8, 2))
    technician_comment: Mapped[str | None] = mapped_column(Text)

    work_order: Mapped[ServiqWorkOrder] = relationship(back_populates="time_entries")


class ServiqSignature(Base, TimestampMixin):
    __tablename__ = "serviq_signatures"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    work_order_id: Mapped[str] = mapped_column(ForeignKey("serviq_work_orders.id"), nullable=False)
    signer_type: Mapped[str] = mapped_column(String(40), nullable=False)
    signer_name: Mapped[str] = mapped_column(String(160), nullable=False)
    image_data_url: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(Text)

    work_order: Mapped[ServiqWorkOrder] = relationship(back_populates="signatures")


class ServiqPaymentDetails(Base, TimestampMixin):
    __tablename__ = "serviq_payment_details"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    work_order_id: Mapped[str] = mapped_column(ForeignKey("serviq_work_orders.id"), nullable=False)
    method: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    amount: Mapped[float | None] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(8), default="TRY", nullable=False)
    transaction_id: Mapped[str | None] = mapped_column(String(160))
    provider: Mapped[str | None] = mapped_column(String(80))
    provider_payload: Mapped[dict | None] = mapped_column(JSONColumn)

    work_order: Mapped[ServiqWorkOrder] = relationship(back_populates="payments")


class ServiqServiceReport(Base, TimestampMixin):
    __tablename__ = "serviq_service_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    work_order_id: Mapped[str] = mapped_column(ForeignKey("serviq_work_orders.id"), nullable=False)
    report_no: Mapped[str] = mapped_column(String(80), nullable=False)
    data: Mapped[dict] = mapped_column(JSONColumn, nullable=False)
    email_status: Mapped[str] = mapped_column(String(40), default="NOT_SENT", nullable=False)
    pdf_url: Mapped[str | None] = mapped_column(Text)

    work_order: Mapped[ServiqWorkOrder] = relationship(back_populates="reports")
