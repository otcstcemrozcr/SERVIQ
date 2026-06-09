"use client";

import type { FormEvent } from "react";
import { Card, Button, Field, SelectInput, TextInput, colors } from "@/components/ui";
import { type ServiqPaymentMethod, type ServiqPaymentStatus } from "@/lib/api";
import { type MessageKey } from "@/lib/i18n";
import { CreditCard, AlertCircle, CheckCircle } from "lucide-react";

export function PaymentModal({
  payment,
  setPayment,
  canMutate,
  busy,
  onSubmit,
  t,
}: {
  payment: {
    method: ServiqPaymentMethod;
    status: ServiqPaymentStatus;
    amount: number;
    currency: string;
    transaction_id: string;
  };
  setPayment: React.Dispatch<React.SetStateAction<typeof payment>>;
  canMutate: boolean;
  busy: boolean;
  onSubmit: (e: FormEvent) => void;
  t: (key: MessageKey) => string;
}) {
  return (
    <Card style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <CreditCard size={20} color={colors.primary} />
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>Ödeme Al (Demo)</h3>
      </div>

      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", padding: "12px 16px", borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 12, fontSize: 13 }}>
        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Sanal Pos Entegrasyonu Yok</strong>
          Bu ekran satış sunumları ve demoları için kurgulanmıştır. Gerçek bir banka veya ödeme altyapısı (iyzico, stripe vb.) bağlanana kadar girdiğiniz kart bilgileri hiçbir yere gönderilmez, sadece iş emri durumunu günceller.
        </div>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 16 }}>
          <Field label="Ödenecek Tutar">
            <TextInput 
              type="number" 
              min="0" 
              step="0.01" 
              value={payment.amount} 
              onChange={(e) => setPayment((v) => ({ ...v, amount: Number(e.target.value) }))} 
              style={{ fontSize: 18, fontWeight: 700, color: colors.primary }}
            />
          </Field>
          <Field label="Para Birimi">
            <TextInput 
              value={payment.currency} 
              onChange={(e) => setPayment((v) => ({ ...v, currency: e.target.value }))} 
              style={{ fontSize: 16, textAlign: "center", fontWeight: 700 }}
            />
          </Field>
        </div>

        <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, border: `1px solid ${colors.border}` }}>
          <div style={{ marginBottom: 16 }}>
            <Field label="Ödeme Yöntemi">
              <SelectInput 
                value={payment.method} 
                onChange={(e) => setPayment((v) => ({ ...v, method: e.target.value as ServiqPaymentMethod }))}
              >
                <option value="CREDIT_CARD">💳 Kredi Kartı</option>
                <option value="CASH">💵 Nakit</option>
                <option value="CURRENT_ACCOUNT">📝 Cari Hesaba Yaz (Açık Hesap)</option>
                <option value="VIRTUAL_POS">🌐 Sanal POS Linki Gönder</option>
              </SelectInput>
            </Field>
          </div>

          {payment.method === "CREDIT_CARD" && (
            <div style={{ display: "grid", gap: 12 }}>
              <Field label="Kart Numarası (Demo)">
                <TextInput placeholder="**** **** **** ****" maxLength={19} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Son Kullanma">
                  <TextInput placeholder="AA/YY" maxLength={5} />
                </Field>
                <Field label="CVV">
                  <TextInput placeholder="***" type="password" maxLength={3} />
                </Field>
              </div>
            </div>
          )}
        </div>
        
        <div style={{ display: "none" }}>
          <Field label="Ödeme Durumu">
            <SelectInput 
              value={payment.status} 
              onChange={(e) => setPayment((v) => ({ ...v, status: e.target.value as ServiqPaymentStatus }))}
            >
              <option value="PAID">{t("serviq.paid")}</option>
              <option value="UNPAID">{t("serviq.unpaid")}</option>
            </SelectInput>
          </Field>
        </div>
        
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <Button disabled={!canMutate || busy} variant="primary" style={{ width: "100%", padding: "12px 24px", fontSize: 16 }}>
            <CheckCircle size={20} style={{ marginRight: 8 }} />
            Ödemeyi Tamamla
          </Button>
        </div>
      </form>
    </Card>
  );
}
