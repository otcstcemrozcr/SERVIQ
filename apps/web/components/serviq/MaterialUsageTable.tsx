"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Card, Button, Field, SelectInput, TextInput, Badge, colors } from "@/components/ui";
import { type ServiqMaterialStatus } from "@/lib/api";
import { type MessageKey } from "@/lib/i18n";
import { Package, Plus, ScanLine, ArrowDownCircle, ArrowUpCircle, X } from "lucide-react";

export function MaterialUsageTable({
  materials,
  material,
  setMaterial,
  canMutate,
  busy,
  onSubmit,
  t,
}: {
  materials: any[];
  material: {
    material_code: string;
    material_name: string;
    quantity: number;
    unit: string;
    status: ServiqMaterialStatus;
    warehouse_location: string;
  };
  setMaterial: React.Dispatch<React.SetStateAction<typeof material>>;
  canMutate: boolean;
  busy: boolean;
  onSubmit: (e: FormEvent) => void;
  t: (key: MessageKey) => string;
}) {
  const [showForm, setShowForm] = useState(false);

  function handleScan() {
    alert("Barkod tarayıcı başlatılıyor... (Sadece Demo)");
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Card style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={20} color={colors.primary} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>
              {t("serviq.materialUsage")}
            </h3>
          </div>
          <Badge color={colors.muted}>{materials.length} Kayıt</Badge>
        </div>
        
        {materials.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", border: `1px dashed ${colors.border}`, borderRadius: 8, background: colors.soft }}>
            <Package size={32} color={colors.muted} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
            <p style={{ margin: 0, color: colors.muted, fontSize: 14, fontWeight: 500 }}>{t("serviq.noMaterials")}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {materials.map((item) => (
              <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px", border: `1px solid ${colors.border}`, borderRadius: 8, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{item.material_code}</span>
                      <Badge variant={item.status === "USED" ? "soft" : "outline"} color={item.status === "USED" ? colors.primary : colors.muted}>
                        {item.status === "USED" ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><ArrowDownCircle size={12} /> {t("serviq.used")}</span>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><ArrowUpCircle size={12} /> {t("serviq.returned")}</span>
                        )}
                      </Badge>
                    </div>
                    <p style={{ margin: 0, color: colors.muted, fontSize: 14, fontWeight: 500 }}>{item.material_name}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: colors.text }}>{item.quantity} <span style={{ fontSize: 12, fontWeight: 600, color: colors.muted }}>{item.unit}</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {canMutate && !showForm && (
          <Button variant="outline" onClick={() => setShowForm(true)} style={{ width: "100%", justifyContent: "center", borderStyle: "dashed" }}>
            <Plus size={16} /> Yeni Malzeme Ekle
          </Button>
        )}
      </Card>

      {showForm && (
        <Card style={{ background: colors.soft, border: `1px solid ${colors.border}`, padding: 24 }}>
          <form onSubmit={(e) => {
            onSubmit(e);
            setShowForm(false);
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>
                {t("serviq.addMaterial")}
              </h4>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.muted, padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <Button type="button" variant="outline" onClick={handleScan} style={{ flex: 1, justifyContent: "center", background: "#fff", borderColor: colors.primary, color: colors.primary }}>
                <ScanLine size={18} style={{ marginRight: 8 }} /> Barkod Tara
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <Field label={t("serviq.materialCode")}>
                <TextInput required placeholder="Örn. MAT-001" value={material.material_code} onChange={(e) => setMaterial((v) => ({ ...v, material_code: e.target.value }))} />
              </Field>
              <Field label={t("serviq.materialName")}>
                <TextInput required placeholder="Örn. Hava Filtresi" value={material.material_name} onChange={(e) => setMaterial((v) => ({ ...v, material_name: e.target.value }))} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Miktar">
                  <TextInput required type="number" min="0.001" step="0.001" value={material.quantity} onChange={(e) => setMaterial((v) => ({ ...v, quantity: Number(e.target.value) }))} />
                </Field>
                <Field label="Birim">
                  <TextInput required placeholder="Adet" value={material.unit} onChange={(e) => setMaterial((v) => ({ ...v, unit: e.target.value }))} />
                </Field>
              </div>
              <Field label="Durum">
                <SelectInput value={material.status} onChange={(e) => setMaterial((v) => ({ ...v, status: e.target.value as ServiqMaterialStatus }))}>
                  <option value="USED">{t("serviq.used")}</option>
                  <option value="RETURNED">{t("serviq.returned")}</option>
                </SelectInput>
              </Field>
              <Field label={t("serviq.warehouseLocation") || "Depo Lokasyonu"}>
                <TextInput placeholder="Örn. Aracım" value={material.warehouse_location} onChange={(e) => setMaterial((v) => ({ ...v, warehouse_location: e.target.value }))} />
              </Field>
            </div>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <Button type="submit" disabled={!canMutate || busy} variant="primary" style={{ width: "100%" }}>
                <Plus size={16} />
                Listeye Ekle
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
