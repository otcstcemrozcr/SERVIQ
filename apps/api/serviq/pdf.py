"""PDF renderer for SERVIQ service reports using fpdf2."""
from __future__ import annotations

import base64
import io

from fpdf import FPDF


class ServiceReportPDF(FPDF):
    def header(self):
        # Header - Company Info
        self.set_font("helvetica", "B", 18)
        self.set_text_color(0, 120, 212)  # OpenCRM Blue
        self.cell(0, 8, "ServiQ AI", ln=True, align="L")

        self.set_font("helvetica", "I", 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, "Field Service Report", ln=True, align="L")

        # Line separator
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


def build_service_report_pdf(report: dict) -> bytes:
    pdf = ServiceReportPDF()
    pdf.add_page()

    # 1. Info Block
    work_order = report.get("work_order", {})
    customer = report.get("customer", {})
    equipment = report.get("equipment") or {}
    technician = report.get("technician") or {}

    info_data = [
        ("Work Order:", f"{work_order.get('order_no', '-')} - {work_order.get('title', '-')}"),
        ("Date:", str(report.get("generated_at", "-"))),
        ("Status:", str(work_order.get("status", "-"))),
        ("Customer:", str(customer.get("name", "-"))),
        ("Equipment:", str(equipment.get("name", "-"))),
        ("Technician:", str(technician.get("name", "-"))),
    ]

    pdf.set_font("helvetica", size=10)
    pdf.set_text_color(50, 50, 50)
    for label, val in info_data:
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(30, 6, label, ln=0)
        pdf.set_font("helvetica", "", 10)
        pdf.cell(0, 6, val, ln=1)

    pdf.ln(5)

    # 2. Materials Table
    materials = report.get("materials", [])
    if materials:
        pdf.set_font("helvetica", "B", 12)
        pdf.cell(0, 8, "Materials Used", ln=True)

        pdf.set_fill_color(240, 240, 240)
        pdf.set_font("helvetica", "B", 9)
        pdf.cell(40, 7, "Code", border=1, fill=True)
        pdf.cell(80, 7, "Name", border=1, fill=True)
        pdf.cell(30, 7, "Quantity", border=1, fill=True)
        pdf.cell(40, 7, "Status", border=1, fill=True, ln=True)

        pdf.set_font("helvetica", "", 9)
        for item in materials:
            pdf.cell(40, 7, str(item.get("material_code", "-")), border=1)
            pdf.cell(80, 7, str(item.get("material_name", "-")), border=1)
            pdf.cell(30, 7, f"{item.get('quantity', '-')} {item.get('unit', '')}", border=1)
            pdf.cell(40, 7, str(item.get("status", "-")), border=1, ln=True)
        pdf.ln(5)

    # 3. Time Tracking Table
    time_entries = report.get("time_tracking", [])
    if time_entries:
        pdf.set_font("helvetica", "B", 12)
        pdf.cell(0, 8, "Time Tracking", ln=True)

        pdf.set_fill_color(240, 240, 240)
        pdf.set_font("helvetica", "B", 9)
        pdf.cell(30, 7, "Labor (hrs)", border=1, fill=True)
        pdf.cell(30, 7, "Travel (hrs)", border=1, fill=True)
        pdf.cell(130, 7, "Technician Note", border=1, fill=True, ln=True)

        pdf.set_font("helvetica", "", 9)
        for item in time_entries:
            pdf.cell(30, 7, str(item.get("labor_hours", 0)), border=1)
            pdf.cell(30, 7, str(item.get("travel_hours", 0)), border=1)
            pdf.cell(130, 7, str(item.get("technician_comment", "-") or "-"), border=1, ln=True)
        pdf.ln(5)

    # 4. Signatures (base64 embedded)
    signatures = report.get("signatures", [])
    if signatures:
        pdf.set_font("helvetica", "B", 12)
        pdf.cell(0, 8, "Signatures", ln=True)

        y_before_sig = pdf.get_y()
        x_offset = 10

        for sig in signatures:
            sig_name = sig.get("signer_name", "-")
            sig_type = sig.get("signer_type", "UNKNOWN")
            sig_data = sig.get("image_data_url", "")

            # Print label
            pdf.set_font("helvetica", "B", 9)
            pdf.set_xy(x_offset, y_before_sig)
            pdf.cell(80, 5, f"{sig_type}: {sig_name}", ln=2)

            # Render image
            if sig_data and sig_data.startswith("data:image"):
                try:
                    header, b64_str = sig_data.split(",", 1)
                    img_bytes = base64.b64decode(b64_str)
                    img_file = io.BytesIO(img_bytes)
                    pdf.image(img_file, x=x_offset, y=pdf.get_y() + 2, w=60)
                except Exception:
                    pdf.cell(80, 5, "(Signature image error)", ln=2)
            else:
                pdf.cell(80, 5, "(No visual signature)", ln=2)

            x_offset += 90
            if x_offset > 150:
                x_offset = 10
                y_before_sig = pdf.get_y() + 35

    return pdf.output(dest="S")
