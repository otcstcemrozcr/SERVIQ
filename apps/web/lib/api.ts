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

export async function listServiqWorkOrders(): Promise<ServiqWorkOrder[]> {
  return apiFetch<ServiqWorkOrder[]>("/serviq/work-orders", {
    headers: serviqHeaders(),
  });
}

export async function createServiqWorkOrder(
  body: ServiqWorkOrderCreate,
): Promise<ServiqWorkOrder> {
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
  return apiFetch<ServiqWorkOrder>(`/serviq/work-orders/${id}`, {
    method: "PUT",
    headers: serviqHeaders(),
    body: JSON.stringify(body),
  });
}

export async function startServiqWorkOrder(workOrderId: string): Promise<ServiqWorkOrder> {
  return apiFetch<ServiqWorkOrder>(`/serviq/work-orders/${workOrderId}/start`, {
    method: "POST",
    headers: serviqHeaders(),
  });
}

export async function addServiqMaterial(
  workOrderId: string,
  body: ServiqMaterialCreate,
): Promise<ServiqWorkOrder> {
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
  return apiFetch<ServiqWorkOrder>(`/serviq/work-orders/${workOrderId}/signatures`, {
    method: "POST",
    headers: serviqHeaders(),
    body: JSON.stringify(body),
  });
}

export async function recordServiqPayment(
  body: ServiqPaymentCreate,
): Promise<{ payment_id: string; provider: Record<string, unknown> }> {
  return apiFetch<{ payment_id: string; provider: Record<string, unknown> }>("/serviq/payment", {
    method: "POST",
    headers: serviqHeaders(),
    body: JSON.stringify(body),
  });
}

export async function completeServiqWorkOrder(
  workOrderId: string,
): Promise<ServiqCompletionResult> {
  return apiFetch<ServiqCompletionResult>(`/serviq/work-orders/${workOrderId}/complete`, {
    method: "POST",
    headers: serviqHeaders(),
  });
}

export async function getServiqReport(workOrderId: string): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>(`/serviq/work-orders/${workOrderId}/report`, {
    headers: serviqHeaders(),
  });
}

export async function downloadServiqReportPdf(workOrderId: string): Promise<Blob> {
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
  return apiFetch<Record<string, unknown>>("/serviq/email", {
    method: "POST",
    headers: serviqHeaders(),
    body: JSON.stringify({ work_order_id: workOrderId, to_email: toEmail }),
  });
}

export async function getServiqAssistantSummary(
  workOrderId: string,
): Promise<ServiqAssistantSummary> {
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
  return apiFetch<{ success: boolean; message: string }>("/serviq/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function verifyOtp(email: string, code: string): Promise<{ success: boolean; api_key: string; message: string }> {
  return apiFetch<{ success: boolean; api_key: string; message: string }>("/serviq/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
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
  return apiFetch<ErpSyncResult>("/serviq/erp/sync", {
    method: "POST",
    headers: serviqHeaders(),
  });
}

