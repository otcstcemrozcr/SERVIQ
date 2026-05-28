"""Email delivery abstraction for SERVIQ service reports."""
from __future__ import annotations

from typing import Protocol

from .schemas import AdapterOperationResult, EmailRequest


class EmailProvider(Protocol):
    name: str

    def send_service_report(self, request: EmailRequest, report: dict) -> AdapterOperationResult:
        ...


class EmailProviderStub:
    name = "stub"

    def send_service_report(self, request: EmailRequest, report: dict) -> AdapterOperationResult:
        return AdapterOperationResult(
            status="QUEUED",
            message="Email delivery adapter is ready; no provider is configured.",
        )
