import { enqueueRequest, getQueue, clearQueue, OfflineQueuedError } from "./offlineQueue";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const isRead = !init?.method || init.method.toUpperCase() === "GET";
  
  if (typeof navigator !== "undefined" && !navigator.onLine && !isRead) {
    enqueueRequest(path, init || {});
    throw new OfflineQueuedError("No internet connection. Request queued offline.");
  }

  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path} ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function flushOfflineQueue(): Promise<void> {
  const queue = getQueue();
  if (queue.length === 0) return;

  // Optimistically clear the queue
  clearQueue();

  for (const req of queue) {
    try {
      await fetch(`${API_URL}${req.path}`, req.init);
    } catch (e) {
      console.error("Failed to sync offline request", req, e);
      // Re-enqueue failed request
      enqueueRequest(req.path, req.init);
    }
  }
}

export interface UploadResult {
  upload_id: string;
  file_name: string;
  tables: string[];
  columns_by_table: Record<string, string[]>;
}

export interface SuggestResult {
  upload_id: string;
  table_name: string;
  columns: string[];
  suggested_mapping: Record<string, string>;
}

export interface Finding {
  code: string;
  title: string;
  metric: string;
  value: number;
  confidence: number;
  detail: Record<string, string>;
}

export interface MonthlyRevenue {
  period: string;
  revenue: number;
  order_count: number;
  currency: string | null;
}

export interface AnalyzeResult {
  upload_id: string;
  module: string;
  findings: Finding[];
  monthly_revenue: MonthlyRevenue[];
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<UploadResult>("/upload", { method: "POST", body: form });
}

export async function suggestMapping(upload_id: string, table_name: string): Promise<SuggestResult> {
  return apiFetch<SuggestResult>("/mapping/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_id, table_name }),
  });
}

export async function runAnalysis(
  upload_id: string,
  table_name: string,
  mapping: Record<string, string>,
): Promise<AnalyzeResult> {
  return apiFetch<AnalyzeResult>("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_id, table_name, mapping, module: "sales" }),
  });
}

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------

export type Priority = "high" | "medium" | "low";
export type Effort = "days" | "weeks" | "months";

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  estimated_effort: Effort;
  depends_on: string[];
  findings_linked: string[];
  suggested_checks: string[];
}

export interface RoadmapResult {
  upload_id: string;
  erp_source: string;
  summary: string;
  steps: RoadmapStep[];
}

export async function generateRoadmap(upload_id: string): Promise<RoadmapResult> {
  return apiFetch<RoadmapResult>("/roadmap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_id }),
  });
}

// ---------------------------------------------------------------------------
// SERVIQ
// ---------------------------------------------------------------------------

export type ServiqWorkOrderStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ServiqMaterialStatus = "USED" | "RETURNED";
export type ServiqPaymentMethod = "CURRENT_ACCOUNT" | "CASH" | "CREDIT_CARD" | "VIRTUAL_POS";
export type ServiqPaymentStatus =
  | "PAID"
  | "PAYMENT_PENDING"
  | "CURRENT_ACCOUNT"
  | "UNPAID"
  | "FAILED";

export interface ServiqCustomer {
  id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_current_account: boolean;
  external_erp_id: string | null;
}

export interface ServiqEquipment {
  id: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  warranty_status: string | null;
  external_erp_id: string | null;
}

export interface ServiqTechnician {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  external_erp_id: string | null;
}

export interface ServiqMaterial {
  id: string;
  product_id: string | null;
  material_code: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: ServiqMaterialStatus;
  warehouse_location: string | null;
  serial_number: string | null;
  batch_number: string | null;
}

export interface ServiqTimeEntry {
  id: string;
  arrival_time: string | null;
  departure_time: string | null;
  labor_hours: number | null;
  travel_hours: number | null;
  waiting_hours: number | null;
  technician_comment: string | null;
}

export interface ServiqSignature {
  id: string;
  signer_type: "CUSTOMER" | "TECHNICIAN";
  signer_name: string;
  image_data_url: string | null;
  image_url: string | null;
}

export interface ServiqPayment {
  id: string;
  work_order_id: string;
  method: ServiqPaymentMethod;
  status: ServiqPaymentStatus;
  amount: number | null;
  currency: string;
  transaction_id: string | null;
  provider: string | null;
  provider_payload: Record<string, unknown> | null;
}

export interface ServiqWorkOrder {
  id: string;
  order_no: string;
  title: string;
  status: ServiqWorkOrderStatus;
  priority: string | null;
  scheduled_for: string | null;
  visit_notes: string | null;
  technician_comment: string | null;
  external_erp_id: string | null;
  erp_sync_status: string;
  customer: ServiqCustomer;
  equipment: ServiqEquipment | null;
  technician: ServiqTechnician | null;
  materials: ServiqMaterial[];
  time_entries: ServiqTimeEntry[];
  signatures: ServiqSignature[];
  payments: ServiqPayment[];
  created_at: string;
  updated_at: string;
}

export interface ServiqWorkOrderCreate {
  order_no: string;
  title: string;
  priority?: string | null;
  scheduled_for?: string | null;
  visit_notes?: string | null;
  customer: {
    name: string;
    code?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    is_current_account?: boolean;
  };
  equipment?: {
    name: string;
    model?: string | null;
    serial_number?: string | null;
    warranty_status?: string | null;
  } | null;
  technician?: {
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
}

export interface ServiqMaterialCreate {
  material_code: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: ServiqMaterialStatus;
  warehouse_location?: string | null;
}

export interface ServiqTimeTrackingCreate {
  arrival_time?: string | null;
  departure_time?: string | null;
  labor_hours?: number | null;
  travel_hours?: number | null;
  waiting_hours?: number | null;
  technician_comment?: string | null;
}

export interface ServiqSignatureCreate {
  signer_type: "CUSTOMER" | "TECHNICIAN";
  signer_name: string;
  image_data_url?: string | null;
  image_url?: string | null;
}

export interface ServiqPaymentCreate {
  work_order_id: string;
  method: ServiqPaymentMethod;
  status: ServiqPaymentStatus;
  amount?: number | null;
  currency?: string;
  provider?: string | null;
  transaction_id?: string | null;
}

export interface ServiqCompletionResult {
  work_order: ServiqWorkOrder;
  report: Record<string, unknown>;
}

export interface ServiqAssistantSummary {
  summary: string;
  next_actions: string[];
  missing: string[];
  totals: {
    materials_count: number;
    labor_hours: number;
    travel_hours: number;
    waiting_hours: number;
  };
  customer_email_draft: string;
  erp_notification_text: string;
}

function serviqHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("serviq_api_key");
    const bearer = localStorage.getItem("serviq_access_token");
    const orgId = localStorage.getItem("serviq_org_id");

    if (apiKey) headers["X-API-Key"] = apiKey;
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    if (orgId) headers["X-Org-ID"] = orgId;
  }

  return headers;
}

const DEMO_ORDERS_KEY = "serviq_demo_orders";

const INITIAL_DEMO_ORDERS: ServiqWorkOrder[] = [
  {
    id: "demo-order-1",
    order_no: "WO-1002",
    title: "AC-1002 Klima Ünitesi Soğutma Arızası",
    status: "OPEN",
    priority: "HIGH",
    scheduled_for: new Date().toISOString().split('T')[0] + "T10:00:00Z",
    visit_notes: "Klima soğuk üflemiyor, dış üniteden anormal sesler geliyor. Lütfen kompresör ve gaz kaçağı kontrollerini yapın.",
    technician_comment: null,
    external_erp_id: "ERP-WO-8871",
    erp_sync_status: "PENDING",
    customer: {
      id: "cust-1",
      name: "Ahmet Yılmaz (Yılmaz Market)",
      code: "CUST-001",
      email: "ahmet@yilmazmarket.com",
      phone: "0555 123 45 67",
      address: "Kadıköy, İstanbul",
      is_current_account: true,
      external_erp_id: "ERP-CUST-001"
    },
    equipment: {
      id: "eq-1",
      name: "Arçelik Ekstra Klima",
      model: "A++ 12000 BTU",
      serial_number: "ARC-982312-X",
      warranty_status: "ACTIVE",
      external_erp_id: "ERP-EQ-991"
    },
    technician: {
      id: "tech-1",
      name: "Emir Özçelik",
      email: "emir@serviq.app",
      phone: "0532 987 65 43",
      external_erp_id: "ERP-TECH-001"
    },
    materials: [],
    time_entries: [],
    signatures: [],
    payments: [],
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "demo-order-2",
    order_no: "WO-1003",
    title: "ELK-504 Panoda Kısa Devre ve Sigorta Atması",
    status: "IN_PROGRESS",
    priority: "CRITICAL",
    scheduled_for: new Date().toISOString().split('T')[0] + "T14:30:00Z",
    visit_notes: "Ana sigorta sürekli atıyor, bazı prizlerde elektrik yok. Acil müdahale gerekiyor.",
    technician_comment: "Sahaya ulaşıldı, arıza tespiti yapılıyor.",
    external_erp_id: "ERP-WO-8872",
    erp_sync_status: "PENDING",
    customer: {
      id: "cust-2",
      name: "Zeynep Kaya (Kaya Eczanesi)",
      code: "CUST-002",
      email: "zeynep@kayaeczane.com",
      phone: "0542 987 12 34",
      address: "Beşiktaş, İstanbul",
      is_current_account: false,
      external_erp_id: "ERP-CUST-002"
    },
    equipment: {
      id: "eq-2",
      name: "Schneider Elektrik Panosu",
      model: "Easy9 24W",
      serial_number: "SCH-7712-A",
      warranty_status: "EXPIRED",
      external_erp_id: "ERP-EQ-992"
    },
    technician: {
      id: "tech-1",
      name: "Emir Özçelik",
      email: "emir@serviq.app",
      phone: "0532 987 65 43",
      external_erp_id: "ERP-TECH-001"
    },
    materials: [
      { id: "mat-1", product_id: null, material_code: "C16-FUSE", material_name: "16A Otomatik Sigorta", quantity: 2, unit: "Adet", status: "USED", warehouse_location: "Koridor 3", serial_number: "SN-98213", batch_number: "B-441" }
    ],
    time_entries: [
      { id: "time-1", arrival_time: new Date(Date.now() - 3600000).toISOString().slice(0, 16), departure_time: null, labor_hours: null, travel_hours: 0.5, waiting_hours: 0.1, technician_comment: "Sahaya ulaşıldı, arıza tespiti yapılıyor." }
    ],
    signatures: [],
    payments: [],
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "demo-order-3",
    order_no: "WO-1001",
    title: "HYD-809 Su Kaçağı ve Tesisat Onarımı",
    status: "COMPLETED",
    priority: "MEDIUM",
    scheduled_for: new Date(Date.now() - 86400000).toISOString().split('T')[0] + "T09:00:00Z",
    visit_notes: "2. kattaki tuvalet bataryasında sızıntı var, su saati sürekli dönüyor.",
    technician_comment: "Eski vanalar söküldü, yenileriyle değiştirildi. Kaçak giderildi.",
    external_erp_id: "ERP-WO-8870",
    erp_sync_status: "SYNCHRONIZED",
    customer: {
      id: "cust-3",
      name: "Mehmet Demir (Demir Plaza)",
      code: "CUST-003",
      email: "contact@demirplaza.com",
      phone: "0212 555 44 33",
      address: "Şişli, İstanbul",
      is_current_account: true,
      external_erp_id: "ERP-CUST-003"
    },
    equipment: {
      id: "eq-3",
      name: "Vitra Sıhhi Tesisat Sistemleri",
      model: "V-Pro 110",
      serial_number: "VIT-00912",
      warranty_status: "ACTIVE",
      external_erp_id: "ERP-EQ-993"
    },
    technician: {
      id: "tech-2",
      name: "Kaan Yılmaz",
      email: "kaan@serviq.app",
      phone: "0544 111 22 33",
      external_erp_id: "ERP-TECH-002"
    },
    materials: [
      { id: "mat-2", product_id: null, material_code: "VALVE-12", material_name: "1/2 Küresel Vana", quantity: 1, unit: "Adet", status: "USED", warehouse_location: "Koridor 1", serial_number: null, batch_number: null },
      { id: "mat-3", product_id: null, material_code: "FLEX-PIPE", material_name: "Fleks hortum 50cm", quantity: 2, unit: "Adet", status: "USED", warehouse_location: "Koridor 2", serial_number: null, batch_number: null }
    ],
    time_entries: [
      { id: "time-2", arrival_time: new Date(Date.now() - 90000000).toISOString().slice(0, 16), departure_time: new Date(Date.now() - 85000000).toISOString().slice(0, 16), labor_hours: 1.5, travel_hours: 0.4, waiting_hours: 0, technician_comment: "Eski vanalar söküldü, yenileriyle değiştirildi. Kaçak giderildi." }
    ],
    signatures: [
      { id: "sig-1", signer_type: "CUSTOMER", signer_name: "Ahmet Usta (Bina Görevlisi)", image_data_url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='50'><path d='M10,25 Q30,10 50,25 T90,25' fill='none' stroke='black' stroke-width='2'/></svg>", image_url: null }
    ],
    payments: [
      { id: "pay-1", work_order_id: "demo-order-3", method: "CURRENT_ACCOUNT", status: "CURRENT_ACCOUNT", amount: 1500, currency: "TRY", transaction_id: "TX-90182", provider: "DEMO", provider_payload: {} }
    ],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

export function getLocalDemoOrders(): ServiqWorkOrder[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(DEMO_ORDERS_KEY);
  if (!stored) {
    localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(INITIAL_DEMO_ORDERS));
    return INITIAL_DEMO_ORDERS;
  }
  try {
    return JSON.parse(stored) as ServiqWorkOrder[];
  } catch {
    return INITIAL_DEMO_ORDERS;
  }
}

export function saveLocalDemoOrders(orders: ServiqWorkOrder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(orders));
}

function isDemoMode() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("serviq_api_key") === "demo_mode_api_key";
}

export async function listServiqWorkOrders(): Promise<ServiqWorkOrder[]> {
  if (isDemoMode()) {
    return getLocalDemoOrders();
  }
  try {
    return await apiFetch<ServiqWorkOrder[]>("/serviq/work-orders", {
      headers: serviqHeaders(),
    });
  } catch (e) {
    console.error("API error, using local fallback", e);
    return getLocalDemoOrders();
  }
}

export async function createServiqWorkOrder(
  body: ServiqWorkOrderCreate,
): Promise<ServiqWorkOrder> {
  if (isDemoMode()) {
    const orders = getLocalDemoOrders();
    const newOrder: ServiqWorkOrder = {
      id: "demo-order-" + Math.random().toString(36).substring(2, 9),
      order_no: body.order_no,
      title: body.title,
      status: "OPEN",
      priority: body.priority || "MEDIUM",
      scheduled_for: body.scheduled_for || new Date().toISOString(),
      visit_notes: body.visit_notes || "",
      technician_comment: null,
      external_erp_id: null,
      erp_sync_status: "PENDING",
      customer: {
        id: "cust-" + Math.random().toString(36).substring(2, 9),
        name: body.customer.name,
        code: body.customer.code || null,
        email: body.customer.email || null,
        phone: body.customer.phone || null,
        address: body.customer.address || null,
        is_current_account: body.customer.is_current_account || false,
        external_erp_id: null
      },
      equipment: body.equipment ? {
        id: "eq-" + Math.random().toString(36).substring(2, 9),
        name: body.equipment.name,
        model: body.equipment.model || null,
        serial_number: body.equipment.serial_number || null,
        warranty_status: body.equipment.warranty_status || null,
        external_erp_id: null
      } : null,
      technician: body.technician ? {
        id: "tech-" + Math.random().toString(36).substring(2, 9),
        name: body.technician.name,
        email: body.technician.email || null,
        phone: body.technician.phone || null,
        external_erp_id: null
      } : null,
      materials: [],
      time_entries: [],
      signatures: [],
      payments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    orders.push(newOrder);
    saveLocalDemoOrders(orders);
    return newOrder;
  }
  return apiFetch<ServiqWorkOrder>("/serviq/work-orders", {
    method: "POST",
    headers: serviqHeaders(),
    body: JSON.stringify(body),
  });
}

export async function updateServiqWorkOrder(
  id: string,
  body: Partial<ServiqWorkOrderCreate>,
): Promise<ServiqWorkOrder> {
  if (isDemoMode() || id.startsWith("demo-order-")) {
    const orders = getLocalDemoOrders();
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      const order = orders[index];
      if (body.title) order.title = body.title;
      if (body.priority !== undefined) order.priority = body.priority;
      if (body.scheduled_for !== undefined) order.scheduled_for = body.scheduled_for;
      if (body.visit_notes !== undefined) order.visit_notes = body.visit_notes;
      if (body.customer) {
        order.customer = { ...order.customer, ...body.customer };
      }
      order.updated_at = new Date().toISOString();
      saveLocalDemoOrders(orders);
      return order;
    }
    throw new Error("Demo order not found");
  }
  return apiFetch<ServiqWorkOrder>(`/serviq/work-orders/${id}`, {
    method: "PUT",
    headers: serviqHeaders(),
    body: JSON.stringify(body),
  });
}

export async function startServiqWorkOrder(workOrderId: string): Promise<ServiqWorkOrder> {
  if (isDemoMode() || workOrderId.startsWith("demo-order-")) {
    const orders = getLocalDemoOrders();
    const index = orders.findIndex(o => o.id === workOrderId);
    if (index !== -1) {
      const order = orders[index];
      order.status = "IN_PROGRESS";
      order.updated_at = new Date().toISOString();
      saveLocalDemoOrders(orders);
      return order;
    }
    throw new Error("Demo order not found");
  }
  return apiFetch<ServiqWorkOrder>(`/serviq/work-orders/${workOrderId}/start`, {
    method: "POST",
    headers: serviqHeaders(),
  });
}

export async function addServiqMaterial(
  workOrderId: string,
  body: ServiqMaterialCreate,
): Promise<ServiqWorkOrder> {
  if (isDemoMode() || workOrderId.startsWith("demo-order-")) {
    const orders = getLocalDemoOrders();
    const index = orders.findIndex(o => o.id === workOrderId);
    if (index !== -1) {
      const order = orders[index];
      const newMaterial: ServiqMaterial = {
        id: "mat-" + Math.random().toString(36).substring(2, 9),
        product_id: null,
        material_code: body.material_code,
        material_name: body.material_name,
        quantity: body.quantity,
        unit: body.unit,
        status: body.status,
        warehouse_location: body.warehouse_location || null,
        serial_number: null,
        batch_number: null
      };
      order.materials.push(newMaterial);
      order.updated_at = new Date().toISOString();
      saveLocalDemoOrders(orders);
      return order;
    }
    throw new Error("Demo order not found");
  }
  return apiFetch<ServiqWorkOrder>(`/serviq/work-orders/${workOrderId}/materials`, {
    method: "POST",
    headers: serviqHeaders(),
    body: JSON.stringify(body),
  });
}

export async function addServiqTimeEntry(
  workOrderId: string,
  body: ServiqTimeTrackingCreate,
): Promise<ServiqWorkOrder> {
  if (isDemoMode() || workOrderId.startsWith("demo-order-")) {
    const orders = getLocalDemoOrders();
    const index = orders.findIndex(o => o.id === workOrderId);
    if (index !== -1) {
      const order = orders[index];
      const newEntry: ServiqTimeEntry = {
        id: "time-" + Math.random().toString(36).substring(2, 9),
        arrival_time: body.arrival_time || null,
        departure_time: body.departure_time || null,
        labor_hours: body.labor_hours || null,
        travel_hours: body.travel_hours || null,
        waiting_hours: body.waiting_hours || null,
        technician_comment: body.technician_comment || null
      };
      order.time_entries.push(newEntry);
      order.updated_at = new Date().toISOString();
      saveLocalDemoOrders(orders);
      return order;
    }
    throw new Error("Demo order not found");
  }
  return apiFetch<ServiqWorkOrder>(`/serviq/work-orders/${workOrderId}/time`, {
    method: "POST",
    headers: serviqHeaders(),
    body: JSON.stringify(body),
  });
}

export async function addServiqSignature(
  workOrderId: string,
  body: ServiqSignatureCreate,
): Promise<ServiqWorkOrder> {
  if (isDemoMode() || workOrderId.startsWith("demo-order-")) {
    const orders = getLocalDemoOrders();
    const index = orders.findIndex(o => o.id === workOrderId);
    if (index !== -1) {
      const order = orders[index];
      const newSignature: ServiqSignature = {
        id: "sig-" + Math.random().toString(36).substring(2, 9),
        signer_type: body.signer_type,
        signer_name: body.signer_name,
        image_data_url: body.image_data_url || null,
        image_url: body.image_url || null
      };
      order.signatures.push(newSignature);
      order.updated_at = new Date().toISOString();
      saveLocalDemoOrders(orders);
      return order;
    }
    throw new Error("Demo order not found");
  }
  return apiFetch<ServiqWorkOrder>(`/serviq/work-orders/${workOrderId}/signatures`, {
    method: "POST",
    headers: serviqHeaders(),
    body: JSON.stringify(body),
  });
}

export async function recordServiqPayment(
  body: ServiqPaymentCreate,
): Promise<{ payment_id: string; provider: Record<string, unknown> }> {
  if (isDemoMode() || body.work_order_id.startsWith("demo-order-")) {
    const orders = getLocalDemoOrders();
    const index = orders.findIndex(o => o.id === body.work_order_id);
    const paymentId = "pay-" + Math.random().toString(36).substring(2, 9);
    if (index !== -1) {
      const order = orders[index];
      const newPayment: ServiqPayment = {
        id: paymentId,
        work_order_id: body.work_order_id,
        method: body.method,
        status: body.status,
        amount: body.amount || null,
        currency: body.currency || "TRY",
        transaction_id: body.transaction_id || null,
        provider: body.provider || "DEMO",
        provider_payload: null
      };
      order.payments.push(newPayment);
      order.updated_at = new Date().toISOString();
      saveLocalDemoOrders(orders);
    }
    return { payment_id: paymentId, provider: {} };
  }
  return apiFetch<{ payment_id: string; provider: Record<string, unknown> }>("/serviq/payment", {
    method: "POST",
    headers: serviqHeaders(),
    body: JSON.stringify(body),
  });
}

export async function completeServiqWorkOrder(
  workOrderId: string,
): Promise<ServiqCompletionResult> {
  if (isDemoMode() || workOrderId.startsWith("demo-order-")) {
    const orders = getLocalDemoOrders();
    const index = orders.findIndex(o => o.id === workOrderId);
    if (index !== -1) {
      const order = orders[index];
      order.status = "COMPLETED";
      order.updated_at = new Date().toISOString();
      saveLocalDemoOrders(orders);
      return {
        work_order: order,
        report: { message: "Report generated successfully" }
      };
    }
    throw new Error("Demo order not found");
  }
  return apiFetch<ServiqCompletionResult>(`/serviq/work-orders/${workOrderId}/complete`, {
    method: "POST",
    headers: serviqHeaders(),
  });
}

export async function getServiqReport(workOrderId: string): Promise<Record<string, unknown>> {
  if (isDemoMode() || workOrderId.startsWith("demo-order-")) {
    return { message: "Mock PDF Report metadata for demo" };
  }
  return apiFetch<Record<string, unknown>>(`/serviq/work-orders/${workOrderId}/report`, {
    headers: serviqHeaders(),
  });
}

export async function downloadServiqReportPdf(workOrderId: string): Promise<Blob> {
  if (isDemoMode() || workOrderId.startsWith("demo-order-")) {
    return new Blob(["%PDF-1.4 ..."], { type: "application/pdf" });
  }
  const res = await fetch(`${API_URL}/serviq/work-orders/${workOrderId}/report.pdf`, {
    headers: serviqHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API /serviq/work-orders/${workOrderId}/report.pdf ${res.status}: ${text}`);
  }
  return res.blob();
}

export async function sendServiqEmail(
  workOrderId: string,
  toEmail: string,
): Promise<Record<string, unknown>> {
  if (isDemoMode() || workOrderId.startsWith("demo-order-")) {
    return { success: true, message: `Email sent to ${toEmail} (Demo simulation)` };
  }
  return apiFetch<Record<string, unknown>>("/serviq/email", {
    method: "POST",
    headers: serviqHeaders(),
    body: JSON.stringify({ work_order_id: workOrderId, to_email: toEmail }),
  });
}

export async function getServiqAssistantSummary(
  workOrderId: string,
): Promise<ServiqAssistantSummary> {
  if (isDemoMode() || workOrderId.startsWith("demo-order-")) {
    const orders = getLocalDemoOrders();
    const order = orders.find(o => o.id === workOrderId);
    const materialsCount = order ? order.materials.length : 0;
    let laborHours = 0;
    let travelHours = 0;
    let waitingHours = 0;
    if (order) {
      for (const entry of order.time_entries) {
        laborHours += entry.labor_hours || 0;
        travelHours += entry.travel_hours || 0;
        waitingHours += entry.waiting_hours || 0;
      }
    }
    return {
      summary: `Demo servis özeti: Müşteri ${order?.customer.name || 'Bilinmiyor'} için ${order?.title || 'işlem'} yürütülüyor.`,
      next_actions: ["Müşteri imzası alınmalı", "Ödeme tamamlanmalı", "İş tamamlandı olarak işaretlenmeli"],
      missing: materialsCount === 0 ? ["Kullanılan malzemeler girilmemiş."] : [],
      totals: {
        materials_count: materialsCount,
        labor_hours: laborHours || 1.5,
        travel_hours: travelHours || 0.4,
        waiting_hours: waitingHours || 0
      },
      customer_email_draft: `Sayın Yetkili, ${order?.order_no} numaralı iş emri kapsamında servis işlemleri tamamlanmıştır. Detaylar ekte yer almaktadır.`,
      erp_notification_text: `ERP SYNC: Work order ${order?.order_no} status: COMPLETED.`
    };
  }
  return apiFetch<ServiqAssistantSummary>("/serviq/ai/service-summary", {
    method: "POST",
    headers: serviqHeaders(),
    body: JSON.stringify({ work_order_id: workOrderId }),
  });
}

export interface ServiqAssistantChatResponse {
  reply: string;
  action_suggested: string | null;
}

export async function sendAssistantChat(
  workOrderId: string,
  message: string,
): Promise<ServiqAssistantChatResponse> {
  if (isDemoMode() || workOrderId.startsWith("demo-order-")) {
    const msg = message.toLowerCase();
    let reply = "Ben ServiQ Yapay Zeka Asistanıyım. Size iş emirleri, malzemeler veya süre takibi konusunda yardımcı olabilirim.";
    let action_suggested: string | null = null;
    
    if (msg.includes("malzeme") || msg.includes("parça")) {
      reply = "İş emrine malzeme eklemek için üst taraftaki 'Malzemeler' sekmesini kullanabilirsiniz. Orada depo konumunu ve miktarını seçebilirsiniz.";
      action_suggested = "show_materials_tab";
    } else if (msg.includes("imza") || msg.includes("onay")) {
      reply = "İş emrini tamamlamak için müşterinin imzasını almanız gerekmektedir. 'İmza' sekmesine geçebilirsiniz.";
      action_suggested = "show_sign_tab";
    } else if (msg.includes("ödeme") || msg.includes("tutar") || msg.includes("para")) {
      reply = "Bu iş emri için ödeme almak isterseniz 'Ödeme' sekmesine tıklayarak Nakit, Kredi Kartı veya Cari Hesap seçeneklerinden birini seçebilirsiniz.";
      action_suggested = "show_payment_tab";
    } else if (msg.includes("tamamla") || msg.includes("bitir")) {
      reply = "İş emrini tamamlamak için tüm gerekli bilgileri girdikten sonra 'Tamamla' butonuna basabilirsiniz.";
      action_suggested = "complete_order";
    }
    
    return { reply, action_suggested };
  }
  return apiFetch<ServiqAssistantChatResponse>("/serviq/ai/chat", {
    method: "POST",
    headers: serviqHeaders(),
    body: JSON.stringify({ work_order_id: workOrderId, message }),
  });
}

// ---------------------------------------------------------------------------
// 2FA / OTP Authentication
// ---------------------------------------------------------------------------

export async function sendOtp(email: string): Promise<{ success: boolean; message: string }> {
  if (email === "demo@serviq.app" || email.includes("demo")) {
    return { success: true, message: "Demo doğrulama kodu gönderildi." };
  }
  try {
    return await apiFetch<{ success: boolean; message: string }>("/serviq/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch (e) {
    console.warn("sendOtp API call failed, falling back to offline/demo simulation:", e);
    return { success: true, message: "Çevrimdışı mod: Demo olarak devam edebilirsiniz." };
  }
}

export async function verifyOtp(email: string, code: string): Promise<{ success: boolean; api_key: string; message: string }> {
  if (email === "demo@serviq.app" || email.includes("demo")) {
    return { success: true, api_key: "demo_mode_api_key", message: "Demo girişi başarılı." };
  }
  try {
    return await apiFetch<{ success: boolean; api_key: string; message: string }>("/serviq/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
  } catch (e) {
    console.warn("verifyOtp API call failed, falling back to offline/demo simulation:", e);
    return { success: true, api_key: "demo_mode_api_key", message: "Çevrimdışı/Demo girişi başarılı." };
  }
}

// ---------------------------------------------------------------------------
// ERP Integration
// ---------------------------------------------------------------------------

export interface ErpSyncResult {
  pushed_to_erp: number;
  pulled_from_erp: number;
  failed: number;
  logs: string[];
}

export async function syncErp(): Promise<ErpSyncResult> {
  if (isDemoMode()) {
    const orders = getLocalDemoOrders();
    let count = 0;
    for (const order of orders) {
      if (order.erp_sync_status === "PENDING") {
        order.erp_sync_status = "SYNCHRONIZED";
        count++;
      }
    }
    if (count > 0) {
      saveLocalDemoOrders(orders);
    }
    return {
      pushed_to_erp: count,
      pulled_from_erp: 0,
      failed: 0,
      logs: [`[INFO] ${count} adet iş emri ERP ile senkronize edildi.`, `[INFO] Senkronizasyon başarıyla tamamlandı.`]
    };
  }
  return apiFetch<ErpSyncResult>("/serviq/erp/sync", {
    method: "POST",
    headers: serviqHeaders(),
  });
}

