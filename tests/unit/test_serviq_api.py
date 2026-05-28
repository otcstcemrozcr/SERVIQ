"""Tests for the SERVIQ field service API."""
from __future__ import annotations

import os

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient

os.environ.setdefault("OPENOPS_API_KEY", "test-sentinel-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-that-is-long-enough-32chars")
os.environ.setdefault("OPENOPS_SERVICE_USER_ID", "service-user")

from serviq.db.models import Base  # noqa: E402
from serviq.main import app  # noqa: E402
from serviq.rbac import _clear as _clear_orgs  # noqa: E402
from serviq.routes import serviq as serviq_routes  # noqa: E402


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    monkeypatch.setattr(serviq_routes, "get_session", session_factory)
    _clear_orgs()
    yield TestClient(app, raise_server_exceptions=False)
    _clear_orgs()
    Base.metadata.drop_all(engine)


def _headers(org_id: str = "11111111-1111-1111-1111-111111111111") -> dict[str, str]:
    return {"X-API-Key": "test-sentinel-key", "X-Org-ID": org_id}


def test_serviq_work_order_lifecycle(client: TestClient) -> None:
    create_response = client.post(
        "/serviq/work-orders",
        headers=_headers(),
        json={
            "order_no": "WO-1001",
            "title": "Compressor maintenance",
            "priority": "HIGH",
            "scheduled_for": "2026-05-25T10:00:00Z",
            "customer": {
                "name": "Acme Factory",
                "email": "ops@example.com",
                "is_current_account": True,
            },
            "equipment": {
                "name": "Air compressor",
                "serial_number": "SN-42",
            },
            "technician": {
                "name": "Field Tech",
            },
        },
    )
    assert create_response.status_code == 201
    work_order = create_response.json()
    assert work_order["status"] == "OPEN"
    assert work_order["scheduled_for"].startswith("2026-05-25T10:00:00")
    assert work_order["customer"]["name"] == "Acme Factory"

    work_order_id = work_order["id"]

    start_response = client.post(f"/serviq/work-orders/{work_order_id}/start", headers=_headers())
    assert start_response.status_code == 200
    assert start_response.json()["status"] == "IN_PROGRESS"

    material_response = client.post(
        f"/serviq/work-orders/{work_order_id}/materials",
        headers=_headers(),
        json={
            "material_code": "FILTER-01",
            "material_name": "Filter",
            "quantity": 2,
            "unit": "pcs",
            "status": "USED",
        },
    )
    assert material_response.status_code == 200
    assert material_response.json()["materials"][0]["material_code"] == "FILTER-01"

    complete_response = client.post(
        f"/serviq/work-orders/{work_order_id}/complete",
        headers=_headers(),
    )
    assert complete_response.status_code == 200
    body = complete_response.json()
    assert body["work_order"]["status"] == "COMPLETED"
    assert body["report"]["work_order"]["order_no"] == "WO-1001"


def test_serviq_blocks_completion_without_payment_for_non_current_account(
    client: TestClient,
) -> None:
    response = client.post(
        "/serviq/work-orders",
        headers=_headers(),
        json={
            "order_no": "WO-1002",
            "title": "Repair",
            "customer": {"name": "Cash Customer"},
        },
    )
    assert response.status_code == 201

    work_order_id = response.json()["id"]
    complete_response = client.post(
        f"/serviq/work-orders/{work_order_id}/complete",
        headers=_headers(),
    )
    assert complete_response.status_code == 409
    assert "Payment is required" in complete_response.json()["detail"]


def test_serviq_routes_are_registered_in_openapi(client: TestClient) -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "/serviq/work-orders" in response.json()["paths"]


def test_serviq_pdf_and_assistant_summary(client: TestClient) -> None:
    create_response = client.post(
        "/serviq/work-orders",
        headers=_headers(),
        json={
            "order_no": "WO-1003",
            "title": "Pump inspection",
            "customer": {"name": "Factory", "is_current_account": True},
            "equipment": {"name": "Pump"},
            "technician": {"name": "Tech"},
        },
    )
    assert create_response.status_code == 201
    work_order_id = create_response.json()["id"]

    pdf_response = client.get(f"/serviq/work-orders/{work_order_id}/report.pdf", headers=_headers())
    assert pdf_response.status_code == 200
    assert pdf_response.headers["content-type"] == "application/pdf"
    assert pdf_response.content.startswith(b"%PDF-")

    summary_response = client.post(
        "/serviq/ai/service-summary",
        headers=_headers(),
        json={"work_order_id": work_order_id},
    )
    assert summary_response.status_code == 200
    body = summary_response.json()
    assert "WO-1003" in body["summary"]
    assert "next_actions" in body
