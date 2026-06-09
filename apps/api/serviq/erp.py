"""ERP Integration Adapter for SERVIQ.

Provides a stub implementation for syncing work orders with external ERP systems like SAP, Logo, and Mikro.
"""
from __future__ import annotations

import logging
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ServiqWorkOrder

logger = logging.getLogger(__name__)


class ERPAdapter(Protocol):
    def sync_all(self, db: Session, org_id: str) -> dict:
        """Synchronizes data between SERVIQ and the external ERP.
        
        Returns a dictionary containing summary statistics of the sync operation.
        """
        ...


class StubERPAdapter:
    """A simulated ERP adapter for demonstration purposes."""

    def sync_all(self, db: Session, org_id: str) -> dict:
        summary = {
            "pushed_to_erp": 0,
            "pulled_from_erp": 0,
            "failed": 0,
            "logs": []
        }

        # 1. PUSH: Find COMPLETED work orders that have not been synced
        unsynced_orders = db.execute(
            select(ServiqWorkOrder).where(
                ServiqWorkOrder.org_id == org_id,
                ServiqWorkOrder.status == "COMPLETED",
                ServiqWorkOrder.erp_sync_status == "NOT_SYNCED"
            )
        ).scalars().all()

        for order in unsynced_orders:
            try:
                # Simulate pushing data to ERP (SAP/Logo)
                logger.info(f"Pushing Work Order {order.order_no} to ERP...")
                order.erp_sync_status = "SYNCED"
                order.external_erp_id = f"ERP-{order.order_no}"
                
                summary["pushed_to_erp"] += 1
                summary["logs"].append(f"Work Order {order.order_no} successfully invoiced in ERP.")
            except Exception as e:
                logger.error(f"Failed to push {order.order_no} to ERP: {e}")
                summary["failed"] += 1

        db.commit()

        # 2. PULL: Simulate pulling a new job from ERP (For demo purposes, we just return a message if requested,
        # but to keep the demo clean, we'll just log that we checked for new jobs).
        logger.info("Checking ERP for new work orders...")
        summary["logs"].append("Checked ERP for new assignments. No new jobs found.")

        return summary
