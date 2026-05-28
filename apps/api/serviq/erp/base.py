"""ERP/SAP integration interfaces for SERVIQ."""
from __future__ import annotations

from typing import Protocol

from ..schemas import AdapterOperationResult


class ServiceErpAdapter(Protocol):
    name: str

    def sync_service_order(self, work_order_id: str) -> AdapterOperationResult:
        ...

    def create_notification(self, work_order_id: str) -> AdapterOperationResult:
        ...

    def post_material_consumption(self, work_order_id: str) -> AdapterOperationResult:
        ...

    def post_goods_return(self, work_order_id: str) -> AdapterOperationResult:
        ...

    def sync_invoice_payment_status(self, work_order_id: str) -> AdapterOperationResult:
        ...
