"use client";

import type { FormEvent } from "react";
import { Card, Button, Field, SelectInput, TextInput, Badge } from "@/components/ui";
import { type ServiqMaterialStatus } from "@/lib/api";
import { type MessageKey } from "@/lib/i18n";
import { Package, Plus } from "lucide-react";

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
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Package size={20} color="#0f172a" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            {t("serviq.materialUsage")}
          </h3>
        </div>
        
        {materials.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 6, background: "#f8fafc" }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{t("serviq.noMaterials")}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "12px 8px", fontWeight: 600 }}>Code</th>
                  <th style={{ padding: "12px 8px", fontWeight: 600 }}>Name</th>
                  <th style={{ padding: "12px 8px", fontWeight: 600 }}>Qty</th>
                  <th style={{ padding: "12px 8px", fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 8px", color: "#0f172a", fontWeight: 500 }}>{item.material_code}</td>
                    <td style={{ padding: "12px 8px", color: "#334155" }}>{item.material_name}</td>
                    <td style={{ padding: "12px 8px", color: "#334155" }}>{item.quantity} {item.unit}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <Badge variant={item.status === "USED" ? "soft" : "outline"} color={item.status === "USED" ? "#0369a1" : "#64748b"}>
                        {item.status === "USED" ? t("serviq.used") : t("serviq.returned")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card style={{ background: "#f8fafc", border: "1px dashed #cbd5e1" }}>
        <form onSubmit={onSubmit}>
          <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
            {t("serviq.addMaterial")}
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <Field label={t("serviq.materialCode")}>
              <TextInput required placeholder="e.g. MAT-001" value={material.material_code} onChange={(e) => setMaterial((v) => ({ ...v, material_code: e.target.value }))} />
            </Field>
            <Field label={t("serviq.materialName")}>
              <TextInput required placeholder="e.g. Filter" value={material.material_name} onChange={(e) => setMaterial((v) => ({ ...v, material_name: e.target.value }))} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Qty">
                <TextInput required type="number" min="0.001" step="0.001" value={material.quantity} onChange={(e) => setMaterial((v) => ({ ...v, quantity: Number(e.target.value) }))} />
              </Field>
              <Field label="Unit">
                <TextInput required value={material.unit} onChange={(e) => setMaterial((v) => ({ ...v, unit: e.target.value }))} />
              </Field>
            </div>
            <Field label="Status">
              <SelectInput value={material.status} onChange={(e) => setMaterial((v) => ({ ...v, status: e.target.value as ServiqMaterialStatus }))}>
                <option value="USED">{t("serviq.used")}</option>
                <option value="RETURNED">{t("serviq.returned")}</option>
              </SelectInput>
            </Field>
            <Field label={t("serviq.warehouseLocation") || "Warehouse"}>
              <TextInput placeholder="e.g. WH-1" value={material.warehouse_location} onChange={(e) => setMaterial((v) => ({ ...v, warehouse_location: e.target.value }))} />
            </Field>
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <Button disabled={!canMutate || busy} variant="primary">
              <Plus size={16} />
              {t("serviq.addMaterial")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
