"""SERVIQ API routes for field service operations."""
from __future__ import annotations

from typing import Iterator

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..ai import build_service_summary
from ..db.session import get_session
from ..rbac import OrgContext, Role, require_role
from ..email import EmailProviderStub
from ..models import (
    ServiqCustomer,
    ServiqEquipment,
    ServiqPaymentDetails,
    ServiqServiceReport,
    ServiqSignature,
    ServiqTechnician,
    ServiqTimeTracking,
    ServiqWorkOrder,
    ServiqWorkOrderMaterial,
)
from ..payments import ManualPaymentProvider
from ..pdf import build_service_report_pdf
from ..reports import build_service_report
from ..schemas import (
    AssistantSummaryOut,
    AssistantSummaryRequest,
    CompletionResult,
    EmailRequest,
    MaterialCreate,
    PaymentCreate,
    SignatureCreate,
    TimeTrackingCreate,
    WorkOrderCreate,
    WorkOrderOut,
    WorkOrderStatus,
    WorkOrderUpdate,
)
from ..workflow import ensure_can_complete, ensure_mutable, start_work_order

router = APIRouter(prefix="/serviq", tags=["serviq"])


def db_session() -> Iterator[Session]:
    db = get_session()
    try:
        yield db
    finally:
        db.close()


def _work_order_options():
    return (
        selectinload(ServiqWorkOrder.customer),
        selectinload(ServiqWorkOrder.equipment),
        selectinload(ServiqWorkOrder.technician),
        selectinload(ServiqWorkOrder.materials),
        selectinload(ServiqWorkOrder.time_entries),
        selectinload(ServiqWorkOrder.signatures),
        selectinload(ServiqWorkOrder.payments),
        selectinload(ServiqWorkOrder.reports),
    )


def _get_work_order(db: Session, org_id: str, work_order_id: str) -> ServiqWorkOrder:
    stmt = (
        select(ServiqWorkOrder)
        .where(ServiqWorkOrder.id == work_order_id, ServiqWorkOrder.org_id == org_id)
        .options(*_work_order_options())
    )
    work_order = db.scalars(stmt).first()
    if work_order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "work_order_id not found")
    return work_order


def _serialize_work_order(work_order: ServiqWorkOrder) -> dict:
    return {
        "id": work_order.id,
        "order_no": work_order.order_no,
        "title": work_order.title,
        "status": work_order.status,
        "priority": work_order.priority,
        "scheduled_for": work_order.scheduled_for,
        "visit_notes": work_order.visit_notes,
        "technician_comment": work_order.technician_comment,
        "external_erp_id": work_order.external_erp_id,
        "erp_sync_status": work_order.erp_sync_status,
        "customer": {
            "id": work_order.customer.id,
            "name": work_order.customer.name,
            "code": work_order.customer.code,
            "email": work_order.customer.email,
            "phone": work_order.customer.phone,
            "address": work_order.customer.address,
            "is_current_account": work_order.customer.is_current_account,
            "external_erp_id": work_order.customer.external_erp_id,
        },
        "equipment": None if work_order.equipment is None else {
            "id": work_order.equipment.id,
            "name": work_order.equipment.name,
            "model": work_order.equipment.model,
            "serial_number": work_order.equipment.serial_number,
            "warranty_status": work_order.equipment.warranty_status,
            "external_erp_id": work_order.equipment.external_erp_id,
        },
        "technician": None if work_order.technician is None else {
            "id": work_order.technician.id,
            "name": work_order.technician.name,
            "email": work_order.technician.email,
            "phone": work_order.technician.phone,
            "external_erp_id": work_order.technician.external_erp_id,
        },
        "materials": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "material_code": item.material_code,
                "material_name": item.material_name,
                "quantity": float(item.quantity),
                "unit": item.unit,
                "status": item.status,
                "warehouse_location": item.warehouse_location,
                "serial_number": item.serial_number,
                "batch_number": item.batch_number,
            }
            for item in work_order.materials
        ],
        "time_entries": [
            {
                "id": item.id,
                "arrival_time": item.arrival_time,
                "departure_time": item.departure_time,
                "labor_hours": float(item.labor_hours) if item.labor_hours is not None else None,
                "travel_hours": float(item.travel_hours) if item.travel_hours is not None else None,
                "waiting_hours": float(item.waiting_hours) if item.waiting_hours is not None else None,
                "technician_comment": item.technician_comment,
            }
            for item in work_order.time_entries
        ],
        "signatures": [
            {
                "id": item.id,
                "signer_type": item.signer_type,
                "signer_name": item.signer_name,
                "image_data_url": item.image_data_url,
                "image_url": item.image_url,
            }
            for item in work_order.signatures
        ],
        "payments": [
            {
                "id": item.id,
                "work_order_id": item.work_order_id,
                "method": item.method,
                "status": item.status,
                "amount": float(item.amount) if item.amount is not None else None,
                "currency": item.currency,
                "transaction_id": item.transaction_id,
                "provider": item.provider,
                "provider_payload": item.provider_payload,
            }
            for item in work_order.payments
        ],
        "created_at": work_order.created_at,
        "updated_at": work_order.updated_at,
    }


@router.get("/work-orders", response_model=list[WorkOrderOut])
def list_work_orders(
    org: OrgContext = Depends(require_role(Role.VIEWER)),
    db: Session = Depends(db_session),
) -> list[dict]:
    stmt = (
        select(ServiqWorkOrder)
        .where(ServiqWorkOrder.org_id == org.org_id)
        .options(*_work_order_options())
        .order_by(ServiqWorkOrder.created_at.desc())
    )
    return [_serialize_work_order(item) for item in db.scalars(stmt).all()]


@router.post("/work-orders", status_code=status.HTTP_201_CREATED, response_model=WorkOrderOut)
def create_work_order(
    body: WorkOrderCreate,
    org: OrgContext = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(db_session),
) -> dict:
    customer = ServiqCustomer(org_id=org.org_id, **body.customer.dict())
    db.add(customer)

    equipment = None
    if body.equipment is not None:
        equipment = ServiqEquipment(org_id=org.org_id, customer=customer, **body.equipment.dict())
        db.add(equipment)

    technician = None
    if body.technician is not None:
        technician = ServiqTechnician(org_id=org.org_id, **body.technician.dict())
        db.add(technician)

    work_order = ServiqWorkOrder(
        org_id=org.org_id,
        order_no=body.order_no,
        title=body.title,
        priority=body.priority,
        scheduled_for=body.scheduled_for,
        visit_notes=body.visit_notes,
        customer=customer,
        equipment=equipment,
        technician=technician,
        external_erp_id=body.external_erp_id,
    )
    db.add(work_order)
    db.commit()
    db.refresh(work_order)
    return _serialize_work_order(_get_work_order(db, org.org_id, work_order.id))


@router.get("/work-orders/{work_order_id}", response_model=WorkOrderOut)
def get_work_order(
    work_order_id: str,
    org: OrgContext = Depends(require_role(Role.VIEWER)),
    db: Session = Depends(db_session),
) -> dict:
    return _serialize_work_order(_get_work_order(db, org.org_id, work_order_id))


@router.put("/work-orders/{work_order_id}", response_model=WorkOrderOut)
def update_work_order(
    work_order_id: str,
    body: WorkOrderUpdate,
    org: OrgContext = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(db_session),
) -> dict:
    work_order = _get_work_order(db, org.org_id, work_order_id)
    ensure_mutable(work_order)
    for field, value in body.dict(exclude_unset=True).items():
        setattr(work_order, field, value.value if isinstance(value, WorkOrderStatus) else value)
    db.commit()
    return _serialize_work_order(_get_work_order(db, org.org_id, work_order_id))


@router.post("/work-orders/{work_order_id}/start", response_model=WorkOrderOut)
def start(
    work_order_id: str,
    org: OrgContext = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(db_session),
) -> dict:
    work_order = _get_work_order(db, org.org_id, work_order_id)
    start_work_order(work_order)
    db.commit()
    return _serialize_work_order(_get_work_order(db, org.org_id, work_order_id))


@router.post("/work-orders/{work_order_id}/materials", response_model=WorkOrderOut)
def add_material(
    work_order_id: str,
    body: MaterialCreate,
    org: OrgContext = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(db_session),
) -> dict:
    work_order = _get_work_order(db, org.org_id, work_order_id)
    ensure_mutable(work_order)
    db.add(ServiqWorkOrderMaterial(org_id=org.org_id, work_order_id=work_order.id, **body.dict()))
    db.commit()
    return _serialize_work_order(_get_work_order(db, org.org_id, work_order_id))


@router.post("/work-orders/{work_order_id}/time", response_model=WorkOrderOut)
def add_time_tracking(
    work_order_id: str,
    body: TimeTrackingCreate,
    org: OrgContext = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(db_session),
) -> dict:
    work_order = _get_work_order(db, org.org_id, work_order_id)
    ensure_mutable(work_order)
    db.add(ServiqTimeTracking(org_id=org.org_id, work_order_id=work_order.id, **body.dict()))
    db.commit()
    return _serialize_work_order(_get_work_order(db, org.org_id, work_order_id))


@router.post("/work-orders/{work_order_id}/signatures", response_model=WorkOrderOut)
def add_signature(
    work_order_id: str,
    body: SignatureCreate,
    org: OrgContext = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(db_session),
) -> dict:
    work_order = _get_work_order(db, org.org_id, work_order_id)
    ensure_mutable(work_order)
    db.add(ServiqSignature(org_id=org.org_id, work_order_id=work_order.id, **body.dict()))
    db.commit()
    return _serialize_work_order(_get_work_order(db, org.org_id, work_order_id))


@router.post("/payment", response_model=dict)
def record_payment(
    body: PaymentCreate,
    org: OrgContext = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(db_session),
) -> dict:
    work_order = _get_work_order(db, org.org_id, body.work_order_id)
    ensure_mutable(work_order)
    provider_result = ManualPaymentProvider().authorize(body)
    payment = ServiqPaymentDetails(org_id=org.org_id, **body.dict())
    db.add(payment)
    db.commit()
    return {"payment_id": payment.id, "provider": provider_result.dict()}


@router.post("/work-orders/{work_order_id}/complete", response_model=CompletionResult)
def complete_work_order(
    work_order_id: str,
    org: OrgContext = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(db_session),
) -> dict:
    work_order = _get_work_order(db, org.org_id, work_order_id)
    ensure_can_complete(work_order)
    work_order.status = WorkOrderStatus.COMPLETED.value
    report_data = build_service_report(work_order)
    report = ServiqServiceReport(
        org_id=org.org_id,
        work_order_id=work_order.id,
        report_no=f"SR-{work_order.order_no}",
        data=report_data,
    )
    db.add(report)
    db.commit()
    completed = _get_work_order(db, org.org_id, work_order_id)
    return {"work_order": _serialize_work_order(completed), "report": report_data}


@router.get("/work-orders/{work_order_id}/report")
def get_report(
    work_order_id: str,
    org: OrgContext = Depends(require_role(Role.VIEWER)),
    db: Session = Depends(db_session),
) -> dict:
    work_order = _get_work_order(db, org.org_id, work_order_id)
    if work_order.reports:
        return work_order.reports[-1].data
    return build_service_report(work_order)


@router.get("/work-orders/{work_order_id}/report.pdf")
def get_report_pdf(
    work_order_id: str,
    org: OrgContext = Depends(require_role(Role.VIEWER)),
    db: Session = Depends(db_session),
) -> Response:
    work_order = _get_work_order(db, org.org_id, work_order_id)
    report = work_order.reports[-1].data if work_order.reports else build_service_report(work_order)
    pdf_bytes = build_service_report_pdf(report)
    filename = f"serviq-report-{work_order.order_no}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.post("/email")
def send_email(
    body: EmailRequest,
    org: OrgContext = Depends(require_role(Role.ANALYST)),
    db: Session = Depends(db_session),
) -> dict:
    work_order = _get_work_order(db, org.org_id, body.work_order_id)
    report = work_order.reports[-1].data if work_order.reports else build_service_report(work_order)
    return EmailProviderStub().send_service_report(body, report).dict()


@router.post("/erp/sync")
def sync_erp() -> dict:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "SERVIQ ERP sync adapter is not implemented.")


@router.post("/ai/service-summary", response_model=AssistantSummaryOut)
def service_summary(
    body: AssistantSummaryRequest,
    org: OrgContext = Depends(require_role(Role.VIEWER)),
    db: Session = Depends(db_session),
) -> dict:
    work_order = _get_work_order(db, org.org_id, body.work_order_id)
    return build_service_summary(work_order)
