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

const DEFAULT_ORG_ID = "11111111-1111-1111-1111-111111111111";

type Tab = "details" | "materials" | "time" | "sign" | "payment" | "assistant";
type NewWorkOrderFormState = {
  orderNo: string;
  title: string;
  priority: string;
  scheduledFor: string;
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

function compactDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
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

function money(value: number | null, currency = "TRY") {
  if (value == null) return "-";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
}

function friendlyError(message: string) {
  if (message.includes("401")) return "Authentication failed. Check the API key or access token.";
  if (message.includes("403")) return "This account cannot perform that action for the selected organization.";
  if (message.includes("422")) return "Required information is missing or invalid.";
  if (message.includes("Payment is required")) return "Record a payment or bill this customer to account before completion.";
  if (message.includes("cannot be modified")) return "Completed or cancelled work orders cannot be changed.";
  if (message.includes("DATABASE_URL")) return "The API database connection is not configured.";
  return message;
}

function StatusPill({ status }: { status: string }) {
  return <Badge color={statusColor[status] ?? "#444"}>{status.replace("_", " ")}</Badge>;
}

export default function ServiqPage() {
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
    scheduledFor: "",
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

  async function refresh(nextSelectedId?: string) {
    setLoading(true);
    setError("");
    try {
      const data = await listServiqWorkOrders();
      setOrders(data);
      if (nextSelectedId) setSelectedId(nextSelectedId);
      else {
        const storedSelected = localStorage.getItem("openops_serviq_selected_order");
        if (storedSelected && data.some((order) => order.id === storedSelected)) {
          setSelectedId(storedSelected);
        } else if (!selectedId && data[0]) {
          setSelectedId(data[0].id);
        }
      }
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : "Could not load SERVIQ work orders"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const storedOrgId = localStorage.getItem("openops_org_id") ?? DEFAULT_ORG_ID;
    const storedApiKey = localStorage.getItem("openops_api_key") ?? "";
    localStorage.setItem("openops_org_id", storedOrgId);
    setAuth({ orgId: storedOrgId, apiKey: storedApiKey });
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveConnection() {
    localStorage.setItem("openops_org_id", auth.orgId || DEFAULT_ORG_ID);
    if (auth.apiKey) localStorage.setItem("openops_api_key", auth.apiKey);
    else localStorage.removeItem("openops_api_key");
    setNotice("Connection saved.");
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
      setError(friendlyError(e instanceof Error ? e.message : `${label} failed`));
    } finally {
      setBusy("");
    }
  }

  async function submitNewOrder(e: FormEvent) {
    e.preventDefault();
    await runAction(
      "create",
      async () => {
        const created = await createServiqWorkOrder({
          order_no: newOrder.orderNo,
          title: newOrder.title,
          priority: newOrder.priority || null,
          scheduled_for: newOrder.scheduledFor ? new Date(newOrder.scheduledFor).toISOString() : null,
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
        localStorage.setItem("openops_serviq_selected_order", created.id);
        setShowCreate(false);
        return created;
      },
      "Work order created.",
    );
  }

  async function beginVisit() {
    if (!selected) return;
    setTimeEntry((current) => ({ ...current, arrival_time: toDatetimeLocal(new Date()) }));
    await runAction("start", () => startServiqWorkOrder(selected.id), "Visit started.");
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
      "Material saved.",
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
      "Time entry saved.",
    );
  }

  async function submitSignature(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await runAction("signature", () => addServiqSignature(selected.id, signature), "Signature saved.");
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
      "Payment recorded.",
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
      "Work order completed.",
    );
  }

  async function viewReport() {
    if (!selected) return;
    await runAction(
      "report",
      async () => {
        await getServiqReport(selected.id);
      },
      "Service report is available from the API.",
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
      "PDF downloaded.",
    );
  }

  async function emailReport() {
    if (!selected?.customer.email) {
      setError("Customer email is missing.");
      return;
    }
    await runAction(
      "email",
      async () => {
        await sendServiqEmail(selected.id, selected.customer.email ?? "");
      },
      "Service report email queued.",
    );
  }

  async function loadAssistantSummary() {
    if (!selected) return;
    setBusy("assistant");
    setError("");
    try {
      setAssistantSummary(await getServiqAssistantSummary(selected.id));
      setNotice("Assistant summary updated.");
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : "Assistant summary failed"));
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
      />

      {showConnection && (
        <Card style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 14 }}>
          <Field label="Org ID">
            <TextInput value={auth.orgId} onChange={(e) => setAuth((current) => ({ ...current, orgId: e.target.value }))} />
          </Field>
          <Field label="API key">
            <TextInput
              value={auth.apiKey}
              onChange={(e) => setAuth((current) => ({ ...current, apiKey: e.target.value }))}
              placeholder="Local development key"
              type="password"
            />
          </Field>
          <Button onClick={saveConnection} style={{ alignSelf: "end", background: "#2563eb" }}>
            Save connection
          </Button>
        </Card>
      )}

      {showCreate && <CreateWorkOrderForm values={newOrder} setValues={setNewOrder} busy={Boolean(busy)} onSubmit={submitNewOrder} />}

      {notice && <p style={{ color: "#166534", fontSize: 13, margin: "12px 0 0" }}>{notice}</p>}
      {error && <p style={{ color: "#b91c1c", fontSize: 13, margin: "12px 0 0" }}>{error}</p>}

      <div className="serviq-shell" style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 18, marginTop: 18 }}>
        <section className={showList ? "work-list is-open" : "work-list"} style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Work orders</h2>
            <Button variant="secondary" onClick={() => setShowList(false)} style={{ display: "none" }} className="mobile-only">
              Close
            </Button>
          </div>
          {loading ? (
            <EmptyState message="Loading work orders..." />
          ) : orders.length === 0 ? (
            <EmptyState message="No work orders yet." action={<Button onClick={() => setShowCreate(true)}>Create work order</Button>} />
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
                  <StatusPill status={order.status} />
                </div>
                <p style={{ margin: "7px 0 2px", color: "#222", fontSize: 14 }}>{order.title}</p>
                <p style={{ margin: 0, color: "#777", fontSize: 12 }}>{order.customer.name}</p>
              </button>
            ))
          )}
        </section>

        <section style={{ minWidth: 0 }}>
          {!selected ? (
            <EmptyState message={error ? "Connection is required before work orders can load." : "Select or create a work order."} />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <Card style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <StatusPill status={selected.status} />
                    <h2 style={{ margin: "10px 0 4px", fontSize: 22 }}>{selected.title}</h2>
                    <p style={{ margin: 0, color: "#777", fontSize: 13 }}>
                      {selected.order_no} · {selected.customer.name}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => setShowList(true)} style={{ display: "none" }} className="mobile-only">
                    List
                  </Button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 14 }}>
                  <Button disabled={!canMutate || Boolean(busy)} onClick={beginVisit}>
                    Start visit
                  </Button>
                  <Button disabled={!canMutate || Boolean(busy)} variant="secondary" onClick={endVisit}>
                    End visit
                  </Button>
                  <Button disabled={!canMutate || Boolean(busy)} variant="success" onClick={completeSelected}>
                    Complete
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
                    {tab[0].toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>

              {activeTab === "details" && (
                <DetailsTab selected={selected} onViewReport={viewReport} onDownloadPdf={downloadPdf} onEmailReport={emailReport} busy={Boolean(busy)} />
              )}
              {activeTab === "materials" && (
                <MaterialsTab selected={selected} material={material} setMaterial={setMaterial} canMutate={Boolean(canMutate)} busy={Boolean(busy)} onSubmit={submitMaterial} />
              )}
              {activeTab === "time" && (
                <TimeTab selected={selected} timeEntry={timeEntry} setTimeEntry={setTimeEntry} canMutate={Boolean(canMutate)} busy={Boolean(busy)} onSubmit={submitTime} />
              )}
              {activeTab === "sign" && (
                <SignatureTab selected={selected} signature={signature} setSignature={setSignature} canMutate={Boolean(canMutate)} busy={Boolean(busy)} onSubmit={submitSignature} />
              )}
              {activeTab === "payment" && (
                <PaymentTab selected={selected} payment={payment} setPayment={setPayment} canMutate={Boolean(canMutate)} busy={Boolean(busy)} onSubmit={submitPayment} />
              )}
              {activeTab === "assistant" && (
                <AssistantTab summary={assistantSummary} busy={Boolean(busy)} onRefresh={loadAssistantSummary} />
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
}: {
  selected: ServiqWorkOrder | null;
  loading: boolean;
  busy: boolean;
  onRefresh: () => void;
  onNew: () => void;
  onConnection: () => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
      <div>
        <a href="/" style={{ color: "#666", fontSize: 14 }}>Back</a>
        <h1 style={{ margin: "8px 0 4px", fontSize: 28, color: "#111" }}>Work Orders</h1>
        <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
          {selected ? `${selected.order_no} selected` : "SERVIQ field service"}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
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
          Dashboard
        </a>
        <Button variant="secondary" onClick={onConnection}>Connection</Button>
        <Button variant="secondary" onClick={onRefresh} disabled={loading || busy}>Refresh</Button>
        <Button onClick={onNew}>New</Button>
      </div>
    </div>
  );
}

function CreateWorkOrderForm({
  values,
  setValues,
  busy,
  onSubmit,
}: {
  values: NewWorkOrderFormState;
  setValues: React.Dispatch<React.SetStateAction<NewWorkOrderFormState>>;
  busy: boolean;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <Card style={{ marginTop: 14 }}>
      <form onSubmit={onSubmit}>
        <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>New work order</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Field label="Order no">
            <TextInput required value={values.orderNo} onChange={(e) => setValues((v) => ({ ...v, orderNo: e.target.value }))} />
          </Field>
          <Field label="Title">
            <TextInput required value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} />
          </Field>
          <Field label="Priority">
            <SelectInput value={values.priority} onChange={(e) => setValues((v) => ({ ...v, priority: e.target.value }))}>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </SelectInput>
          </Field>
          <Field label="Scheduled for">
            <TextInput
              type="datetime-local"
              value={values.scheduledFor}
              onChange={(e) => setValues((v) => ({ ...v, scheduledFor: e.target.value }))}
            />
          </Field>
          <Field label="Customer">
            <TextInput required value={values.customerName} onChange={(e) => setValues((v) => ({ ...v, customerName: e.target.value }))} />
          </Field>
          <Field label="Customer phone">
            <TextInput value={values.customerPhone} onChange={(e) => setValues((v) => ({ ...v, customerPhone: e.target.value }))} />
          </Field>
          <Field label="Customer email">
            <TextInput value={values.customerEmail} onChange={(e) => setValues((v) => ({ ...v, customerEmail: e.target.value }))} />
          </Field>
          <Field label="Equipment">
            <TextInput value={values.equipmentName} onChange={(e) => setValues((v) => ({ ...v, equipmentName: e.target.value }))} />
          </Field>
          <Field label="Model">
            <TextInput value={values.equipmentModel} onChange={(e) => setValues((v) => ({ ...v, equipmentModel: e.target.value }))} />
          </Field>
          <Field label="Serial no">
            <TextInput value={values.serialNumber} onChange={(e) => setValues((v) => ({ ...v, serialNumber: e.target.value }))} />
          </Field>
          <Field label="Technician">
            <TextInput value={values.technicianName} onChange={(e) => setValues((v) => ({ ...v, technicianName: e.target.value }))} />
          </Field>
          <Field label="Visit notes">
            <TextArea value={values.visitNotes} onChange={(e) => setValues((v) => ({ ...v, visitNotes: e.target.value }))} />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#333", alignSelf: "end" }}>
            <input
              type="checkbox"
              checked={values.billToAccount}
              onChange={(e) => setValues((v) => ({ ...v, billToAccount: e.target.checked }))}
            />
            Bill to account
          </label>
        </div>
        <Button disabled={busy} style={{ marginTop: 12 }}>Create work order</Button>
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
}: {
  selected: ServiqWorkOrder;
  onViewReport: () => void;
  onDownloadPdf: () => void;
  onEmailReport: () => void;
  busy: boolean;
}) {
  return (
    <Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                <Info label="Customer" value={selected.customer.name} />
                <Info label="Phone" value={selected.customer.phone ?? "-"} />
                <Info label="Equipment" value={selected.equipment?.name ?? "-"} />
                <Info label="Serial" value={selected.equipment?.serial_number ?? "-"} />
                <Info label="Technician" value={selected.technician?.name ?? "-"} />
                <Info label="Scheduled for" value={compactDate(selected.scheduled_for)} />
                <Info label="Created" value={compactDate(selected.created_at)} />
              </div>
      {selected.visit_notes && <p style={{ margin: "14px 0 0", color: "#444", fontSize: 14 }}>{selected.visit_notes}</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        <Button variant="secondary" disabled={busy} onClick={onViewReport}>View report</Button>
        <Button variant="secondary" disabled={busy} onClick={onDownloadPdf}>Download PDF</Button>
        <Button variant="secondary" disabled={busy || !selected.customer.email} onClick={onEmailReport}>Send email</Button>
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
}) {
  return (
    <ActionWithList
      title="Material usage"
      onSubmit={onSubmit}
      submitLabel="Add material"
      disabled={!canMutate || busy}
      records={selected.materials.map((item) => (
        <Row key={item.id} left={item.material_name} right={`${item.quantity} ${item.unit}`} meta={`${item.material_code} · ${item.status}`} />
      ))}
      empty="No materials recorded."
    >
      <TextInput required placeholder="Material code" value={material.material_code} onChange={(e) => setMaterial((v) => ({ ...v, material_code: e.target.value }))} />
      <TextInput required placeholder="Material name" value={material.material_name} onChange={(e) => setMaterial((v) => ({ ...v, material_name: e.target.value }))} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <TextInput required type="number" min="0.001" step="0.001" value={material.quantity} onChange={(e) => setMaterial((v) => ({ ...v, quantity: Number(e.target.value) }))} />
        <TextInput required value={material.unit} onChange={(e) => setMaterial((v) => ({ ...v, unit: e.target.value }))} />
      </div>
      <SelectInput value={material.status} onChange={(e) => setMaterial((v) => ({ ...v, status: e.target.value as ServiqMaterialStatus }))}>
        <option value="USED">Used</option>
        <option value="RETURNED">Returned</option>
      </SelectInput>
      <TextInput placeholder="Warehouse location" value={material.warehouse_location} onChange={(e) => setMaterial((v) => ({ ...v, warehouse_location: e.target.value }))} />
    </ActionWithList>
  );
}

function TimeTab({
  selected,
  timeEntry,
  setTimeEntry,
  canMutate,
  busy,
  onSubmit,
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
}) {
  return (
    <ActionWithList
      title="Time tracking"
      onSubmit={onSubmit}
      submitLabel="Save time"
      disabled={!canMutate || busy}
      records={selected.time_entries.map((item) => (
        <Row key={item.id} left={`${item.labor_hours ?? 0} labor hours`} right={compactDate(item.arrival_time)} meta={item.technician_comment ?? ""} />
      ))}
      empty="No time entries recorded."
    >
      <Field label="Arrival">
        <TextInput type="datetime-local" value={timeEntry.arrival_time} onChange={(e) => setTimeEntry((v) => ({ ...v, arrival_time: e.target.value }))} />
      </Field>
      <Field label="Departure">
        <TextInput type="datetime-local" value={timeEntry.departure_time} onChange={(e) => setTimeEntry((v) => ({ ...v, departure_time: e.target.value }))} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <TextInput type="number" min="0" step="0.25" value={timeEntry.labor_hours} onChange={(e) => setTimeEntry((v) => ({ ...v, labor_hours: Number(e.target.value) }))} />
        <TextInput type="number" min="0" step="0.25" value={timeEntry.travel_hours} onChange={(e) => setTimeEntry((v) => ({ ...v, travel_hours: Number(e.target.value) }))} />
        <TextInput type="number" min="0" step="0.25" value={timeEntry.waiting_hours} onChange={(e) => setTimeEntry((v) => ({ ...v, waiting_hours: Number(e.target.value) }))} />
      </div>
      <TextArea placeholder="Technician comment" value={timeEntry.technician_comment} onChange={(e) => setTimeEntry((v) => ({ ...v, technician_comment: e.target.value }))} />
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
}: {
  selected: ServiqWorkOrder;
  signature: { signer_type: "CUSTOMER" | "TECHNICIAN"; signer_name: string; image_data_url: string };
  setSignature: React.Dispatch<React.SetStateAction<typeof signature>>;
  canMutate: boolean;
  busy: boolean;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <ActionWithList
      title="Signature"
      onSubmit={onSubmit}
      submitLabel="Save signature"
      disabled={!canMutate || busy}
      records={selected.signatures.map((item) => (
        <Row key={item.id} left={item.signer_name} right={item.signer_type} meta={item.image_data_url ? "Captured signature" : "Signature without image"} />
      ))}
      empty="No signatures recorded."
    >
      <SelectInput value={signature.signer_type} onChange={(e) => setSignature((v) => ({ ...v, signer_type: e.target.value as "CUSTOMER" | "TECHNICIAN" }))}>
        <option value="CUSTOMER">Customer</option>
        <option value="TECHNICIAN">Technician</option>
      </SelectInput>
      <TextInput required placeholder="Signer name" value={signature.signer_name} onChange={(e) => setSignature((v) => ({ ...v, signer_name: e.target.value }))} />
      <SignatureCanvas
        value={signature.image_data_url}
        onChange={(value) => setSignature((v) => ({ ...v, image_data_url: value }))}
      />
    </ActionWithList>
  );
}

function SignatureCanvas({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
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
        Clear signature
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
}) {
  return (
    <ActionWithList
      title="Payment"
      onSubmit={onSubmit}
      submitLabel="Record payment"
      disabled={!canMutate || busy}
      records={selected.payments.map((item) => (
        <Row key={item.id} left={item.method.replace("_", " ")} right={money(item.amount, item.currency)} meta={item.status.replace("_", " ")} />
      ))}
      empty="No payments recorded."
    >
      <SelectInput value={payment.method} onChange={(e) => setPayment((v) => ({ ...v, method: e.target.value as ServiqPaymentMethod }))}>
        <option value="CURRENT_ACCOUNT">Bill to account</option>
        <option value="CASH">Cash</option>
        <option value="CREDIT_CARD">Credit card</option>
        <option value="VIRTUAL_POS">Virtual POS</option>
      </SelectInput>
      <SelectInput value={payment.status} onChange={(e) => setPayment((v) => ({ ...v, status: e.target.value as ServiqPaymentStatus }))}>
        <option value="CURRENT_ACCOUNT">Bill to account</option>
        <option value="PAYMENT_PENDING">Payment pending</option>
        <option value="PAID">Paid</option>
        <option value="UNPAID">Unpaid</option>
      </SelectInput>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8 }}>
        <TextInput type="number" min="0" step="0.01" value={payment.amount} onChange={(e) => setPayment((v) => ({ ...v, amount: Number(e.target.value) }))} />
        <TextInput value={payment.currency} onChange={(e) => setPayment((v) => ({ ...v, currency: e.target.value }))} />
      </div>
      <TextInput placeholder="Transaction/reference no" value={payment.transaction_id} onChange={(e) => setPayment((v) => ({ ...v, transaction_id: e.target.value }))} />
    </ActionWithList>
  );
}

function AssistantTab({
  summary,
  busy,
  onRefresh,
}: {
  summary: ServiqAssistantSummary | null;
  busy: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Technician assistant</h3>
        <Button disabled={busy} onClick={onRefresh}>Generate summary</Button>
      </div>
      {!summary ? (
        <p style={{ color: "#777", fontSize: 14, margin: "12px 0 0" }}>
          Generate a work-order summary grounded in the recorded job data.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          <p style={{ margin: 0, color: "#222", fontSize: 14, lineHeight: 1.6 }}>{summary.summary}</p>
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Next actions</h4>
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
}: {
  title: string;
  children: ReactNode;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  disabled: boolean;
  records: ReactNode[];
  empty: string;
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
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Records</h3>
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
