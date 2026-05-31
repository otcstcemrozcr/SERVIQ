"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  addServiqMaterial,
  addServiqSignature,
  addServiqTimeEntry,
  completeServiqWorkOrder,
  createServiqWorkOrder,
  downloadServiqReportPdf,
  getServiqAssistantSummary,
  getServiqReport,
  listServiqWorkOrders,
  recordServiqPayment,
  sendServiqEmail,
  startServiqWorkOrder,
  type ServiqMaterialStatus,
  type ServiqPaymentMethod,
  type ServiqPaymentStatus,
  type ServiqAssistantSummary,
  type ServiqWorkOrder,
} from "@/lib/api";
import { Badge, Button, Card, Field, SelectInput, TextArea, TextInput } from "@/components/ui";
import { LanguageToggle, localeTag, useLocale, useT, type MessageKey } from "@/lib/i18n";

const DEFAULT_ORG_ID = "11111111-1111-1111-1111-111111111111";

type Tab = "details" | "materials" | "time" | "sign" | "payment" | "assistant";
type NewWorkOrderFormState = {
  orderNo: string;
  title: string;
  priority: string;
  scheduledDate: string;
  scheduledTime: string;
  visitNotes: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  billToAccount: boolean;
  equipmentName: string;
  equipmentModel: string;
  serialNumber: string;
  warrantyStatus: string;
  technicianName: string;
  technicianPhone: string;
};

const statusColor: Record<string, string> = {
  OPEN: "#2563eb",
  IN_PROGRESS: "#f97316",
  COMPLETED: "#16a34a",
  CANCELLED: "#777",
};

const testTechnicians = [
  { name: "Ahmet Yilmaz", phone: "+90 532 111 22 33" },
  { name: "Mehmet Kaya", phone: "+90 533 222 33 44" },
  { name: "Elif Demir", phone: "+90 534 333 44 55" },
  { name: "Zeynep Celik", phone: "+90 535 444 55 66" },
  { name: "Can Arslan", phone: "+90 536 555 66 77" },
];

const scheduleTimes = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
];

function compactDate(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDatetimeLocal(value: Date) {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function scheduledInputToIso(date: string, time: string) {
  if (!date) return null;
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? time : "09:00";
  return new Date(`${date}T${normalizedTime}`).toISOString();
}

function money(value: number | null, locale: string, currency = "TRY") {
  if (value == null) return "-";
  return `${value.toLocaleString(locale, { maximumFractionDigits: 2 })} ${currency}`;
}

function friendlyError(message: string, t: (key: MessageKey, vars?: Record<string, string | number>) => string) {
  if (message.includes("401")) return t("error.authFailed");
  if (message.includes("403")) return t("error.forbidden");
  if (message.includes("422")) return t("error.invalid");
  if (message.includes("Payment is required")) return t("error.paymentRequired");
  if (message.includes("cannot be modified")) return t("error.lockedOrder");
  if (message.includes("DATABASE_URL")) return t("error.databaseMissing");
  return message;
}

function StatusPill({ status, t }: { status: string; t: (key: MessageKey) => string }) {
  const key = `status.${status}` as MessageKey;
  return <Badge color={statusColor[status] ?? "#444"}>{t(key)}</Badge>;
}

const tabLabels: Record<Tab, MessageKey> = {
  details: "serviq.details",
  materials: "serviq.materials",
  time: "serviq.time",
  sign: "serviq.sign",
  payment: "serviq.payment",
  assistant: "serviq.assistant",
};

export default function ServiqPage() {
  const t = useT();
  const { locale } = useLocale();
  const localeName = localeTag[locale];
  const [orders, setOrders] = useState<ServiqWorkOrder[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [showList, setShowList] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [auth, setAuth] = useState({ orgId: DEFAULT_ORG_ID, apiKey: "" });
  const [newOrder, setNewOrder] = useState<NewWorkOrderFormState>({
    orderNo: "",
    title: "",
    priority: "NORMAL",
    scheduledDate: "",
    scheduledTime: "",
    visitNotes: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    billToAccount: true,
    equipmentName: "",
    equipmentModel: "",
    serialNumber: "",
    warrantyStatus: "",
    technicianName: "",
    technicianPhone: "",
  });
  const [material, setMaterial] = useState({
    material_code: "",
    material_name: "",
    quantity: 1,
    unit: "pcs",
    status: "USED" as ServiqMaterialStatus,
    warehouse_location: "",
  });
  const [timeEntry, setTimeEntry] = useState({
    arrival_time: "",
    departure_time: "",
    labor_hours: 1,
    travel_hours: 0,
    waiting_hours: 0,
    technician_comment: "",
  });
  const [signature, setSignature] = useState({
    signer_type: "CUSTOMER" as "CUSTOMER" | "TECHNICIAN",
    signer_name: "",
    image_data_url: "",
  });
  const [payment, setPayment] = useState({
    method: "CURRENT_ACCOUNT" as ServiqPaymentMethod,
    status: "CURRENT_ACCOUNT" as ServiqPaymentStatus,
    amount: 0,
    currency: "TRY",
    transaction_id: "",
  });
  const [assistantSummary, setAssistantSummary] = useState<ServiqAssistantSummary | null>(null);

  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId) ?? orders[0] ?? null,
    [orders, selectedId],
  );
  const canMutate = selected && !["COMPLETED", "CANCELLED"].includes(selected.status);
  const hasApiKey = Boolean(auth.apiKey.trim());

  async function refresh(nextSelectedId?: string) {
    setLoading(true);
    setError("");
    try {
      const data = await listServiqWorkOrders();
      setOrders(data);
      if (nextSelectedId) setSelectedId(nextSelectedId);
      else {
        const storedSelected = localStorage.getItem("serviq_selected_order");
        if (storedSelected && data.some((order) => order.id === storedSelected)) {
          setSelectedId(storedSelected);
        } else if (!selectedId && data[0]) {
          setSelectedId(data[0].id);
        }
      }
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : t("error.loadOrders"), t));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const storedOrgId = localStorage.getItem("serviq_org_id") ?? DEFAULT_ORG_ID;
    const storedApiKey = localStorage.getItem("serviq_api_key") ?? "";
    localStorage.setItem("serviq_org_id", storedOrgId);
    setAuth({ orgId: storedOrgId, apiKey: storedApiKey });
    if (!storedApiKey) setShowConnection(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveConnection() {
    localStorage.setItem("serviq_org_id", auth.orgId || DEFAULT_ORG_ID);
    if (auth.apiKey) localStorage.setItem("serviq_api_key", auth.apiKey);
    else localStorage.removeItem("serviq_api_key");
    setNotice(t("notice.connectionSaved"));
    refresh(selected?.id);
  }

  async function runAction(label: string, action: () => Promise<ServiqWorkOrder | void>, success: string) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const updated = await action();
      if (updated) {
        setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
        setSelectedId(updated.id);
      }
      setNotice(success);
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : t("error.actionFailed", { label }), t));
    } finally {
      setBusy("");
    }
  }

  async function submitNewOrder(e: FormEvent) {
    e.preventDefault();
    if (!hasApiKey) {
      setShowConnection(true);
      setError(t("serviq.connectionMissing"));
      return;
    }
    await runAction(
      "create",
      async () => {
        const created = await createServiqWorkOrder({
          order_no: newOrder.orderNo,
          title: newOrder.title,
          priority: newOrder.priority || null,
          scheduled_for: scheduledInputToIso(newOrder.scheduledDate, newOrder.scheduledTime),
          visit_notes: newOrder.visitNotes || null,
          customer: {
            name: newOrder.customerName,
            email: newOrder.customerEmail || null,
            phone: newOrder.customerPhone || null,
            address: newOrder.customerAddress || null,
            is_current_account: newOrder.billToAccount,
          },
          equipment: newOrder.equipmentName
            ? {
                name: newOrder.equipmentName,
                model: newOrder.equipmentModel || null,
                serial_number: newOrder.serialNumber || null,
                warranty_status: newOrder.warrantyStatus || null,
              }
            : null,
          technician: newOrder.technicianName
            ? { name: newOrder.technicianName, phone: newOrder.technicianPhone || null }
            : null,
        });
        setOrders((current) => [created, ...current]);
        setSelectedId(created.id);
        localStorage.setItem("serviq_selected_order", created.id);
        setShowCreate(false);
        return created;
      },
      t("notice.workOrderCreated"),
    );
  }

  async function beginVisit() {
    if (!selected) return;
    setTimeEntry((current) => ({ ...current, arrival_time: toDatetimeLocal(new Date()) }));
    await runAction("start", () => startServiqWorkOrder(selected.id), t("notice.visitStarted"));
  }

  function endVisit() {
    setTimeEntry((current) => ({ ...current, departure_time: toDatetimeLocal(new Date()) }));
    setActiveTab("time");
  }

  async function submitMaterial(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await runAction(
      "material",
      () =>
        addServiqMaterial(selected.id, {
          ...material,
          warehouse_location: material.warehouse_location || null,
        }),
      t("notice.materialSaved"),
    );
  }

  async function submitTime(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await runAction(
      "time",
      () =>
        addServiqTimeEntry(selected.id, {
          arrival_time: fromDatetimeLocal(timeEntry.arrival_time),
          departure_time: fromDatetimeLocal(timeEntry.departure_time),
          labor_hours: timeEntry.labor_hours,
          travel_hours: timeEntry.travel_hours,
          waiting_hours: timeEntry.waiting_hours,
          technician_comment: timeEntry.technician_comment || null,
        }),
      t("notice.timeSaved"),
    );
  }

  async function submitSignature(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await runAction("signature", () => addServiqSignature(selected.id, signature), t("notice.signatureSaved"));
  }

  async function submitPayment(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await runAction(
      "payment",
      async () => {
        await recordServiqPayment({
          work_order_id: selected.id,
          method: payment.method,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          provider: "manual",
          transaction_id: payment.transaction_id || null,
        });
        await refresh(selected.id);
      },
      t("notice.paymentRecorded"),
    );
  }

  async function completeSelected() {
    if (!selected) return;
    await runAction(
      "complete",
      async () => {
        const result = await completeServiqWorkOrder(selected.id);
        return result.work_order;
      },
      t("notice.workOrderCompleted"),
    );
  }

  async function viewReport() {
    if (!selected) return;
    await runAction(
      "report",
      async () => {
        await getServiqReport(selected.id);
      },
      t("notice.reportAvailable"),
    );
  }

  async function downloadPdf() {
    if (!selected) return;
    await runAction(
      "pdf",
      async () => {
        const blob = await downloadServiqReportPdf(selected.id);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `serviq-${selected.order_no}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      t("notice.pdfDownloaded"),
    );
  }

  async function emailReport() {
    if (!selected?.customer.email) {
      setError(t("error.customerEmailMissing"));
      return;
    }
    await runAction(
      "email",
      async () => {
        await sendServiqEmail(selected.id, selected.customer.email ?? "");
      },
      t("notice.emailQueued"),
    );
  }

  async function loadAssistantSummary() {
    if (!selected) return;
    setBusy("assistant");
    setError("");
    try {
      setAssistantSummary(await getServiqAssistantSummary(selected.id));
      setNotice(t("notice.assistantUpdated"));
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : t("error.assistantFailed"), t));
    } finally {
      setBusy("");
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 1180, margin: "0 auto", background: "#fafafa", minHeight: "100vh" }}>
      <Header
        selected={selected}
        loading={loading}
        busy={Boolean(busy)}
        onRefresh={() => refresh(selected?.id)}
        onNew={() => setShowCreate((value) => !value)}
        onConnection={() => setShowConnection((value) => !value)}
        t={t}
      />

      {showConnection && (
        <Card style={{ marginTop: 14 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>{t("serviq.connectionTitle")}</h2>
          <p style={{ margin: "0 0 12px", color: "#666", fontSize: 13 }}>{t("serviq.connectionHelp")}</p>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <Field label={t("field.orgId")}>
              <TextInput value={auth.orgId} onChange={(e) => setAuth((current) => ({ ...current, orgId: e.target.value }))} />
            </Field>
            <Field label={t("field.apiKey")}>
              <TextInput
                value={auth.apiKey}
                onChange={(e) => setAuth((current) => ({ ...current, apiKey: e.target.value }))}
                placeholder={t("field.apiKeyPlaceholder")}
                type="password"
              />
            </Field>
            <Button onClick={saveConnection} style={{ alignSelf: "end", background: "#2563eb" }}>
              {t("field.saveConnection")}
            </Button>
          </div>
        </Card>
      )}

      {showCreate && <CreateWorkOrderForm values={newOrder} setValues={setNewOrder} busy={Boolean(busy) || !hasApiKey} onSubmit={submitNewOrder} t={t} />}

      {notice && <p style={{ color: "#166534", fontSize: 13, margin: "12px 0 0" }}>{notice}</p>}
      {error && <p style={{ color: "#b91c1c", fontSize: 13, margin: "12px 0 0" }}>{error}</p>}

      <div className="serviq-shell" style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 18, marginTop: 18 }}>
        <section className={showList ? "work-list is-open" : "work-list"} style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>{t("serviq.workOrders")}</h2>
            <Button variant="secondary" onClick={() => setShowList(false)} style={{ display: "none" }} className="mobile-only">
              {t("common.close")}
            </Button>
          </div>
          {loading ? (
            <EmptyState message={t("serviq.loadingWorkOrders")} />
          ) : orders.length === 0 ? (
            <EmptyState message={t("serviq.noWorkOrders")} action={<Button onClick={() => setShowCreate(true)}>{t("serviq.createWorkOrder")}</Button>} />
          ) : (
            orders.map((order) => (
              <button
                key={order.id}
                onClick={() => {
                  setSelectedId(order.id);
                  setShowList(false);
                }}
                style={{
                  textAlign: "left",
                  border: `1px solid ${selected?.id === order.id ? "#111" : "#eee"}`,
                  borderRadius: 8,
                  padding: 12,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong style={{ color: "#111", fontSize: 14 }}>{order.order_no}</strong>
                  <StatusPill status={order.status} t={t} />
                </div>
                <p style={{ margin: "7px 0 2px", color: "#222", fontSize: 14 }}>{order.title}</p>
                <p style={{ margin: 0, color: "#777", fontSize: 12 }}>{order.customer.name}</p>
              </button>
            ))
          )}
        </section>

        <section style={{ minWidth: 0 }}>
          {!selected ? (
            <EmptyState message={error ? t("serviq.connectionRequired") : t("serviq.selectOrCreate")} />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <Card style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <StatusPill status={selected.status} t={t} />
                    <h2 style={{ margin: "10px 0 4px", fontSize: 22 }}>{selected.title}</h2>
                    <p style={{ margin: 0, color: "#777", fontSize: 13 }}>
                      {selected.order_no} · {selected.customer.name}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => setShowList(true)} style={{ display: "none" }} className="mobile-only">
                    {t("common.list")}
                  </Button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 14 }}>
                  <Button disabled={!canMutate || Boolean(busy)} onClick={beginVisit}>
                    {t("serviq.startVisit")}
                  </Button>
                  <Button disabled={!canMutate || Boolean(busy)} variant="secondary" onClick={endVisit}>
                    {t("serviq.endVisit")}
                  </Button>
                  <Button disabled={!canMutate || Boolean(busy)} variant="success" onClick={completeSelected}>
                    {t("serviq.complete")}
                  </Button>
                </div>
              </Card>

              <nav style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6 }}>
                {(["details", "materials", "time", "sign", "payment", "assistant"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      border: "1px solid #e5e5e5",
                      borderRadius: 8,
                      padding: "10px 6px",
                      background: activeTab === tab ? "#111" : "#fff",
                      color: activeTab === tab ? "#fff" : "#333",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {t(tabLabels[tab])}
                  </button>
                ))}
              </nav>

              {activeTab === "details" && (
                <DetailsTab selected={selected} onViewReport={viewReport} onDownloadPdf={downloadPdf} onEmailReport={emailReport} busy={Boolean(busy)} t={t} localeName={localeName} />
              )}
              {activeTab === "materials" && (
                <MaterialsTab selected={selected} material={material} setMaterial={setMaterial} canMutate={Boolean(canMutate)} busy={Boolean(busy)} onSubmit={submitMaterial} t={t} />
              )}
              {activeTab === "time" && (
                <TimeTab selected={selected} timeEntry={timeEntry} setTimeEntry={setTimeEntry} canMutate={Boolean(canMutate)} busy={Boolean(busy)} onSubmit={submitTime} t={t} localeName={localeName} />
              )}
              {activeTab === "sign" && (
                <SignatureTab selected={selected} signature={signature} setSignature={setSignature} canMutate={Boolean(canMutate)} busy={Boolean(busy)} onSubmit={submitSignature} t={t} />
              )}
              {activeTab === "payment" && (
                <PaymentTab selected={selected} payment={payment} setPayment={setPayment} canMutate={Boolean(canMutate)} busy={Boolean(busy)} onSubmit={submitPayment} t={t} localeName={localeName} />
              )}
              {activeTab === "assistant" && (
                <AssistantTab summary={assistantSummary} busy={Boolean(busy)} onRefresh={loadAssistantSummary} t={t} />
              )}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .mobile-only {
          display: none !important;
        }
        @media (max-width: 820px) {
          .serviq-shell {
            grid-template-columns: 1fr !important;
          }
          .work-list {
            display: none !important;
          }
          .work-list.is-open {
            display: grid !important;
          }
          .mobile-only {
            display: inline-flex !important;
          }
        }
        @media (max-width: 620px) {
          nav {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          main :global(button) {
            min-height: 42px;
          }
        }
      `}</style>
    </main>
  );
}

function Header({
  selected,
  loading,
  busy,
  onRefresh,
  onNew,
  onConnection,
  t,
}: {
  selected: ServiqWorkOrder | null;
  loading: boolean;
  busy: boolean;
  onRefresh: () => void;
  onNew: () => void;
  onConnection: () => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
      <div>
        <a href="/" style={{ color: "#666", fontSize: 14 }}>{t("nav.back")}</a>
        <h1 style={{ margin: "8px 0 4px", fontSize: 28, color: "#111" }}>{t("serviq.title")}</h1>
        <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
          {selected ? t("serviq.selected", { orderNo: selected.order_no }) : t("serviq.subtitle")}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <LanguageToggle />
        <a
          href="/serviq/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            color: "#111",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {t("nav.dashboard")}
        </a>
        <Button variant="secondary" onClick={onConnection}>{t("nav.connection")}</Button>
        <Button variant="secondary" onClick={onRefresh} disabled={loading || busy}>{t("common.refresh")}</Button>
        <Button onClick={onNew}>{t("common.new")}</Button>
      </div>
    </div>
  );
}

function CreateWorkOrderForm({
  values,
  setValues,
  busy,
  onSubmit,
  t,
}: {
  values: NewWorkOrderFormState;
  setValues: React.Dispatch<React.SetStateAction<NewWorkOrderFormState>>;
  busy: boolean;
  onSubmit: (e: FormEvent) => void;
  t: (key: MessageKey) => string;
}) {
  return (
    <Card style={{ marginTop: 14 }}>
      <form onSubmit={onSubmit}>
        <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>{t("serviq.newWorkOrder")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Field label={t("serviq.orderNo")}>
            <TextInput required value={values.orderNo} onChange={(e) => setValues((v) => ({ ...v, orderNo: e.target.value }))} />
          </Field>
          <Field label={t("serviq.titleField")}>
            <TextInput required value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} />
          </Field>
          <Field label={t("serviq.priority")}>
            <SelectInput value={values.priority} onChange={(e) => setValues((v) => ({ ...v, priority: e.target.value }))}>
              <option value="LOW">{t("priority.LOW")}</option>
              <option value="NORMAL">{t("priority.NORMAL")}</option>
              <option value="HIGH">{t("priority.HIGH")}</option>
              <option value="URGENT">{t("priority.URGENT")}</option>
            </SelectInput>
          </Field>
          <Field label={t("serviq.scheduledFor")}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 112px", gap: 8 }}>
              <TextInput
                type="date"
                aria-label={t("serviq.scheduledDate")}
                value={values.scheduledDate}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    scheduledDate: e.target.value,
                  }))
                }
              />
              <SelectInput
                aria-label={t("serviq.scheduledTime")}
                value={values.scheduledTime}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    scheduledTime: e.target.value,
                  }))
                }
              >
                <option value="">{t("serviq.scheduledTime")}</option>
                {scheduleTimes.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </SelectInput>
            </div>
          </Field>
          <Field label={t("serviq.customer")}>
            <TextInput required value={values.customerName} onChange={(e) => setValues((v) => ({ ...v, customerName: e.target.value }))} />
          </Field>
          <Field label={t("serviq.customerPhone")}>
            <TextInput value={values.customerPhone} onChange={(e) => setValues((v) => ({ ...v, customerPhone: e.target.value }))} />
          </Field>
          <Field label={t("serviq.customerEmail")}>
            <TextInput value={values.customerEmail} onChange={(e) => setValues((v) => ({ ...v, customerEmail: e.target.value }))} />
          </Field>
          <Field label={t("serviq.equipment")}>
            <TextInput value={values.equipmentName} onChange={(e) => setValues((v) => ({ ...v, equipmentName: e.target.value }))} />
          </Field>
          <Field label={t("serviq.model")}>
            <TextInput value={values.equipmentModel} onChange={(e) => setValues((v) => ({ ...v, equipmentModel: e.target.value }))} />
          </Field>
          <Field label={t("serviq.serialNo")}>
            <TextInput value={values.serialNumber} onChange={(e) => setValues((v) => ({ ...v, serialNumber: e.target.value }))} />
          </Field>
          <Field label={t("serviq.testTechnician")}>
            <SelectInput
              value={values.technicianName}
              onChange={(e) => {
                const selected = testTechnicians.find((tech) => tech.name === e.target.value);
                setValues((v) => ({
                  ...v,
                  technicianName: selected?.name ?? e.target.value,
                  technicianPhone: selected?.phone ?? "",
                }));
              }}
            >
              <option value="">{t("serviq.customTechnician")}</option>
              {testTechnicians.map((tech) => (
                <option key={tech.name} value={tech.name}>
                  {tech.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t("serviq.technician")}>
            <TextInput value={values.technicianName} onChange={(e) => setValues((v) => ({ ...v, technicianName: e.target.value }))} />
          </Field>
          <Field label={t("serviq.phone")}>
            <TextInput value={values.technicianPhone} onChange={(e) => setValues((v) => ({ ...v, technicianPhone: e.target.value }))} />
          </Field>
          <Field label={t("serviq.visitNotes")}>
            <TextArea value={values.visitNotes} onChange={(e) => setValues((v) => ({ ...v, visitNotes: e.target.value }))} />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#333", alignSelf: "end" }}>
            <input
              type="checkbox"
              checked={values.billToAccount}
              onChange={(e) => setValues((v) => ({ ...v, billToAccount: e.target.checked }))}
            />
            {t("serviq.billToAccount")}
          </label>
        </div>
        <Button disabled={busy} style={{ marginTop: 12 }}>{t("serviq.createWorkOrder")}</Button>
      </form>
    </Card>
  );
}

function DetailsTab({
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
    <Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                <Info label={t("serviq.customer")} value={selected.customer.name} />
                <Info label={t("serviq.phone")} value={selected.customer.phone ?? "-"} />
                <Info label={t("serviq.equipment")} value={selected.equipment?.name ?? "-"} />
                <Info label={t("serviq.serial")} value={selected.equipment?.serial_number ?? "-"} />
                <Info label={t("serviq.technician")} value={selected.technician?.name ?? "-"} />
                <Info label={t("serviq.scheduledFor")} value={compactDate(selected.scheduled_for, localeName)} />
                <Info label={t("serviq.created")} value={compactDate(selected.created_at, localeName)} />
              </div>
      {selected.visit_notes && <p style={{ margin: "14px 0 0", color: "#444", fontSize: 14 }}>{selected.visit_notes}</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        <Button variant="secondary" disabled={busy} onClick={onViewReport}>{t("serviq.viewReport")}</Button>
        <Button variant="secondary" disabled={busy} onClick={onDownloadPdf}>{t("serviq.downloadPdf")}</Button>
        <Button variant="secondary" disabled={busy || !selected.customer.email} onClick={onEmailReport}>{t("serviq.sendEmail")}</Button>
      </div>
    </Card>
  );
}

function MaterialsTab({
  selected,
  material,
  setMaterial,
  canMutate,
  busy,
  onSubmit,
  t,
}: {
  selected: ServiqWorkOrder;
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
    <ActionWithList
      title={t("serviq.materialUsage")}
      onSubmit={onSubmit}
      submitLabel={t("serviq.addMaterial")}
      disabled={!canMutate || busy}
      records={selected.materials.map((item) => (
        <Row key={item.id} left={item.material_name} right={`${item.quantity} ${item.unit}`} meta={`${item.material_code} · ${materialStatusLabel(item.status, t)}`} />
      ))}
      empty={t("serviq.noMaterials")}
      t={t}
    >
      <TextInput required placeholder={t("serviq.materialCode")} value={material.material_code} onChange={(e) => setMaterial((v) => ({ ...v, material_code: e.target.value }))} />
      <TextInput required placeholder={t("serviq.materialName")} value={material.material_name} onChange={(e) => setMaterial((v) => ({ ...v, material_name: e.target.value }))} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <TextInput required type="number" min="0.001" step="0.001" value={material.quantity} onChange={(e) => setMaterial((v) => ({ ...v, quantity: Number(e.target.value) }))} />
        <TextInput required value={material.unit} onChange={(e) => setMaterial((v) => ({ ...v, unit: e.target.value }))} />
      </div>
      <SelectInput value={material.status} onChange={(e) => setMaterial((v) => ({ ...v, status: e.target.value as ServiqMaterialStatus }))}>
        <option value="USED">{t("serviq.used")}</option>
        <option value="RETURNED">{t("serviq.returned")}</option>
      </SelectInput>
      <TextInput placeholder={t("serviq.warehouseLocation")} value={material.warehouse_location} onChange={(e) => setMaterial((v) => ({ ...v, warehouse_location: e.target.value }))} />
    </ActionWithList>
  );
}

function materialStatusLabel(status: ServiqMaterialStatus, t: (key: MessageKey) => string) {
  const labels: Record<ServiqMaterialStatus, MessageKey> = {
    USED: "serviq.used",
    RETURNED: "serviq.returned",
  };
  return t(labels[status]);
}

function TimeTab({
  selected,
  timeEntry,
  setTimeEntry,
  canMutate,
  busy,
  onSubmit,
  t,
  localeName,
}: {
  selected: ServiqWorkOrder;
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
    <ActionWithList
      title={t("serviq.timeTracking")}
      onSubmit={onSubmit}
      submitLabel={t("serviq.saveTime")}
      disabled={!canMutate || busy}
      records={selected.time_entries.map((item) => (
        <Row key={item.id} left={t("serviq.laborHours", { hours: item.labor_hours ?? 0 })} right={compactDate(item.arrival_time, localeName)} meta={item.technician_comment ?? ""} />
      ))}
      empty={t("serviq.noTimeEntries")}
      t={t}
    >
      <Field label={t("serviq.arrival")}>
        <TextInput type="datetime-local" value={timeEntry.arrival_time} onChange={(e) => setTimeEntry((v) => ({ ...v, arrival_time: e.target.value }))} />
      </Field>
      <Field label={t("serviq.departure")}>
        <TextInput type="datetime-local" value={timeEntry.departure_time} onChange={(e) => setTimeEntry((v) => ({ ...v, departure_time: e.target.value }))} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <TextInput type="number" min="0" step="0.25" value={timeEntry.labor_hours} onChange={(e) => setTimeEntry((v) => ({ ...v, labor_hours: Number(e.target.value) }))} />
        <TextInput type="number" min="0" step="0.25" value={timeEntry.travel_hours} onChange={(e) => setTimeEntry((v) => ({ ...v, travel_hours: Number(e.target.value) }))} />
        <TextInput type="number" min="0" step="0.25" value={timeEntry.waiting_hours} onChange={(e) => setTimeEntry((v) => ({ ...v, waiting_hours: Number(e.target.value) }))} />
      </div>
      <TextArea placeholder={t("serviq.technicianComment")} value={timeEntry.technician_comment} onChange={(e) => setTimeEntry((v) => ({ ...v, technician_comment: e.target.value }))} />
    </ActionWithList>
  );
}

function SignatureTab({
  selected,
  signature,
  setSignature,
  canMutate,
  busy,
  onSubmit,
  t,
}: {
  selected: ServiqWorkOrder;
  signature: { signer_type: "CUSTOMER" | "TECHNICIAN"; signer_name: string; image_data_url: string };
  setSignature: React.Dispatch<React.SetStateAction<typeof signature>>;
  canMutate: boolean;
  busy: boolean;
  onSubmit: (e: FormEvent) => void;
  t: (key: MessageKey) => string;
}) {
  return (
    <ActionWithList
      title={t("serviq.signature")}
      onSubmit={onSubmit}
      submitLabel={t("serviq.saveSignature")}
      disabled={!canMutate || busy}
      records={selected.signatures.map((item) => (
        <Row key={item.id} left={item.signer_name} right={item.signer_type} meta={item.image_data_url ? t("serviq.capturedSignature") : t("serviq.signatureWithoutImage")} />
      ))}
      empty={t("serviq.noSignatures")}
      t={t}
    >
      <SelectInput value={signature.signer_type} onChange={(e) => setSignature((v) => ({ ...v, signer_type: e.target.value as "CUSTOMER" | "TECHNICIAN" }))}>
        <option value="CUSTOMER">{t("serviq.customer")}</option>
        <option value="TECHNICIAN">{t("serviq.technician")}</option>
      </SelectInput>
      <TextInput required placeholder={t("serviq.signerName")} value={signature.signer_name} onChange={(e) => setSignature((v) => ({ ...v, signer_name: e.target.value }))} />
      <SignatureCanvas
        value={signature.image_data_url}
        onChange={(value) => setSignature((v) => ({ ...v, image_data_url: value }))}
        clearLabel={t("serviq.clearSignature")}
      />
    </ActionWithList>
  );
}

function SignatureCanvas({
  value,
  onChange,
  clearLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  clearLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const p = point(event);
    if (!canvas || !p) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const p = point(event);
    if (!canvas || !p) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    onChange(canvas.toDataURL("image/png"));
  }

  function stop() {
    drawingRef.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <canvas
        ref={canvasRef}
        width={640}
        height={220}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerLeave={stop}
        style={{
          width: "100%",
          aspectRatio: "16 / 5.5",
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#fff",
          touchAction: "none",
        }}
      />
      <Button type="button" variant="secondary" onClick={clear} disabled={!value}>
        {clearLabel}
      </Button>
    </div>
  );
}

function PaymentTab({
  selected,
  payment,
  setPayment,
  canMutate,
  busy,
  onSubmit,
  t,
  localeName,
}: {
  selected: ServiqWorkOrder;
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
  localeName: string;
}) {
  return (
    <ActionWithList
      title={t("serviq.payment")}
      onSubmit={onSubmit}
      submitLabel={t("serviq.recordPayment")}
      disabled={!canMutate || busy}
      records={selected.payments.map((item) => (
        <Row key={item.id} left={paymentMethodLabel(item.method, t)} right={money(item.amount, localeName, item.currency)} meta={paymentStatusLabel(item.status, t)} />
      ))}
      empty={t("serviq.noPayments")}
      t={t}
    >
      <SelectInput value={payment.method} onChange={(e) => setPayment((v) => ({ ...v, method: e.target.value as ServiqPaymentMethod }))}>
        <option value="CURRENT_ACCOUNT">{t("serviq.billToAccount")}</option>
        <option value="CASH">{t("serviq.cash")}</option>
        <option value="CREDIT_CARD">{t("serviq.creditCard")}</option>
        <option value="VIRTUAL_POS">{t("serviq.virtualPos")}</option>
      </SelectInput>
      <SelectInput value={payment.status} onChange={(e) => setPayment((v) => ({ ...v, status: e.target.value as ServiqPaymentStatus }))}>
        <option value="CURRENT_ACCOUNT">{t("serviq.billToAccount")}</option>
        <option value="PAYMENT_PENDING">{t("serviq.paymentPending")}</option>
        <option value="PAID">{t("serviq.paid")}</option>
        <option value="UNPAID">{t("serviq.unpaid")}</option>
      </SelectInput>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8 }}>
        <TextInput type="number" min="0" step="0.01" value={payment.amount} onChange={(e) => setPayment((v) => ({ ...v, amount: Number(e.target.value) }))} />
        <TextInput value={payment.currency} onChange={(e) => setPayment((v) => ({ ...v, currency: e.target.value }))} />
      </div>
      <TextInput placeholder={t("serviq.transactionRef")} value={payment.transaction_id} onChange={(e) => setPayment((v) => ({ ...v, transaction_id: e.target.value }))} />
    </ActionWithList>
  );
}

function paymentMethodLabel(method: ServiqPaymentMethod, t: (key: MessageKey) => string) {
  const labels: Record<ServiqPaymentMethod, MessageKey> = {
    CURRENT_ACCOUNT: "serviq.billToAccount",
    CASH: "serviq.cash",
    CREDIT_CARD: "serviq.creditCard",
    VIRTUAL_POS: "serviq.virtualPos",
  };
  return t(labels[method]);
}

function paymentStatusLabel(status: ServiqPaymentStatus, t: (key: MessageKey) => string) {
  const labels: Record<ServiqPaymentStatus, MessageKey> = {
    CURRENT_ACCOUNT: "serviq.billToAccount",
    PAYMENT_PENDING: "serviq.paymentPending",
    PAID: "serviq.paid",
    UNPAID: "serviq.unpaid",
    FAILED: "serviq.failed",
  };
  return t(labels[status]);
}

function AssistantTab({
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>{t("serviq.technicianAssistant")}</h3>
        <Button disabled={busy} onClick={onRefresh}>{t("serviq.generateSummary")}</Button>
      </div>
      {!summary ? (
        <p style={{ color: "#777", fontSize: 14, margin: "12px 0 0" }}>
          {t("serviq.assistantIntro")}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          <p style={{ margin: 0, color: "#222", fontSize: 14, lineHeight: 1.6 }}>{summary.summary}</p>
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>{t("serviq.nextActions")}</h4>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#444", fontSize: 14 }}>
              {summary.next_actions.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <TextArea readOnly value={summary.customer_email_draft} />
          <TextArea readOnly value={summary.erp_notification_text} />
        </div>
      )}
    </Card>
  );
}

function ActionWithList({
  title,
  children,
  onSubmit,
  submitLabel,
  disabled,
  records,
  empty,
  t,
}: {
  title: string;
  children: ReactNode;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  disabled: boolean;
  records: ReactNode[];
  empty: string;
  t: (key: MessageKey) => string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 14 }}>
      <Card>
        <form onSubmit={onSubmit}>
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>{title}</h3>
          <div style={{ display: "grid", gap: 9 }}>{children}</div>
          <Button disabled={disabled} style={{ marginTop: 10 }}>{submitLabel}</Button>
        </form>
      </Card>
      <Card>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>{t("common.records")}</h3>
        {records.length === 0 ? <p style={{ margin: 0, color: "#999", fontSize: 13 }}>{empty}</p> : <div style={{ display: "grid", gap: 9 }}>{records}</div>}
      </Card>
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <Card style={{ color: "#777", fontSize: 14, lineHeight: 1.5 }}>
      <p style={{ margin: action ? "0 0 10px" : 0 }}>{message}</p>
      {action}
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
      <p style={{ margin: "0 0 3px", color: "#999", fontSize: 11, fontWeight: 800 }}>{label}</p>
      <p style={{ margin: 0, color: "#222", fontSize: 14 }}>{value}</p>
    </div>
  );
}

function Row({ left, right, meta }: { left: string; right: string; meta: string }) {
  return (
    <div style={{ borderTop: "1px solid #f1f1f1", paddingTop: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <strong style={{ fontSize: 13, color: "#222" }}>{left}</strong>
        <span style={{ fontSize: 12, color: "#666" }}>{right}</span>
      </div>
      {meta && <p style={{ margin: "3px 0 0", fontSize: 12, color: "#999" }}>{meta}</p>}
    </div>
  );
}
