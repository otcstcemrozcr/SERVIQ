"use client";

import { Card, Button, colors } from "@/components/ui";
import { type ServiqWorkOrder } from "@/lib/api";
import { type MessageKey } from "@/lib/i18n";
import { Download, Mail, FileText } from "lucide-react";

function compactDate(value: string | null, locale: string) {
  if (!value) return "---";
  return new Date(value).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ 
        margin: "0 0 16px 0", 
        fontSize: 13, 
        fontWeight: 600, 
        color: colors.text, 
        textTransform: "uppercase", 
        letterSpacing: "0.05em",
        paddingBottom: 8, 
        borderBottom: `1px solid ${colors.border}` 
      }}>
        {title}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px 24px" }}>
        {children}
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value, fullWidth = false }: { label: string; value: string | null | undefined; fullWidth?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: fullWidth ? "1 / -1" : "auto" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: colors.muted }}>{label}</span>
      <span style={{ fontSize: 14, color: colors.text, padding: "4px 0", minHeight: 20, wordBreak: "break-word" }}>
        {value || "---"}
      </span>
    </div>
  );
}

export function WorkOrderDetail({
  selected,
  onViewReport,
  onDownloadPdf,
  onEmailReport,
  busy,
  t,
  localeName,
}: {
  selected: ServiqWorkOrder;
  onViewReport: () => void;
  onDownloadPdf: () => void;
  onEmailReport: () => void;
  busy: boolean;
  t: (key: MessageKey) => string;
  localeName: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
      <Card style={{ padding: "32px 40px" }}>
        <Section title="General Information">
          <ReadOnlyField label="Work Order No" value={selected.order_no} />
          <ReadOnlyField label={t("serviq.scheduledFor")} value={compactDate(selected.scheduled_for, localeName)} />
          <ReadOnlyField label="Priority" value={selected.priority} />
          <ReadOnlyField label={t("serviq.technician")} value={selected.technician?.name} />
          {selected.visit_notes && (
            <ReadOnlyField label={t("serviq.visitNotes")} value={selected.visit_notes} fullWidth />
          )}
        </Section>

        <Section title="Customer Details">
          <ReadOnlyField label={t("serviq.customer")} value={selected.customer.name} />
          <ReadOnlyField label={t("serviq.phone")} value={selected.customer.phone} />
          <ReadOnlyField label={t("serviq.customerEmail") || "Email"} value={selected.customer.email} />
          <ReadOnlyField label="Address" value={selected.customer.address} fullWidth />
        </Section>

        <Section title="Equipment / Asset">
          <ReadOnlyField label={t("serviq.equipment")} value={selected.equipment?.name} />
          <ReadOnlyField label={t("serviq.serial")} value={selected.equipment?.serial_number} />
          <ReadOnlyField label="Model" value={selected.equipment?.model} />
          <ReadOnlyField label="Warranty Status" value={selected.equipment?.warranty_status} />
        </Section>
      </Card>

      <div style={{ display: "grid", gap: 24 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: colors.text }}>Actions</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <Button variant="outline" disabled={busy} onClick={onViewReport} style={{ width: "100%", justifyContent: "flex-start", border: "none", borderBottom: `1px solid ${colors.border}`, borderRadius: 0, padding: "8px 4px" }}>
              <FileText size={16} color={colors.primary} />
              {t("serviq.viewReport")}
            </Button>
            <Button variant="outline" disabled={busy} onClick={onDownloadPdf} style={{ width: "100%", justifyContent: "flex-start", border: "none", borderBottom: `1px solid ${colors.border}`, borderRadius: 0, padding: "8px 4px" }}>
              <Download size={16} color={colors.primary} />
              {t("serviq.downloadPdf")}
            </Button>
            <Button variant="outline" disabled={busy || !selected.customer.email} onClick={onEmailReport} style={{ width: "100%", justifyContent: "flex-start", border: "none", borderRadius: 0, padding: "8px 4px" }}>
              <Mail size={16} color={colors.primary} />
              {t("serviq.sendEmail")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
