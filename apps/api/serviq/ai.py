"""AI assistant extension points for SERVIQ.

Implementations must be grounded in work-order data and deterministic service
report facts. This module intentionally exposes contracts only.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from .models import ServiqWorkOrder


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


def _round(value: float) -> float:
    return round(value, 2)


def build_service_summary(work_order: "ServiqWorkOrder") -> dict:
    """Deterministic, rule-based assistant summary grounded in work-order data.

    No LLM is involved yet: every sentence is derived from persisted facts so the
    output is reproducible and auditable. This is the placeholder that the future
    AI ``TechnicianAssistant`` will replace while keeping the same response shape.
    """
    customer_name = work_order.customer.name if work_order.customer else "-"
    equipment_name = work_order.equipment.name if work_order.equipment else None
    technician_name = work_order.technician.name if work_order.technician else None

    used = [m for m in work_order.materials if m.status == "USED"]
    returned = [m for m in work_order.materials if m.status == "RETURNED"]

    labor_hours = _round(sum(float(t.labor_hours or 0) for t in work_order.time_entries))
    travel_hours = _round(sum(float(t.travel_hours or 0) for t in work_order.time_entries))
    waiting_hours = _round(sum(float(t.waiting_hours or 0) for t in work_order.time_entries))

    totals = {
        "materials_count": len(work_order.materials),
        "labor_hours": labor_hours,
        "travel_hours": travel_hours,
        "waiting_hours": waiting_hours,
    }

    summary_parts = [
        f"Work order {work_order.order_no} ({work_order.title}) for {customer_name} "
        f"is currently {work_order.status}.",
    ]
    if equipment_name:
        summary_parts.append(f"Equipment serviced: {equipment_name}.")
    if technician_name:
        summary_parts.append(f"Assigned technician: {technician_name}.")
    summary_parts.append(
        f"{len(used)} material line(s) used and {len(returned)} returned; "
        f"labor {labor_hours}h, travel {travel_hours}h, waiting {waiting_hours}h logged."
    )
    summary = " ".join(summary_parts)

    # Surface gaps that block a clean completion, grounded in what is missing.
    missing: list[str] = []
    if not work_order.time_entries:
        missing.append("No time tracking recorded.")
    if not work_order.signatures:
        missing.append("No signature captured.")
    if not any(s.signer_type == "CUSTOMER" for s in work_order.signatures):
        missing.append("Customer signature missing.")
    if not work_order.materials:
        missing.append("No materials recorded.")
    has_payment = bool(work_order.payments)
    is_current_account = bool(work_order.customer and work_order.customer.is_current_account)
    if not has_payment and not is_current_account:
        missing.append("No payment recorded for a non-current-account customer.")

    # Next actions follow deterministically from status and gaps.
    next_actions: list[str] = []
    if work_order.status == "OPEN":
        next_actions.append("Start the work order to begin field execution.")
    if returned:
        next_actions.append("Process warehouse return for materials marked RETURNED.")
    next_actions.extend(f"Resolve: {item}" for item in missing)
    if work_order.status == "COMPLETED":
        next_actions.append("Send the service report to the customer.")
    if not next_actions:
        next_actions.append("Ready to complete the work order.")

    customer_email_draft = (
        f"Dear {customer_name},\n\n"
        f"This is an update regarding service work order {work_order.order_no} "
        f"({work_order.title}). Current status: {work_order.status}. "
        f"{len(used)} material(s) were used during the visit and "
        f"{labor_hours} labor hour(s) were spent.\n\n"
        "Please contact us if you have any questions.\n\n"
        "Kind regards,\nSERVIQ Field Service"
    )

    erp_notification_text = (
        f"SERVIQ|{work_order.order_no}|status={work_order.status}|"
        f"customer={customer_name}|materials_used={len(used)}|"
        f"materials_returned={len(returned)}|labor_h={labor_hours}|"
        f"travel_h={travel_hours}|waiting_h={waiting_hours}"
    )

    return {
        "summary": summary,
        "next_actions": next_actions,
        "missing": missing,
        "totals": totals,
        "customer_email_draft": customer_email_draft,
        "erp_notification_text": erp_notification_text,
    }


def handle_chat_message(work_order: "ServiqWorkOrder", message: str) -> dict:
    """Simulated conversational AI responses based on keywords."""
    msg_lower = message.lower()
    
    if "özet" in msg_lower or "summary" in msg_lower:
        summary_data = build_service_summary(work_order)
        return {
            "reply": summary_data["summary"] + "\n\nŞu anki eksikleriniz:\n- " + "\n- ".join(summary_data["missing"]),
            "action_suggested": None
        }
        
    if "geçmiş" in msg_lower or "history" in msg_lower:
        equipment_name = work_order.equipment.name if work_order.equipment else "Bu cihaz"
        return {
            "reply": f"{equipment_name} için son 6 ayda 2 servis kaydı bulunuyor. Son kayıt 45 gün önce 'Filtre Değişimi' olarak kapatılmış. Aynı arızanın tekrar etmesi durumunda anakart kontrolü önerilir.",
            "action_suggested": "Kılavuzu Göster"
        }
        
    if "kılavuz" in msg_lower or "manual" in msg_lower:
        return {
            "reply": "Seçili cihazın tamir kılavuzu sisteme yüklü değil, ancak benzer serilerin hata kodlarına göre E-42 hatası 'Su basıncı sensör arızası' anlamına gelmektedir. Sensör kablolarını kontrol etmenizi öneririm.",
            "action_suggested": None
        }
        
    if "müşteri" in msg_lower and ("sms" in msg_lower or "mesaj" in msg_lower or "haber" in msg_lower):
        customer_name = work_order.customer.name if work_order.customer else "Müşteri"
        return {
            "reply": f"{customer_name} adlı müşteriye 'Teknisyenimiz yola çıkmıştır, 30 dakika içinde adresinizde olacaktır' şeklinde SMS gönderildi.",
            "action_suggested": None
        }
        
    # Fallback
    return {
        "reply": f"'{message}' komutunu anladım. Ancak şu an demo modundayım ve sadece belirli komutlara (Özetle, Geçmişi Göster, Müşteriye SMS at) yanıt verebiliyorum.",
        "action_suggested": "İş Emrini Özetle"
    }
