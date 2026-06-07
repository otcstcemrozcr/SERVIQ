"use client";

import { Card, Button, Badge } from "@/components/ui";
import { type ServiqWorkOrder } from "@/lib/api";
import { type MessageKey } from "@/lib/i18n";
import { User, Calendar, MapPin, Wrench, Download, Mail, FileText } from "lucide-react";

function compactDate(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ color: "#64748b", marginTop: 2 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 500, wordBreak: "break-word" }}>{value}</div>
      </div>
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
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 24 }}>
      <div style={{ display: "grid", gap: 24 }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ background: "#f8fafc", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Customer Details</h3>
          </div>
          <div style={{ padding: "8px 20px 20px" }}>
            <InfoItem icon={<User size={18} />} label={t("serviq.customer")} value={selected.customer.name} />
            <InfoItem icon={<User size={18} />} label={t("serviq.phone")} value={selected.customer.phone} />
            <InfoItem icon={<Mail size={18} />} label={t("serviq.customerEmail") || "Email"} value={selected.customer.email} />
            <InfoItem icon={<MapPin size={18} />} label="Address" value={selected.customer.address} />
          </div>
        </Card>

        {selected.visit_notes && (
          <Card>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{t("serviq.visitNotes")}</h3>
            <p style={{ margin: 0, color: "#334155", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {selected.visit_notes}
            </p>
          </Card>
        )}
      </div>

      <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ background: "#f8fafc", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Service Info</h3>
          </div>
          <div style={{ padding: "8px 20px 20px" }}>
            <InfoItem icon={<Calendar size={18} />} label={t("serviq.scheduledFor")} value={compactDate(selected.scheduled_for, localeName)} />
            <InfoItem icon={<User size={18} />} label={t("serviq.technician")} value={selected.technician?.name} />
            <InfoItem icon={<Wrench size={18} />} label={t("serviq.equipment")} value={selected.equipment?.name} />
            <InfoItem icon={<Wrench size={18} />} label={t("serviq.serial")} value={selected.equipment?.serial_number} />
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Actions</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <Button variant="outline" disabled={busy} onClick={onViewReport} style={{ width: "100%", justifyContent: "flex-start" }}>
              <FileText size={16} />
              {t("serviq.viewReport")}
            </Button>
            <Button variant="outline" disabled={busy} onClick={onDownloadPdf} style={{ width: "100%", justifyContent: "flex-start" }}>
              <Download size={16} />
              {t("serviq.downloadPdf")}
            </Button>
            <Button variant="outline" disabled={busy || !selected.customer.email} onClick={onEmailReport} style={{ width: "100%", justifyContent: "flex-start" }}>
              <Mail size={16} />
              {t("serviq.sendEmail")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
