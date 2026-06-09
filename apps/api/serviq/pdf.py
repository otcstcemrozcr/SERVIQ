"""PDF renderer for SERVIQ service reports using fpdf2."""
from __future__ import annotations

import base64
import io

from fpdf import FPDF


class ServiceReportPDF(FPDF):
    def header(self):
        # Header Background
        self.set_fill_color(0, 120, 212)  # Bright Blue
        self.rect(0, 0, 210, 30, 'F')
        
        # Company Name
        self.set_y(10)
        self.set_font("helvetica", "B", 24)
        self.set_text_color(255, 255, 255)
        self.cell(100, 10, "ServiQ AI", ln=0, align="L")
        
        # Report Title
        self.set_font("helvetica", "", 12)
        self.cell(0, 10, "FIELD SERVICE REPORT", ln=1, align="R")
        
        self.ln(15)

    def footer(self):
        self.set_y(-20)
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(2)
        
        self.set_font("helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        # Legal Notice
        self.cell(0, 5, "This document serves as proof of service and is electronically signed.", align="C", ln=1)
        self.cell(0, 5, f"Page {self.page_no()}/{{nb}}", align="C")


def build_service_report_pdf(report: dict) -> bytes:
    pdf = ServiceReportPDF()
    pdf.add_page()

    # 1. Info Block
    work_order = report.get("work_order", {})
    customer = report.get("customer", {})
    equipment = report.get("equipment") or {}
    technician = report.get("technician") or {}

    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(0, 120, 212)
    pdf.cell(0, 10, f"Work Order: {work_order.get('order_no', '-')} - {work_order.get('title', '-')}", ln=True)
    pdf.ln(2)

    info_data = [
        ("Date:", str(report.get("generated_at", "-"))),
        ("Status:", str(work_order.get("status", "-"))),
        ("Customer:", str(customer.get("name", "-"))),
        ("Equipment:", str(equipment.get("name", "-"))),
        ("Technician:", str(technician.get("name", "-"))),
    ]

    # Draw info box
    pdf.set_fill_color(248, 250, 252) # Very light gray/slate
    pdf.set_draw_color(226, 232, 240)
    pdf.rect(10, pdf.get_y(), 190, len(info_data) * 8 + 4, 'DF')
    
    pdf.set_y(pdf.get_y() + 2)
    pdf.set_text_color(50, 50, 50)
    for label, val in info_data:
        pdf.set_font("helvetica", "B", 10)
        pdf.set_x(15)
        pdf.cell(30, 8, label, ln=0)
        pdf.set_font("helvetica", "", 10)
        pdf.cell(0, 8, val, ln=1)

    pdf.ln(10)

    # 2. Materials Table
    materials = report.get("materials", [])
    if materials:
        pdf.set_font("helvetica", "B", 12)
        pdf.set_text_color(0, 120, 212)
        pdf.cell(0, 8, "Materials Used", ln=True)

        # Table Header
        pdf.set_fill_color(0, 120, 212)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("helvetica", "B", 9)
        pdf.cell(40, 8, " Code", border=0, fill=True)
        pdf.cell(80, 8, " Name", border=0, fill=True)
        pdf.cell(30, 8, " Quantity", border=0, fill=True)
        pdf.cell(40, 8, " Status", border=0, fill=True, ln=True)

        # Table Rows
        pdf.set_font("helvetica", "", 9)
        pdf.set_text_color(50, 50, 50)
        fill = False
        for item in materials:
            pdf.set_fill_color(241, 245, 249) if fill else pdf.set_fill_color(255, 255, 255)
            pdf.cell(40, 8, f" {str(item.get('material_code', '-'))}", border=0, fill=True)
            pdf.cell(80, 8, f" {str(item.get('material_name', '-'))}", border=0, fill=True)
            pdf.cell(30, 8, f" {item.get('quantity', '-')} {item.get('unit', '')}", border=0, fill=True)
            pdf.cell(40, 8, f" {str(item.get('status', '-'))}", border=0, fill=True, ln=True)
            fill = not fill
        pdf.ln(8)

    # 3. Time Tracking Table
    time_entries = report.get("time_tracking", [])
    if time_entries:
        pdf.set_font("helvetica", "B", 12)
        pdf.set_text_color(0, 120, 212)
        pdf.cell(0, 8, "Time Tracking", ln=True)

        # Table Header
        pdf.set_fill_color(0, 120, 212)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("helvetica", "B", 9)
        pdf.cell(30, 8, " Labor (hrs)", border=0, fill=True)
        pdf.cell(30, 8, " Travel (hrs)", border=0, fill=True)
        pdf.cell(130, 8, " Technician Note", border=0, fill=True, ln=True)

        # Table Rows
        pdf.set_font("helvetica", "", 9)
        pdf.set_text_color(50, 50, 50)
        fill = False
        for item in time_entries:
            pdf.set_fill_color(241, 245, 249) if fill else pdf.set_fill_color(255, 255, 255)
            pdf.cell(30, 8, f" {str(item.get('labor_hours', 0))}", border=0, fill=True)
            pdf.cell(30, 8, f" {str(item.get('travel_hours', 0))}", border=0, fill=True)
            pdf.cell(130, 8, f" {str(item.get('technician_comment', '-') or '-')}", border=0, fill=True, ln=True)
            fill = not fill
        pdf.ln(8)

    # 4. Signatures (base64 embedded)
    signatures = report.get("signatures", [])
    if signatures:
        # Check if we need a new page for signatures to avoid cutting them
        if pdf.get_y() > 220:
            pdf.add_page()
            
        pdf.set_font("helvetica", "B", 12)
        pdf.set_text_color(0, 120, 212)
        pdf.cell(0, 8, "Signatures", ln=True)
        pdf.ln(2)

        y_before_sig = pdf.get_y()
        x_offset = 10

        for sig in signatures:
            sig_name = sig.get("signer_name", "-")
            sig_type = sig.get("signer_type", "UNKNOWN")
            sig_data = sig.get("image_data_url", "")

            # Draw a box for the signature
            pdf.set_fill_color(250, 250, 250)
            pdf.set_draw_color(200, 200, 200)
            pdf.rect(x_offset, y_before_sig, 85, 35, 'DF')

            # Print label inside box
            pdf.set_text_color(50, 50, 50)
            pdf.set_font("helvetica", "B", 9)
            pdf.set_xy(x_offset + 2, y_before_sig + 2)
            pdf.cell(80, 5, f"{sig_type}: {sig_name}", ln=2)

            # Render image
            if sig_data and sig_data.startswith("data:image"):
                try:
                    header, b64_str = sig_data.split(",", 1)
                    img_bytes = base64.b64decode(b64_str)
                    img_file = io.BytesIO(img_bytes)
                    pdf.image(img_file, x=x_offset + 2, y=pdf.get_y(), w=81)
                except Exception:
                    pdf.cell(80, 5, "(Signature image error)", ln=2)
            else:
                pdf.set_xy(x_offset + 2, y_before_sig + 15)
                pdf.set_text_color(150, 150, 150)
                pdf.cell(81, 5, "No digital signature provided", align="C")

            x_offset += 95
            if x_offset > 150:
                x_offset = 10
                y_before_sig = y_before_sig + 40
                
            # Reset cursor below the signature blocks
            pdf.set_y(max(pdf.get_y(), y_before_sig + 40))

    return pdf.output(dest="S")
