"""Small PDF renderer for SERVIQ service reports.

This intentionally avoids a heavyweight dependency. It emits a simple PDF with
plain text content suitable for downloading, archiving, and emailing later.
"""
from __future__ import annotations

from textwrap import wrap


def _pdf_text(value: object) -> str:
    return str(value).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_service_report_pdf(report: dict) -> bytes:
    lines = ["SERVIQ Service Report", ""]
    work_order = report.get("work_order", {})
    customer = report.get("customer", {})
    equipment = report.get("equipment") or {}
    technician = report.get("technician") or {}

    lines.extend(
        [
            f"Report generated: {report.get('generated_at', '-')}",
            f"Work order: {work_order.get('order_no', '-')} - {work_order.get('title', '-')}",
            f"Status: {work_order.get('status', '-')}",
            f"Customer: {customer.get('name', '-')}",
            f"Equipment: {equipment.get('name', '-')}",
            f"Technician: {technician.get('name', '-')}",
            "",
            "Materials",
        ]
    )
    materials = report.get("materials", [])
    if materials:
        for item in materials:
            lines.append(
                f"- {item.get('material_code', '-')}: {item.get('material_name', '-')} "
                f"{item.get('quantity', '-')} {item.get('unit', '')} ({item.get('status', '-')})"
            )
    else:
        lines.append("- none")

    lines.extend(["", "Time Tracking"])
    time_entries = report.get("time_tracking", [])
    if time_entries:
        for item in time_entries:
            lines.append(
                f"- labor={item.get('labor_hours', 0)}, travel={item.get('travel_hours', 0)}, "
                f"waiting={item.get('waiting_hours', 0)}"
            )
    else:
        lines.append("- none")

    lines.extend(["", "Payments"])
    payments = report.get("payments", [])
    if payments:
        for item in payments:
            lines.append(
                f"- {item.get('method', '-')}: {item.get('status', '-')} "
                f"{item.get('amount', '-') or ''} {item.get('currency', '')}"
            )
    else:
        lines.append("- none")

    stream_lines: list[str] = ["BT", "/F1 11 Tf", "50 790 Td", "14 TL"]
    first = True
    for line in lines:
        wrapped = wrap(line, width=90) or [""]
        for part in wrapped:
            if first:
                stream_lines.append(f"({_pdf_text(part)}) Tj")
                first = False
            else:
                stream_lines.append(f"T* ({_pdf_text(part)}) Tj")
    stream_lines.append("ET")
    content = "\n".join(stream_lines).encode("latin-1", errors="replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n" + content + b"\nendstream",
    ]

    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{index} 0 obj\n".encode())
        output.extend(obj)
        output.extend(b"\nendobj\n")

    xref_offset = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode())
    output.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n".encode()
    )
    return bytes(output)
