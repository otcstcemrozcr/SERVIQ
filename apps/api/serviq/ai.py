"""AI assistant extension points for SERVIQ.

Implementations must be grounded in work-order data and deterministic service
report facts. This module intentionally exposes contracts only.
"""
from __future__ import annotations

from typing import Protocol


class TechnicianAssistant(Protocol):
    def service_summary(self, work_order_id: str) -> dict:
        ...

    def fault_diagnosis(self, work_order_id: str) -> dict:
        ...

    def recommended_parts(self, work_order_id: str) -> dict:
        ...

    def next_maintenance_recommendation(self, work_order_id: str) -> dict:
        ...

    def customer_email_draft(self, work_order_id: str) -> dict:
        ...

    def erp_notification_text(self, work_order_id: str) -> dict:
        ...
