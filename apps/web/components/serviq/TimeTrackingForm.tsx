"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Card, Button, Field, TextInput, TextArea, Badge, colors } from "@/components/ui";
import { type MessageKey } from "@/lib/i18n";
import { Clock, Plus, Play, Square, Settings2 } from "lucide-react";

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
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Card style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={20} color={colors.primary} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>
              {t("serviq.timeTracking")}
            </h3>
          </div>
          <Badge color={colors.muted}>{timeEntries.length} Kayıt</Badge>
        </div>
        
        {timeEntries.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", border: `1px dashed ${colors.border}`, borderRadius: 8, background: colors.soft }}>
            <Clock size={32} color={colors.muted} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
            <p style={{ margin: 0, color: colors.muted, fontSize: 14, fontWeight: 500 }}>{t("serviq.noTimeEntries")}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {timeEntries.map((item) => (
              <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px", border: `1px solid ${colors.border}`, borderRadius: 8, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                      <strong style={{ fontSize: 14, color: colors.text }}>
                        {compactDate(item.arrival_time, localeName)}
                      </strong>
                      {(item.labor_hours > 0 || item.travel_hours > 0) && (
                        <Badge variant="soft" color={colors.primary}>
                          {item.labor_hours > 0 ? `${item.labor_hours}s Efor ` : ""}
                          {item.travel_hours > 0 ? `| ${item.travel_hours}s Yol` : ""}
                        </Badge>
                      )}
                    </div>
                    {item.technician_comment && (
                      <p style={{ margin: 0, fontSize: 13, color: colors.muted, fontStyle: "italic" }}>"{item.technician_comment}"</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ background: colors.soft, border: `1px solid ${colors.border}`, padding: 24 }}>
        <form onSubmit={onSubmit}>
          <h4 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: colors.text }}>
            {t("serviq.saveTime")}
          </h4>
          
          <div style={{ display: "grid", gap: 20 }}>
            {/* Arrival & Departure */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <Field label={t("serviq.arrival")}>
                <div style={{ position: "relative" }}>
                  <Play size={16} color={colors.success} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <TextInput type="datetime-local" style={{ paddingLeft: 36 }} value={timeEntry.arrival_time} onChange={(e) => setTimeEntry((v) => ({ ...v, arrival_time: e.target.value }))} />
                </div>
              </Field>
              <Field label={t("serviq.departure")}>
                <div style={{ position: "relative" }}>
                  <Square size={16} color={colors.warning} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <TextInput type="datetime-local" style={{ paddingLeft: 36 }} value={timeEntry.departure_time} onChange={(e) => setTimeEntry((v) => ({ ...v, departure_time: e.target.value }))} />
                </div>
              </Field>
            </div>

            {/* Toggle for Advanced Tracking */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button 
                type="button" 
                onClick={() => setShowAdvanced(!showAdvanced)} 
                style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: colors.primary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                <Settings2 size={16} />
                {showAdvanced ? "Süre Detaylarını Gizle" : "Detaylı Efor ve Yolculuk Süresi Gir"}
              </button>
            </div>
            
            {/* Advanced Hours */}
            {showAdvanced && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, padding: "16px", background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 8 }}>
                <Field label="Efor (Saat)">
                  <TextInput type="number" min="0" step="0.25" value={timeEntry.labor_hours} onChange={(e) => setTimeEntry((v) => ({ ...v, labor_hours: Number(e.target.value) }))} />
                </Field>
                <Field label="Yol (Saat)">
                  <TextInput type="number" min="0" step="0.25" value={timeEntry.travel_hours} onChange={(e) => setTimeEntry((v) => ({ ...v, travel_hours: Number(e.target.value) }))} />
                </Field>
                <Field label="Bekleme (Saat)">
                  <TextInput type="number" min="0" step="0.25" value={timeEntry.waiting_hours} onChange={(e) => setTimeEntry((v) => ({ ...v, waiting_hours: Number(e.target.value) }))} />
                </Field>
              </div>
            )}

            <Field label={t("serviq.technicianComment")}>
              <TextArea placeholder={t("serviq.technicianComment")} value={timeEntry.technician_comment} onChange={(e) => setTimeEntry((v) => ({ ...v, technician_comment: e.target.value }))} />
            </Field>
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <Button disabled={!canMutate || busy} variant="primary" style={{ width: "100%" }}>
              <Plus size={16} />
              {t("serviq.saveTime")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
