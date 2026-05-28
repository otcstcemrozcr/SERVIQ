"""Pydantic schemas and enums for SERVIQ APIs."""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class WorkOrderStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class MaterialStatus(str, Enum):
    USED = "USED"
    RETURNED = "RETURNED"


class PaymentMethod(str, Enum):
    CURRENT_ACCOUNT = "CURRENT_ACCOUNT"
    CASH = "CASH"
    CREDIT_CARD = "CREDIT_CARD"
    VIRTUAL_POS = "VIRTUAL_POS"


class PaymentStatus(str, Enum):
    PAID = "PAID"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    CURRENT_ACCOUNT = "CURRENT_ACCOUNT"
    UNPAID = "UNPAID"
    FAILED = "FAILED"


class SignerType(str, Enum):
    CUSTOMER = "CUSTOMER"
    TECHNICIAN = "TECHNICIAN"


class ErpSyncStatus(str, Enum):
    NOT_SYNCED = "NOT_SYNCED"
    PENDING = "PENDING"
    SYNCED = "SYNCED"
    FAILED = "FAILED"


class CustomerBase(BaseModel):
    name: str
    code: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    is_current_account: bool = False
    external_erp_id: str | None = None


class CustomerOut(CustomerBase):
    id: str

    class Config:
        orm_mode = True


class TechnicianBase(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    external_erp_id: str | None = None


class TechnicianOut(TechnicianBase):
    id: str

    class Config:
        orm_mode = True


class EquipmentBase(BaseModel):
    name: str
    model: str | None = None
    serial_number: str | None = None
    warranty_status: str | None = None
    external_erp_id: str | None = None


class EquipmentOut(EquipmentBase):
    id: str

    class Config:
        orm_mode = True


class MaterialCreate(BaseModel):
    product_id: str | None = None
    material_code: str
    material_name: str
    quantity: float = Field(gt=0)
    unit: str
    status: MaterialStatus
    warehouse_location: str | None = None
    serial_number: str | None = None
    batch_number: str | None = None


class MaterialOut(MaterialCreate):
    id: str

    class Config:
        orm_mode = True


class TimeTrackingCreate(BaseModel):
    arrival_time: datetime | None = None
    departure_time: datetime | None = None
    labor_hours: float | None = Field(default=None, ge=0)
    travel_hours: float | None = Field(default=None, ge=0)
    waiting_hours: float | None = Field(default=None, ge=0)
    technician_comment: str | None = None


class TimeTrackingOut(TimeTrackingCreate):
    id: str

    class Config:
        orm_mode = True


class SignatureCreate(BaseModel):
    signer_type: SignerType
    signer_name: str
    image_data_url: str | None = None
    image_url: str | None = None


class SignatureOut(SignatureCreate):
    id: str

    class Config:
        orm_mode = True


class PaymentCreate(BaseModel):
    work_order_id: str
    method: PaymentMethod
    status: PaymentStatus
    amount: float | None = Field(default=None, ge=0)
    currency: str = "TRY"
    transaction_id: str | None = None
    provider: str | None = None
    provider_payload: dict | None = None


class PaymentOut(PaymentCreate):
    id: str

    class Config:
        orm_mode = True


class WorkOrderCreate(BaseModel):
    order_no: str
    title: str
    priority: str | None = None
    visit_notes: str | None = None
    customer: CustomerBase
    equipment: EquipmentBase | None = None
    technician: TechnicianBase | None = None
    external_erp_id: str | None = None


class WorkOrderUpdate(BaseModel):
    title: str | None = None
    status: WorkOrderStatus | None = None
    priority: str | None = None
    visit_notes: str | None = None
    technician_comment: str | None = None


class WorkOrderOut(BaseModel):
    id: str
    order_no: str
    title: str
    status: WorkOrderStatus
    priority: str | None = None
    visit_notes: str | None = None
    technician_comment: str | None = None
    external_erp_id: str | None = None
    erp_sync_status: ErpSyncStatus
    customer: CustomerOut
    equipment: EquipmentOut | None = None
    technician: TechnicianOut | None = None
    materials: list[MaterialOut] = []
    time_entries: list[TimeTrackingOut] = []
    signatures: list[SignatureOut] = []
    payments: list[PaymentOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class CompletionResult(BaseModel):
    work_order: WorkOrderOut
    report: dict


class EmailRequest(BaseModel):
    work_order_id: str
    to_email: str
    subject: str | None = None


class AdapterOperationResult(BaseModel):
    status: str
    message: str
    provider_reference: str | None = None
