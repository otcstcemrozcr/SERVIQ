"""SAP adapter placeholder for future SERVIQ integration."""
from __future__ import annotations

from ..schemas import AdapterOperationResult


class SapServiceAdapter:
    name = "sap"

    def sync_service_order(self, work_order_id: str) -> AdapterOperationResult:
        return AdapterOperationResult(status="NOT_CONFIGURED", message="SAP adapter is not configured.")
