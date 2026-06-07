"use client";

import type { FormEvent } from "react";
import { Card, Button, Field, TextInput, TextArea, Badge } from "@/components/ui";
import { type MessageKey } from "@/lib/i18n";
import { Clock, Plus } from "lucide-react";

function compactDate(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TimeTrackingForm({
  timeEntries,
  timeEntry,
  setTimeEntry,
  canMutate,
  busy,
  onSubmit,
  t,
  localeName,
}: {
  timeEntries: any[];
  timeEntry: {
    arrival_time: string;
    departure_time: string;
    labor_hours: number;
    travel_hours: number;
    waiting_hours: number;
    technician_comment: string;
  };
  setTimeEntry: React.Dispatch<React.SetStateAction<typeof timeEntry>>;
  canMutate: boolean;
  busy: boolean;
  onSubmit: (e: FormEvent) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  localeName: string;
}) {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Clock size={20} color="#0f172a" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            {t("serviq.timeTracking")}
          </h3>
        </div>
        
        {timeEntries.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 6, background: "#f8fafc" }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{t("serviq.noTimeEntries")}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {timeEntries.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: 16, border: "1px solid #e2e8f0", borderRadius: 6 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <strong style={{ fontSize: 14, color: "#0f172a" }}>{compactDate(item.arrival_time, localeName)}</strong>
                    <Badge variant="soft" color="#0369a1">{item.labor_hours}h Labor</Badge>
                  </div>
                  {item.technician_comment && (
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{item.technician_comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ background: "#f8fafc", border: "1px dashed #cbd5e1" }}>
        <form onSubmit={onSubmit}>
          <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
            {t("serviq.saveTime")}
          </h4>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <Field label={t("serviq.arrival")}>
                <TextInput type="datetime-local" value={timeEntry.arrival_time} onChange={(e) => setTimeEntry((v) => ({ ...v, arrival_time: e.target.value }))} />
              </Field>
              <Field label={t("serviq.departure")}>
                <TextInput type="datetime-local" value={timeEntry.departure_time} onChange={(e) => setTimeEntry((v) => ({ ...v, departure_time: e.target.value }))} />
              </Field>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
              <Field label="Labor (h)">
                <TextInput type="number" min="0" step="0.25" value={timeEntry.labor_hours} onChange={(e) => setTimeEntry((v) => ({ ...v, labor_hours: Number(e.target.value) }))} />
              </Field>
              <Field label="Travel (h)">
                <TextInput type="number" min="0" step="0.25" value={timeEntry.travel_hours} onChange={(e) => setTimeEntry((v) => ({ ...v, travel_hours: Number(e.target.value) }))} />
              </Field>
              <Field label="Wait (h)">
                <TextInput type="number" min="0" step="0.25" value={timeEntry.waiting_hours} onChange={(e) => setTimeEntry((v) => ({ ...v, waiting_hours: Number(e.target.value) }))} />
              </Field>
            </div>

            <Field label={t("serviq.technicianComment")}>
              <TextArea placeholder={t("serviq.technicianComment")} value={timeEntry.technician_comment} onChange={(e) => setTimeEntry((v) => ({ ...v, technician_comment: e.target.value }))} />
            </Field>
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <Button disabled={!canMutate || busy} variant="primary">
              <Plus size={16} />
              {t("serviq.saveTime")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
