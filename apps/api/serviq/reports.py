"""Service report generation for SERVIQ.

The first implementation returns structured data suitable for later PDF
rendering. No AI-generated facts or hidden calculations are introduced here.
"""
from __future__ import annotations

from datetime import datetime

from .models import ServiqWorkOrder


def build_service_report(work_order: ServiqWorkOrder) -> dict:
    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "work_order": {
            "id": work_order.id,
            "order_no": work_order.order_no,
            "title": work_order.title,
            "status": work_order.status,
            "visit_notes": work_order.visit_notes,
            "technician_comment": work_order.technician_comment,
        },
        "customer": {
            "id": work_order.customer.id,
            "name": work_order.customer.name,
            "code": work_order.customer.code,
            "email": work_order.customer.email,
            "phone": work_order.customer.phone,
            "address": work_order.customer.address,
            "is_current_account": work_order.customer.is_current_account,
        },
        "equipment": None if work_order.equipment is None else {
            "id": work_order.equipment.id,
            "name": work_order.equipment.name,
            "model": work_order.equipment.model,
            "serial_number": work_order.equipment.serial_number,
            "warranty_status": work_order.equipment.warranty_status,
        },
        "technician": None if work_order.technician is None else {
            "id": work_order.technician.id,
            "name": work_order.technician.name,
            "email": work_order.technician.email,
            "phone": work_order.technician.phone,
        },
        "materials": [
            {
                "product_id": material.product_id,
                "material_code": material.material_code,
                "material_name": material.material_name,
                "quantity": float(material.quantity),
                "unit": material.unit,
                "status": material.status,
                "warehouse_location": material.warehouse_location,
                "serial_number": material.serial_number,
                "batch_number": material.batch_number,
            }
            for material in work_order.materials
        ],
        "time_tracking": [
            {
                "arrival_time": item.arrival_time.isoformat() if item.arrival_time else None,
                "departure_time": item.departure_time.isoformat() if item.departure_time else None,
                "labor_hours": float(item.labor_hours) if item.labor_hours is not None else None,
                "travel_hours": float(item.travel_hours) if item.travel_hours is not None else None,
                "waiting_hours": float(item.waiting_hours) if item.waiting_hours is not None else None,
                "technician_comment": item.technician_comment,
            }
            for item in work_order.time_entries
        ],
        "signatures": [
            {
                "signer_type": signature.signer_type,
                "signer_name": signature.signer_name,
                "image_data_url": signature.image_data_url,
                "image_url": signature.image_url,
            }
            for signature in work_order.signatures
        ],
        "payments": [
            {
                "method": payment.method,
                "status": payment.status,
                "amount": float(payment.amount) if payment.amount is not None else None,
                "currency": payment.currency,
                "transaction_id": payment.transaction_id,
                "provider": payment.provider,
            }
            for payment in work_order.payments
        ],
    }
