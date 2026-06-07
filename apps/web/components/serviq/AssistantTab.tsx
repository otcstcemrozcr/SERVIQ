"use client";

import { Card, Button, TextArea } from "@/components/ui";
import { type ServiqAssistantSummary } from "@/lib/api";
import { type MessageKey } from "@/lib/i18n";
import { Sparkles } from "lucide-react";

export function AssistantTab({
  summary,
  busy,
  onRefresh,
  t,
}: {
  summary: ServiqAssistantSummary | null;
  busy: boolean;
  onRefresh: () => void;
  t: (key: MessageKey) => string;
}) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={20} color="#0f172a" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            {t("serviq.technicianAssistant")}
          </h3>
        </div>
        <Button disabled={busy} onClick={onRefresh} variant="primary">
          {t("serviq.generateSummary")}
        </Button>
      </div>
      
      {!summary ? (
        <div style={{ padding: "32px 0", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 6, background: "#f8fafc" }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
            {t("serviq.assistantIntro")}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ padding: 16, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6 }}>
            <p style={{ margin: 0, color: "#166534", fontSize: 14, lineHeight: 1.6 }}>{summary.summary}</p>
          </div>
          
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{t("serviq.nextActions")}</h4>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#334155", fontSize: 14, display: "grid", gap: 8 }}>
              {summary.next_actions.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Email Draft</h4>
            <TextArea readOnly value={summary.customer_email_draft} style={{ background: "#f8fafc" }} />
          </div>
          
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>ERP Notification</h4>
            <TextArea readOnly value={summary.erp_notification_text} style={{ background: "#f8fafc" }} />
          </div>
        </div>
      )}
    </Card>
  );
}
