"""Payment abstraction points for SERVIQ."""
from __future__ import annotations

from typing import Protocol

from .schemas import AdapterOperationResult, PaymentCreate


class PaymentProvider(Protocol):
    name: str

    def authorize(self, payment: PaymentCreate) -> AdapterOperationResult:
        ...


class ManualPaymentProvider:
    name = "manual"

    def authorize(self, payment: PaymentCreate) -> AdapterOperationResult:
        return AdapterOperationResult(
            status=payment.status.value,
            message="Manual payment status recorded.",
            provider_reference=payment.transaction_id,
        )
