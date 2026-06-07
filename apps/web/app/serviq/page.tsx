"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  addServiqMaterial,
  addServiqSignature,
  addServiqTimeEntry,
  completeServiqWorkOrder,
  downloadServiqReportPdf,
  getServiqAssistantSummary,
  getServiqReport,
  listServiqWorkOrders,
  recordServiqPayment,
  startServiqWorkOrder,
  sendServiqEmail,
  type ServiqMaterialStatus,
  type ServiqPaymentMethod,
  type ServiqPaymentStatus,
  type ServiqAssistantSummary,
  type ServiqWorkOrder,
} from "@/lib/api";
import { Badge, Button, Card, Field, SelectInput, TextArea, TextInput, colors } from "@/components/ui";
import { LanguageToggle, localeTag, useLocale, useT, type MessageKey } from "@/lib/i18n";
import { Briefcase, Settings, Plus, Menu, ArrowLeft, Play, CheckCircle, Package, Clock, PenTool, CreditCard, Sparkles, AlertCircle, LayoutDashboard, CheckSquare, LogOut, FileText } from "lucide-react";

import { WorkOrderDetail } from "../../components/serviq/WorkOrderDetail";
import { MaterialUsageTable } from "../../components/serviq/MaterialUsageTable";
import { TimeTrackingForm } from "../../components/serviq/TimeTrackingForm";
import { SignatureCanvas } from "../../components/serviq/SignaturePad";
import { PaymentModal } from "../../components/serviq/PaymentModal";
import { AssistantTab } from "../../components/serviq/AssistantTab";

const DEFAULT_ORG_ID = "11111111-1111-1111-1111-111111111111";
const DEMO_ORDERS_KEY = "serviq_demo_orders";

type Tab = "details" | "materials" | "time" | "sign" | "payment" | "assistant";

const statusColor: Record<string, string> = {
  OPEN: colors.primary,
  IN_PROGRESS: colors.warning,
  COMPLETED: colors.success,
  CANCELLED: colors.muted,
};

function loadDemoOrders() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DEMO_ORDERS_KEY) ?? "[]") as ServiqWorkOrder[];
  } catch {
    return [];
  }
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
  return <Badge color={statusColor[status] ?? colors.muted}>{t(key)}</Badge>;
}

const tabLabels: Record<Tab, { label: MessageKey; icon: React.ReactNode }> = {
  details: { label: "serviq.details", icon: <Briefcase size={16} /> },
  materials: { label: "serviq.materials", icon: <Package size={16} /> },
  time: { label: "serviq.time", icon: <Clock size={16} /> },
  sign: { label: "serviq.sign", icon: <PenTool size={16} /> },
  payment: { label: "serviq.payment", icon: <CreditCard size={16} /> },
  assistant: { label: "serviq.assistant", icon: <Sparkles size={16} /> },
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
  
  // Forms states
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
      const merged = [...loadDemoOrders(), ...data];
      setOrders(merged);
      if (nextSelectedId) setSelectedId(nextSelectedId);
      else {
        const storedSelected = localStorage.getItem("serviq_selected_order");
        if (storedSelected && merged.some((order) => order.id === storedSelected)) {
          setSelectedId(storedSelected);
        } else if (!selectedId && merged[0]) {
          setSelectedId(merged[0].id);
        }
      }
    } catch (e) {
      const demoOrders = loadDemoOrders();
      setOrders(demoOrders);
      if (demoOrders[0] && !selectedId) setSelectedId(demoOrders[0].id);
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
    refresh();
  }, []);

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

  function toDatetimeLocal(value: Date) {
    const offset = value.getTimezoneOffset() * 60000;
    return new Date(value.getTime() - offset).toISOString().slice(0, 16);
  }

  function fromDatetimeLocal(value: string) {
    return value ? new Date(value).toISOString() : null;
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

  async function submitMaterial(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await runAction("material", () => addServiqMaterial(selected.id, { ...material, warehouse_location: material.warehouse_location || null }), t("notice.materialSaved"));
  }

  async function submitTime(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await runAction("time", () => addServiqTimeEntry(selected.id, {
      arrival_time: fromDatetimeLocal(timeEntry.arrival_time),
      departure_time: fromDatetimeLocal(timeEntry.departure_time),
      labor_hours: timeEntry.labor_hours,
      travel_hours: timeEntry.travel_hours,
      waiting_hours: timeEntry.waiting_hours,
      technician_comment: timeEntry.technician_comment || null,
    }), t("notice.timeSaved"));
  }

  async function submitSignature(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await runAction("signature", () => addServiqSignature(selected.id, signature), t("notice.signatureSaved"));
  }

  async function submitPayment(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await runAction("payment", async () => {
      await recordServiqPayment({ work_order_id: selected.id, method: payment.method, status: payment.status, amount: payment.amount, currency: payment.currency, provider: "manual", transaction_id: payment.transaction_id || null });
      await refresh(selected.id);
    }, t("notice.paymentRecorded"));
  }

  async function viewReport() {
    if (!selected) return;
    await runAction("report", async () => { await getServiqReport(selected.id); }, t("notice.reportAvailable"));
  }

  async function downloadPdf() {
    if (!selected) return;
    await runAction("pdf", async () => {
      const blob = await downloadServiqReportPdf(selected.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `serviq-${selected.order_no}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    }, t("notice.pdfDownloaded"));
  }

  async function emailReport() {
    if (!selected?.customer.email) {
      setError(t("error.customerEmailMissing"));
      return;
    }
    await runAction("email", async () => { await sendServiqEmail(selected.id, selected.customer.email ?? ""); }, t("notice.emailQueued"));
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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: colors.soft, overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* OpenCRM Style Top Navbar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "#ffffff", color: colors.text, borderBottom: `1px solid ${colors.border}`, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="mobile-only" onClick={() => setShowList(!showList)} style={{ background: "transparent", border: "none", color: colors.text, cursor: "pointer" }}>
            <Menu size={24} />
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: colors.text }}>SERVIQ <span style={{ color: colors.primary }}>AI</span></h1>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <LanguageToggle />
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 16, borderLeft: `1px solid ${colors.border}` }}>
            <div style={{ textAlign: "right" }} className="desktop-only">
              <div style={{ fontSize: 14, fontWeight: 600 }}>Emir</div>
              <div style={{ fontSize: 12, color: colors.muted }}>Admin</div>
            </div>
            <button style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex" }}>
              <LogOut size={20} color={colors.text} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        
        {/* Sidebar: Work Orders List */}
        <aside className={`work-list ${showList ? 'is-open' : ''}`} style={{ width: 280, background: "#ffffff", borderRight: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", zIndex: 5 }}>
          
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 0", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "0 16px 8px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t("serviq.workOrders")}
              </h2>
              <Button variant="ghost" onClick={() => setShowCreate(true)} style={{ padding: 4 }}>
                <Plus size={16} color={colors.muted} />
              </Button>
            </div>

            {loading ? (
              <p style={{ textAlign: "center", color: colors.muted, fontSize: 13, padding: 20 }}>{t("serviq.loadingWorkOrders")}</p>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <p style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>{t("serviq.noWorkOrders")}</p>
                <Button onClick={() => setShowCreate(true)} variant="primary" style={{ width: "100%" }}>{t("serviq.createWorkOrder")}</Button>
              </div>
            ) : (
              <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {orders.map((order) => {
                  const isActive = selected?.id === order.id;
                  return (
                    <button
                      key={order.id}
                      onClick={() => { setSelectedId(order.id); setShowList(false); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        textAlign: "left",
                        padding: "12px 16px",
                        margin: "0 12px",
                        background: isActive ? "#eff6ff" : "transparent",
                        color: isActive ? colors.primary : colors.muted,
                        borderRadius: 8,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        border: "none",
                        fontWeight: isActive ? 600 : 500,
                      }}
                    >
                      <Briefcase size={20} color={isActive ? colors.primary : colors.muted} />
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontSize: 14, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", color: isActive ? colors.primary : colors.text }}>
                          {order.customer.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1, overflowY: "auto", padding: "32px", display: "flex", flexDirection: "column" }} className="main-content">
          {notice && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "12px 16px", borderRadius: 8, marginBottom: 24, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <CheckCircle size={18} /> {notice}
            </div>
          )}
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "12px 16px", borderRadius: 8, marginBottom: 24, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {!selected ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, color: colors.muted }}>
              <LayoutDashboard size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 16, fontWeight: 500 }}>Select a work order from the sidebar</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 24, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                <div>
                  <h2 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 700, color: colors.text, letterSpacing: "-0.01em" }}>{selected.title}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 14, color: colors.muted, fontWeight: 500 }}>{selected.order_no}</span>
                    <StatusPill status={selected.status} t={t} />
                  </div>
                </div>
                
                {/* Desktop Actions */}
                <div className="desktop-actions" style={{ display: "flex", gap: 12 }}>
                  {selected.status === "OPEN" && (
                    <Button onClick={beginVisit} disabled={Boolean(busy)} variant="primary">
                      <Play size={16} /> {t("serviq.startVisit")}
                    </Button>
                  )}
                  {selected.status === "IN_PROGRESS" && (
                    <>
                      <Button onClick={endVisit} disabled={Boolean(busy)} variant="outline">
                        <Clock size={16} /> {t("serviq.endVisit")}
                      </Button>
                      <Button onClick={completeSelected} disabled={Boolean(busy)} variant="primary">
                        <CheckSquare size={16} /> {t("serviq.complete")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Clean Tabs */}
              <nav className="enterprise-tabs" style={{ display: "flex", gap: 32, borderBottom: `1px solid ${colors.border}` }}>
                {(["details", "materials", "time", "sign", "payment", "assistant"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "0 0 16px 0",
                      background: "transparent",
                      border: "none",
                      borderBottom: `2px solid ${activeTab === tab ? colors.primary : "transparent"}`,
                      color: activeTab === tab ? colors.primary : colors.muted,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {tabLabels[tab].icon}
                    {t(tabLabels[tab].label)}
                  </button>
                ))}
              </nav>

              {/* Tab Content */}
              <div style={{ paddingTop: 8 }}>
                {activeTab === "details" && <WorkOrderDetail selected={selected} onViewReport={viewReport} onDownloadPdf={downloadPdf} onEmailReport={emailReport} busy={Boolean(busy)} t={t} localeName={localeName} />}
                {activeTab === "materials" && <MaterialUsageTable materials={selected.materials} material={material} setMaterial={setMaterial} canMutate={Boolean(canMutate)} busy={Boolean(busy)} onSubmit={submitMaterial} t={t} />}
                {activeTab === "time" && <TimeTrackingForm timeEntries={selected.time_entries} timeEntry={timeEntry} setTimeEntry={setTimeEntry} canMutate={Boolean(canMutate)} busy={Boolean(busy)} onSubmit={submitTime} t={t} localeName={localeName} />}
                {activeTab === "sign" && (
                  <Card>
                    <form onSubmit={submitSignature}>
                      <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>{t("serviq.signature")}</h3>
                      <div style={{ display: "grid", gap: 16 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <Field label={t("serviq.signerName")}>
                            <TextInput required value={signature.signer_name} onChange={(e) => setSignature(v => ({...v, signer_name: e.target.value}))} />
                          </Field>
                          <Field label="Signer Type">
                            <SelectInput value={signature.signer_type} onChange={(e) => setSignature(v => ({...v, signer_type: e.target.value as any}))}>
                              <option value="CUSTOMER">{t("serviq.customer")}</option>
                              <option value="TECHNICIAN">{t("serviq.technician")}</option>
                            </SelectInput>
                          </Field>
                        </div>
                        <SignatureCanvas value={signature.image_data_url} onChange={(v) => setSignature(s => ({...s, image_data_url: v}))} clearLabel={t("serviq.clearSignature")} />
                      </div>
                      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                        <Button disabled={!canMutate || Boolean(busy)} variant="primary">{t("serviq.saveSignature")}</Button>
                      </div>
                    </form>
                  </Card>
                )}
                {activeTab === "payment" && <PaymentModal payment={payment} setPayment={setPayment} canMutate={Boolean(canMutate)} busy={Boolean(busy)} onSubmit={submitPayment} t={t} />}
                {activeTab === "assistant" && <AssistantTab summary={assistantSummary} busy={Boolean(busy)} onRefresh={loadAssistantSummary} t={t} />}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Sticky Actions */}
      {selected && canMutate && (
        <div className="mobile-only mobile-actions" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", padding: "16px", borderTop: `1px solid ${colors.border}`, display: "flex", gap: 12, zIndex: 20, boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
          {selected.status === "OPEN" && (
            <Button onClick={beginVisit} disabled={Boolean(busy)} variant="primary" style={{ width: "100%" }}>
              <Play size={18} /> {t("serviq.startVisit")}
            </Button>
          )}
          {selected.status === "IN_PROGRESS" && (
            <>
              <Button onClick={endVisit} disabled={Boolean(busy)} variant="outline" style={{ flex: 1 }}>
                <Clock size={18} />
              </Button>
              <Button onClick={completeSelected} disabled={Boolean(busy)} variant="primary" style={{ flex: 2 }}>
                <CheckSquare size={18} /> {t("serviq.complete")}
              </Button>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .mobile-only {
          display: none !important;
        }
        @media (max-width: 820px) {
          .work-list {
            position: absolute;
            left: -100%;
            top: 65px;
            bottom: 0;
            transition: left 0.3s;
          }
          .work-list.is-open {
            left: 0;
            box-shadow: 4px 0 12px rgba(0,0,0,0.1);
          }
          .mobile-only {
            display: inline-flex !important;
          }
          .mobile-actions {
            display: flex !important;
          }
          .desktop-actions {
            display: none !important;
          }
          .desktop-only {
            display: none !important;
          }
          .main-content {
            padding: 16px 16px 80px 16px !important;
          }
          .enterprise-tabs {
            gap: 16px !important;
            overflow-x: auto;
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
}
