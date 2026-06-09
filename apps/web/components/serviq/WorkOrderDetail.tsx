"use client";

import { useState } from "react";
import { Card, Button, TextInput, TextArea, colors } from "@/components/ui";
import { type ServiqWorkOrder, updateServiqWorkOrder } from "@/lib/api";
import { type MessageKey } from "@/lib/i18n";
import { Download, Mail, FileText, MapPin, Phone, PenTool, X, Save, User, Wrench, FileArchive, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

function compactDate(value: string | null, locale: string) {
  if (!value) return "---";
  return new Date(value).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <h3 style={{ 
        margin: "0 0 16px 0", 
        fontSize: 14, 
        fontWeight: 700, 
        color: colors.text, 
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingBottom: 12, 
        borderBottom: `1px solid ${colors.border}` 
      }}>
        {icon}
        {title}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px 24px" }}>
        {children}
      </div>
    </Card>
  );
}

function ReadOnlyField({ label, value, fullWidth = false, linkUrl, linkIcon }: { label: string; value: string | null | undefined; fullWidth?: boolean; linkUrl?: string; linkIcon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: fullWidth ? "1 / -1" : "auto" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: colors.muted }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, color: value ? colors.text : colors.muted, padding: "4px 0", minHeight: 20, wordBreak: "break-word", fontWeight: value ? 500 : 400 }}>
          {value || "Belirtilmemiş"}
        </span>
        {value && linkUrl && (
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary, display: "flex", alignItems: "center", padding: 4, background: "#eff6ff", borderRadius: 4 }}>
            {linkIcon}
          </a>
        )}
      </div>
    </div>
  );
}

export function WorkOrderDetail({
  selected,
  onViewReport,
  onDownloadPdf,
  onEmailReport,
  onRefresh,
  busy,
  t,
  localeName,
}: {
  selected: ServiqWorkOrder;
  onViewReport: () => void;
  onDownloadPdf: () => void;
  onEmailReport: () => void;
  onRefresh?: () => void;
  busy: boolean;
  t: (key: MessageKey) => string;
  localeName: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    priority: selected.priority,
    visit_notes: selected.visit_notes || "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateServiqWorkOrder(selected.id, {
        priority: editData.priority,
        visit_notes: editData.visit_notes,
      });
      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (e) {
      alert("Failed to save work order: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handlePrintLabel() {
    window.print();
  }

  // Generate public tracking URL for the QR code
  const publicTrackingUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/p/order/${selected.id}` 
    : `https://serviq.app/p/order/${selected.id}`;

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-label-area, #print-label-area * {
            visibility: visible;
          }
          #print-label-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 50mm;
            height: 50mm;
            margin: 0;
            padding: 4mm;
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: white;
            box-sizing: border-box;
          }
          @page {
            size: 50mm 50mm;
            margin: 0;
          }
        }
      `}</style>
      
      {/* Hidden Printable Area */}
      <div id="print-label-area" style={{ display: "none" }}>
        <div style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "4px", textAlign: "center" }}>ServiQ Destek</div>
        <QRCodeSVG value={publicTrackingUrl} size={110} level="M" />
        <div style={{ fontSize: "9px", marginTop: "4px", textAlign: "center" }}>No: {selected.order_no}</div>
        <div style={{ fontSize: "8px", marginTop: "2px", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{selected.customer.name}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            {isEditing ? (
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}><X size={16} /> İptal</Button>
                <Button variant="primary" onClick={handleSave} disabled={saving}><Save size={16} /> Kaydet</Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => {
                setEditData({ priority: selected.priority, visit_notes: selected.visit_notes || "" });
                setIsEditing(true);
              }}><PenTool size={16} /> Düzenle</Button>
            )}
          </div>

          <Section title="Genel Bilgiler" icon={<FileArchive size={18} color={colors.primary} />}>
            <ReadOnlyField label="İş Emri No" value={selected.order_no} />
            <ReadOnlyField label={t("serviq.scheduledFor")} value={compactDate(selected.scheduled_for, localeName)} />
            
            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.muted }}>Öncelik</span>
                <TextInput value={editData.priority || ""} onChange={(e) => setEditData(d => ({...d, priority: e.target.value}))} />
              </div>
            ) : (
              <ReadOnlyField label="Öncelik" value={selected.priority} />
            )}

            <ReadOnlyField label={t("serviq.technician")} value={selected.technician?.name} />
            
            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.muted }}>{t("serviq.visitNotes")}</span>
                <TextArea value={editData.visit_notes} onChange={(e) => setEditData(d => ({...d, visit_notes: e.target.value}))} />
              </div>
            ) : (
              <ReadOnlyField label={t("serviq.visitNotes")} value={selected.visit_notes} fullWidth />
            )}
          </Section>

          <Section title="Müşteri Detayları" icon={<User size={18} color={colors.primary} />}>
            <ReadOnlyField label={t("serviq.customer")} value={selected.customer.name} />
            <ReadOnlyField 
              label={t("serviq.phone")} 
              value={selected.customer.phone} 
              linkUrl={selected.customer.phone ? `tel:${selected.customer.phone}` : undefined}
              linkIcon={<Phone size={14} />}
            />
            <ReadOnlyField 
              label={t("serviq.customerEmail") || "Email"} 
              value={selected.customer.email} 
              linkUrl={selected.customer.email ? `mailto:${selected.customer.email}` : undefined}
              linkIcon={<Mail size={14} />}
            />
            <ReadOnlyField 
              label="Adres" 
              value={selected.customer.address} 
              fullWidth 
              linkUrl={selected.customer.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selected.customer.address)}` : undefined}
              linkIcon={<><MapPin size={14} style={{ marginRight: 4 }} /> Yol Tarifi</>}
            />
          </Section>

          <Section title="Ekipman / Cihaz" icon={<Wrench size={18} color={colors.primary} />}>
            <ReadOnlyField label={t("serviq.equipment")} value={selected.equipment?.name} />
            <ReadOnlyField label={t("serviq.serial")} value={selected.equipment?.serial_number} />
            <ReadOnlyField label="Model" value={selected.equipment?.model} />
            <ReadOnlyField label="Garanti Durumu" value={selected.equipment?.warranty_status} />
          </Section>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <Card>
            <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: colors.text }}>İşlemler</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <Button variant="outline" disabled={busy} onClick={handlePrintLabel} style={{ width: "100%", justifyContent: "flex-start", border: "none", borderBottom: `1px solid ${colors.border}`, borderRadius: 0, padding: "8px 4px", color: colors.text }}>
                <Printer size={16} color={colors.primary} />
                Etiket Yazdır (QR)
              </Button>
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
    </>
  );
}
