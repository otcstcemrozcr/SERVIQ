"""SERVIQ workflow rules kept separate from HTTP and persistence details."""
from __future__ import annotations

from fastapi import HTTPException, status

from .models import ServiqWorkOrder
from .schemas import PaymentStatus, WorkOrderStatus

_COMPLETION_PAYMENT_STATUSES = {
    PaymentStatus.PAID.value,
    PaymentStatus.PAYMENT_PENDING.value,
    PaymentStatus.CURRENT_ACCOUNT.value,
}


def ensure_mutable(work_order: ServiqWorkOrder) -> None:
    if work_order.status in {WorkOrderStatus.COMPLETED.value, WorkOrderStatus.CANCELLED.value}:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Work order {work_order.status.lower()} records cannot be modified.",
        )


def ensure_can_complete(work_order: ServiqWorkOrder) -> None:
    ensure_mutable(work_order)

    if work_order.customer.is_current_account:
        return

    if any(payment.status in _COMPLETION_PAYMENT_STATUSES for payment in work_order.payments):
        return

    raise HTTPException(
        status.HTTP_409_CONFLICT,
        "Payment is required before completion. Allowed statuses: PAID, PAYMENT_PENDING, CURRENT_ACCOUNT.",
    )


def start_work_order(work_order: ServiqWorkOrder) -> None:
    ensure_mutable(work_order)
    if work_order.status == WorkOrderStatus.OPEN.value:
        work_order.status = WorkOrderStatus.IN_PROGRESS.value
