"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listServiqWorkOrders,
  type ServiqWorkOrder,
  type ServiqWorkOrderStatus,
} from "@/lib/api";
import { Badge, Button, Card, Field, SelectInput, TextInput } from "@/components/ui";

type ViewMode = "backoffice" | "technician";

const STORAGE = {
  apiKey: "openops_api_key",
  orgId: "openops_org_id",
  selectedOrder: "openops_serviq_selected_order",
  technicianId: "openops_serviq_technician_id",
  viewMode: "openops_serviq_dashboard_view_mode",
};

const STATUS_COLOR: Record<ServiqWorkOrderStatus, string> = {
  OPEN: "#2563eb",
  IN_PROGRESS: "#f97316",
  COMPLETED: "#16a34a",
  CANCELLED: "#7c7c7c",
};

function localDayKey(value: Date) {
  return value.toLocaleDateString("en-CA");
}

function parseEventDate(order: ServiqWorkOrder) {
  return new Date(order.scheduled_for ?? order.created_at);
}

function mondayStart(date: Date) {
  const copy = new Date(date);
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function dayNumber(date: Date) {
  return date.getDate();
}

function dateTimeLabel(value: Date) {
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeStatus(status: string): ServiqWorkOrderStatus {
  return (["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)
    ? status
    : "OPEN") as ServiqWorkOrderStatus;
}

function statusBadge(status: string) {
  const normalized = safeStatus(status);
  return <Badge color={STATUS_COLOR[normalized]}>{normalized.replace("_", " ")}</Badge>;
}

export default function ServiqDashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ServiqWorkOrder[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState({ orgId: "", apiKey: "" });
  const [viewMode, setViewMode] = useState<ViewMode>("backoffice");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => localDayKey(new Date()));
  const [anchorDate, setAnchorDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    const orgId = localStorage.getItem(STORAGE.orgId) ?? "";
    const apiKey = localStorage.getItem(STORAGE.apiKey) ?? "";
    const savedViewMode = localStorage.getItem(STORAGE.viewMode) as ViewMode | null;
    const savedTechnician = localStorage.getItem(STORAGE.technicianId) ?? "";
    if (savedViewMode === "technician") setViewMode("technician");
    if (savedTechnician) setSelectedTechnicianId(savedTechnician);
    setAuth({ orgId, apiKey });
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const data = await listServiqWorkOrders();
      setOrders(data);
      const fallbackTech = data.find((order) => order.technician)?.technician?.id ?? "";
      if (!selectedTechnicianId && fallbackTech) {
        setSelectedTechnicianId(fallbackTech);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load SERVIQ work orders.");
    } finally {
      setBusy(false);
    }
  }

  const technicians = useMemo(() => {
    const map = new Map<string, string>();
    for (const order of orders) {
      if (order.technician) map.set(order.technician.id, order.technician.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [orders]);

  useEffect(() => {
    if (!selectedTechnicianId && technicians[0]) {
      setSelectedTechnicianId(technicians[0].id);
    }
  }, [selectedTechnicianId, technicians]);

  const filteredOrders = useMemo(() => {
    let items = orders;
    if (viewMode === "technician" && selectedTechnicianId) {
      items = items.filter((order) => order.technician?.id === selectedTechnicianId);
    }
    return items;
  }, [orders, selectedTechnicianId, viewMode]);

  const calendarEvents = useMemo(() => {
    return filteredOrders
      .map((order) => {
        const when = parseEventDate(order);
        return {
          order,
          when,
          dayKey: localDayKey(when),
        };
      })
      .sort((a, b) => a.when.getTime() - b.when.getTime());
  }, [filteredOrders]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof calendarEvents>();
    for (const event of calendarEvents) {
      const current = map.get(event.dayKey) ?? [];
      current.push(event);
      map.set(event.dayKey, current);
    }
    return map;
  }, [calendarEvents]);

  const selectedEvents = eventsByDay.get(selectedDate) ?? [];
  const selectedDay = new Date(`${selectedDate}T00:00:00`);
  const monthWeeks = useMemo(() => {
    const start = mondayStart(anchorDate);
    const weeks: Date[][] = [];
    let cursor = new Date(start);
    for (let week = 0; week < 6; week += 1) {
      const row: Date[] = [];
      for (let day = 0; day < 7; day += 1) {
        row.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(row);
    }
    return weeks;
  }, [anchorDate]);

  function setMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(STORAGE.viewMode, mode);
  }

  function saveConnection() {
    localStorage.setItem(STORAGE.orgId, auth.orgId);
    if (auth.apiKey) localStorage.setItem(STORAGE.apiKey, auth.apiKey);
    else localStorage.removeItem(STORAGE.apiKey);
    refresh();
  }

  function setTechnician(id: string) {
    setSelectedTechnicianId(id);
    localStorage.setItem(STORAGE.technicianId, id);
  }

  function openWorkOrder(id: string) {
    localStorage.setItem(STORAGE.selectedOrder, id);
    router.push("/serviq");
  }

  function goToToday() {
    const today = new Date();
    setAnchorDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(localDayKey(today));
  }

  function openConnectionPanel() {
    const panel = document.getElementById("connection-panel");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main style={{ padding: 16, maxWidth: 1400, margin: "0 auto", background: "#fafafa", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <a href="/serviq" style={{ color: "#666", fontSize: 14 }}>Back to SERVIQ</a>
          <h1 style={{ margin: "8px 0 4px", fontSize: 28, color: "#111" }}>SERVIQ Dashboard</h1>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
            Back office and technician calendar view
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={() => setMode("backoffice")}>Back office</Button>
          <Button variant="secondary" onClick={() => setMode("technician")}>Technician</Button>
          <Button variant="secondary" onClick={refresh} disabled={busy}>Refresh</Button>
        </div>
      </div>

      <Card
        id="connection-panel"
        style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 14 }}
      >
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

      <Card style={{ display: "grid", gap: 12, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={() => setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 1))}>Prev</Button>
            <Button variant="secondary" onClick={goToToday}>Today</Button>
            <Button variant="secondary" onClick={() => setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1))}>Next</Button>
          </div>
          <h2 style={{ margin: 0, fontSize: 18 }}>{monthLabel(anchorDate)}</h2>
        </div>

        <div className="calendar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <div key={label} style={{ color: "#888", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8 }}>
              {label}
            </div>
          ))}
          {monthWeeks.flatMap((week) =>
            week.map((day) => {
              const key = localDayKey(day);
              const events = eventsByDay.get(key) ?? [];
              const inMonth = day.getMonth() === anchorDate.getMonth();
              const isSelected = key === selectedDate;
              const isToday = key === localDayKey(new Date());
              return (
                <button
                  key={key + day.toISOString()}
                  onClick={() => setSelectedDate(key)}
                  style={{
                    textAlign: "left",
                    border: `1px solid ${isSelected ? "#111" : "#e8e8e8"}`,
                    borderRadius: 8,
                    minHeight: 118,
                    padding: 10,
                    background: isSelected ? "#fff" : inMonth ? "#fff" : "#fcfcfc",
                    opacity: inMonth ? 1 : 0.55,
                    cursor: "pointer",
                    outline: isToday ? "1px solid #2563eb" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong style={{ fontSize: 14, color: "#111" }}>{dayNumber(day)}</strong>
                    {isToday && <Badge color="#2563eb">Today</Badge>}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {events.slice(0, 3).map((event) => (
                      <div key={event.order.id} style={{ borderLeft: `3px solid ${STATUS_COLOR[safeStatus(event.order.status)]}`, paddingLeft: 8 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#222" }}>{event.order.order_no}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#666" }}>{event.order.title}</p>
                      </div>
                    ))}
                    {events.length > 3 && (
                      <p style={{ margin: 0, color: "#666", fontSize: 11 }}>+{events.length - 3} more</p>
                    )}
                  </div>
                </button>
              );
            }),
          )}
        </div>
      </Card>

      <div className="dashboard-panels" style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 16, marginTop: 16 }}>
        <Card style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Tabs</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <Button variant="secondary" onClick={() => router.push("/serviq")} style={{ justifyContent: "flex-start" }}>
              Workorder
            </Button>
            <Button style={{ justifyContent: "flex-start", background: "#2563eb" }}>
              Dashboard
            </Button>
            <Button variant="secondary" onClick={openConnectionPanel} style={{ justifyContent: "flex-start" }}>
              Connection
            </Button>
          </div>
          <h3 style={{ margin: 0, fontSize: 16 }}>Filters</h3>
          <Field label="View mode">
            <SelectInput value={viewMode} onChange={(e) => setMode(e.target.value as ViewMode)}>
              <option value="backoffice">Back office</option>
              <option value="technician">Technician</option>
            </SelectInput>
          </Field>
          <Field label="Technician">
            <SelectInput
              value={selectedTechnicianId}
              onChange={(e) => setTechnician(e.target.value)}
              disabled={viewMode === "backoffice" && technicians.length === 0}
            >
              <option value="">All technicians</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>{tech.name}</option>
              ))}
            </SelectInput>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <MiniStat label="Open" value={filteredOrders.filter((order) => order.status === "OPEN").length} />
            <MiniStat label="Active" value={filteredOrders.filter((order) => order.status === "IN_PROGRESS").length} />
            <MiniStat label="Done" value={filteredOrders.filter((order) => order.status === "COMPLETED").length} />
          </div>
          <Card style={{ background: "#fbfbfb" }}>
            <p style={{ margin: 0, color: "#666", fontSize: 13 }}>
              {viewMode === "backoffice"
                ? "Back office calendar shows all assigned and unassigned work orders."
                : "Technician view shows the selected technician's schedule for the month."}
            </p>
          </Card>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={() => router.push("/serviq")}>Open work orders</Button>
            <Button variant="secondary" onClick={() => router.push("/")}>Home</Button>
          </div>
        </Card>

        <Card style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>Day agenda</h3>
              <p style={{ margin: "4px 0 0", color: "#777", fontSize: 13 }}>{selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            </div>
            <Badge color="#111">{selectedEvents.length} items</Badge>
          </div>

          {error && <p style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>{error}</p>}

          {!selectedEvents.length ? (
            <Card style={{ color: "#777", fontSize: 14 }}>
              No scheduled work on this day.
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {selectedEvents.map((event) => (
                <button
                  key={event.order.id}
                  onClick={() => openWorkOrder(event.order.id)}
                  style={{
                    textAlign: "left",
                    border: "1px solid #e8e8e8",
                    borderRadius: 8,
                    padding: 14,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <strong style={{ fontSize: 14, color: "#111" }}>{event.order.order_no}</strong>
                    {statusBadge(event.order.status)}
                  </div>
                  <p style={{ margin: "6px 0 0", color: "#222", fontSize: 14, fontWeight: 600 }}>{event.order.title}</p>
                  <p style={{ margin: "3px 0 0", color: "#666", fontSize: 12 }}>
                    {event.order.customer.name} · {event.order.technician?.name ?? "Unassigned"} · {dateTimeLabel(event.when)}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Selected event snapshot</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {selectedEvents.slice(0, 1).map((event) => (
                <Card key={event.order.id} style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{event.order.order_no}</p>
                      <p style={{ margin: "3px 0 0", color: "#666", fontSize: 13 }}>{event.order.title}</p>
                    </div>
                    {statusBadge(event.order.status)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                    <MiniStat label="Customer" valueText={event.order.customer.name} />
                    <MiniStat label="Technician" valueText={event.order.technician?.name ?? "Unassigned"} />
                    <MiniStat label="Schedule" valueText={dateTimeLabel(event.when)} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <style jsx>{`
        @media (max-width: 920px) {
          .dashboard-panels {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 720px) {
          .calendar-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </main>
  );
}

function MiniStat({ label, value, valueText }: { label: string; value?: number; valueText?: string }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, background: "#fff" }}>
      <p style={{ margin: 0, color: "#888", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "6px 0 0", color: "#111", fontSize: 16, fontWeight: 700 }}>
        {typeof value === "number" ? value : valueText}
      </p>
    </div>
  );
}
