"use client";

import type { FormEvent } from "react";
import { Card, Button, Field, SelectInput, TextInput } from "@/components/ui";
import { type ServiqPaymentMethod, type ServiqPaymentStatus } from "@/lib/api";
import { type MessageKey } from "@/lib/i18n";

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
    <Card>
      <form onSubmit={onSubmit}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>{t("serviq.recordPayment")}</h3>
        <div style={{ display: "grid", gap: 16 }}>
          <Field label={t("serviq.paymentMethod" as MessageKey) || "Payment Method"}>
            <SelectInput 
              value={payment.method} 
              onChange={(e) => setPayment((v) => ({ ...v, method: e.target.value as ServiqPaymentMethod }))}
            >
              <option value="CURRENT_ACCOUNT">{t("serviq.billToAccount")}</option>
              <option value="CASH">{t("serviq.cash")}</option>
              <option value="CREDIT_CARD">{t("serviq.creditCard")}</option>
              <option value="VIRTUAL_POS">{t("serviq.virtualPos")}</option>
            </SelectInput>
          </Field>
          
          <Field label={t("serviq.paymentStatus" as MessageKey) || "Status"}>
            <SelectInput 
              value={payment.status} 
              onChange={(e) => setPayment((v) => ({ ...v, status: e.target.value as ServiqPaymentStatus }))}
            >
              <option value="CURRENT_ACCOUNT">{t("serviq.billToAccount")}</option>
              <option value="PAYMENT_PENDING">{t("serviq.paymentPending")}</option>
              <option value="PAID">{t("serviq.paid")}</option>
              <option value="UNPAID">{t("serviq.unpaid")}</option>
            </SelectInput>
          </Field>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12 }}>
            <Field label={t("serviq.amount" as MessageKey) || "Amount"}>
              <TextInput 
                type="number" 
                min="0" 
                step="0.01" 
                value={payment.amount} 
                onChange={(e) => setPayment((v) => ({ ...v, amount: Number(e.target.value) }))} 
              />
            </Field>
            <Field label={t("serviq.currency" as MessageKey) || "Currency"}>
              <TextInput 
                value={payment.currency} 
                onChange={(e) => setPayment((v) => ({ ...v, currency: e.target.value }))} 
              />
            </Field>
          </div>
          
          <Field label={t("serviq.transactionRef") || "Transaction Ref"}>
            <TextInput 
              placeholder="e.g. TXN-12345" 
              value={payment.transaction_id} 
              onChange={(e) => setPayment((v) => ({ ...v, transaction_id: e.target.value }))} 
            />
          </Field>
        </div>
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <Button disabled={!canMutate || busy} variant="primary">
            {t("serviq.recordPayment")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
