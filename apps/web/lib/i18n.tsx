"use client";

/**
 * Lightweight, dependency-free i18n for SERVIQ.
 *
 * - Typed message catalog: `en` is the source of truth for keys; `tr` must
 *   provide every key or TypeScript fails the build (no silent missing strings).
 * - Locale persists in localStorage (`serviq_locale`), matching the app's
 *   existing localStorage-based state (api key, org id).
 * - `useT()` returns a `t(key, vars?)` function with `{var}` interpolation.
 * - Designed so call sites use `t("namespace.key")`; the backing store could be
 *   swapped for next-intl later without touching components.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "tr" | "en";

export const LOCALES: Locale[] = ["tr", "en"];
const DEFAULT_LOCALE: Locale = "tr";
const STORAGE_KEY = "serviq_locale";

/** BCP-47 tags for Intl date/number formatting. */
export const localeTag: Record<Locale, string> = { tr: "tr-TR", en: "en-US" };

// --- Message catalog -------------------------------------------------------

// `en` is the canonical key set. Keep keys namespaced and flat (dotted).
const en = {
  "common.back": "Back",
  "common.backToServiq": "Back to SERVIQ",
  "common.refresh": "Refresh",
  "common.home": "Home",
  "common.today": "Today",
  "common.prev": "Prev",
  "common.next": "Next",
  "common.backOffice": "Back office",
  "common.technician": "Technician",
  "common.allTechnicians": "All technicians",
  "common.unassigned": "Unassigned",
  "common.close": "Close",
  "common.list": "List",
  "common.create": "Create",
  "common.loading": "Loading",
  "common.records": "Records",
  "common.new": "New",

  "field.orgId": "Org ID",
  "field.apiKey": "API key",
  "field.apiKeyPlaceholder": "Local development key",
  "field.saveConnection": "Save connection",
  "field.technician": "Technician",
  "field.viewMode": "View mode",

  "nav.workorder": "Workorder",
  "nav.dashboard": "Dashboard",
  "nav.connection": "Connection",
  "nav.back": "Back",

  "status.OPEN": "Open",
  "status.IN_PROGRESS": "In progress",
  "status.COMPLETED": "Completed",
  "status.CANCELLED": "Cancelled",

  "priority.LOW": "Low",
  "priority.NORMAL": "Normal",
  "priority.HIGH": "High",
  "priority.URGENT": "Urgent",

  "serviq.title": "Work Orders",
  "serviq.subtitle": "SERVIQ field service",
  "serviq.selected": "{orderNo} selected",
  "serviq.workOrders": "Work orders",
  "serviq.productLabel": "Product label",
  "serviq.newWorkOrder": "New work order",
  "serviq.createWorkOrder": "Create work order",
  "serviq.selectOrCreate": "Select or create a work order.",
  "serviq.connectionRequired": "Connection is required before work orders can load.",
  "serviq.connectionTitle": "Connection required",
  "serviq.connectionHelp": "Enter the API key before creating or loading work orders.",
  "serviq.connectionMissing": "Enter and save the API key before creating a work order.",
  "serviq.demoMode": "Demo mode",
  "serviq.demoModeInfo": "Orders are saved in this browser until live API credentials are added.",
  "serviq.liveApi": "Live API",
  "serviq.liveApiInfo": "Connected to backend API.",
  "serviq.demoSaved": "Work order saved in demo mode on this browser.",
  "serviq.loadingWorkOrders": "Loading work orders...",
  "serviq.noWorkOrders": "No work orders yet.",
  "serviq.startVisit": "Start visit",
  "serviq.endVisit": "End visit",
  "serviq.complete": "Complete",
  "serviq.details": "Details",
  "serviq.materials": "Materials",
  "serviq.time": "Time",
  "serviq.sign": "Sign",
  "serviq.payment": "Payment",
  "serviq.assistant": "Assistant",
  "serviq.orderNo": "Order no",
  "serviq.titleField": "Title",
  "serviq.priority": "Priority",
  "serviq.scheduledFor": "Scheduled for",
  "serviq.scheduledDate": "Date",
  "serviq.scheduledDatePlaceholder": "dd.mm.yyyy",
  "serviq.scheduledTime": "Time",
  "serviq.scheduledTimePlaceholder": "hh:mm",
  "serviq.customer": "Customer",
  "serviq.customerPhone": "Customer phone",
  "serviq.customerEmail": "Customer email",
  "serviq.phone": "Phone",
  "serviq.equipment": "Equipment",
  "serviq.model": "Model",
  "serviq.serialNo": "Serial no",
  "serviq.serial": "Serial",
  "serviq.technician": "Technician",
  "serviq.testTechnician": "Test technician",
  "serviq.customTechnician": "Custom technician",
  "serviq.visitNotes": "Visit notes",
  "serviq.billToAccount": "Bill to account",
  "serviq.created": "Created",
  "serviq.orderDateOpened": "Date opened",
  "serviq.viewReport": "View report",
  "serviq.downloadPdf": "Download PDF",
  "serviq.sendEmail": "Send email",
  "serviq.materialUsage": "Material usage",
  "serviq.addMaterial": "Add material",
  "serviq.materialCode": "Material code",
  "serviq.materialName": "Material name",
  "serviq.warehouseLocation": "Warehouse location",
  "serviq.noMaterials": "No materials recorded.",
  "serviq.timeTracking": "Time tracking",
  "serviq.saveTime": "Save time",
  "serviq.arrival": "Arrival",
  "serviq.departure": "Departure",
  "serviq.laborHours": "{hours} labor hours",
  "serviq.technicianComment": "Technician comment",
  "serviq.noTimeEntries": "No time entries recorded.",
  "serviq.signature": "Signature",
  "serviq.saveSignature": "Save signature",
  "serviq.signerName": "Signer name",
  "serviq.clearSignature": "Clear signature",
  "serviq.capturedSignature": "Captured signature",
  "serviq.signatureWithoutImage": "Signature without image",
  "serviq.noSignatures": "No signatures recorded.",
  "serviq.recordPayment": "Record payment",
  "serviq.paymentPending": "Payment pending",
  "serviq.paid": "Paid",
  "serviq.unpaid": "Unpaid",
  "serviq.failed": "Failed",
  "serviq.cash": "Cash",
  "serviq.creditCard": "Credit card",
  "serviq.virtualPos": "Virtual POS",
  "serviq.used": "Used",
  "serviq.returned": "Returned",
  "serviq.transactionRef": "Transaction/reference no",
  "serviq.noPayments": "No payments recorded.",
  "serviq.technicianAssistant": "Technician assistant",
  "serviq.generateSummary": "Generate summary",
  "serviq.assistantIntro": "Generate a work-order summary grounded in the recorded job data.",
  "serviq.nextActions": "Next actions",

  "notice.connectionSaved": "Connection saved.",
  "notice.workOrderCreated": "Work order created.",
  "notice.visitStarted": "Visit started.",
  "notice.materialSaved": "Material saved.",
  "notice.timeSaved": "Time entry saved.",
  "notice.signatureSaved": "Signature saved.",
  "notice.paymentRecorded": "Payment recorded.",
  "notice.workOrderCompleted": "Work order completed.",
  "notice.reportAvailable": "Service report is available from the API.",
  "notice.pdfDownloaded": "PDF downloaded.",
  "notice.emailQueued": "Service report email queued.",
  "notice.assistantUpdated": "Assistant summary updated.",

  "dash.title": "SERVIQ Dashboard",
  "dash.subtitle": "Back office and technician calendar view",
  "dash.tabs": "Tabs",
  "dash.filters": "Filters",
  "dash.openWorkOrders": "Open work orders",
  "dash.dayAgenda": "Day agenda",
  "dash.selectedSnapshot": "Selected event snapshot",
  "dash.noScheduledWork": "No scheduled work on this day.",
  "dash.itemsCount": "{count} items",
  "dash.moreEvents": "+{count} more",
  "dash.backofficeInfo": "Back office calendar shows all assigned and unassigned work orders.",
  "dash.technicianInfo": "Technician view shows the selected technician's schedule for the month.",

  "stat.open": "Open",
  "stat.active": "Active",
  "stat.done": "Done",
  "stat.customer": "Customer",
  "stat.technician": "Technician",
  "stat.schedule": "Schedule",

  "error.loadOrders": "Could not load SERVIQ work orders.",
  "error.authFailed": "Authentication failed. Check the API key or access token.",
  "error.forbidden": "This account cannot perform that action for the selected organization.",
  "error.invalid": "Required information is missing or invalid.",
  "error.paymentRequired": "Record a payment or bill this customer to account before completion.",
  "error.lockedOrder": "Completed or cancelled work orders cannot be changed.",
  "error.databaseMissing": "The API database connection is not configured.",
  "error.customerEmailMissing": "Customer email is missing.",
  "error.actionFailed": "{label} failed",
  "error.assistantFailed": "Assistant summary failed",
} as const;

export type MessageKey = keyof typeof en;

// `tr` is forced to provide exactly the same keys as `en`.
const tr: Record<MessageKey, string> = {
  "common.back": "Geri",
  "common.backToServiq": "SERVIQ'e dön",
  "common.refresh": "Yenile",
  "common.home": "Ana sayfa",
  "common.today": "Bugün",
  "common.prev": "Önceki",
  "common.next": "Sonraki",
  "common.backOffice": "Arka ofis",
  "common.technician": "Teknisyen",
  "common.allTechnicians": "Tüm teknisyenler",
  "common.unassigned": "Atanmamış",
  "common.close": "Kapat",
  "common.list": "Liste",
  "common.create": "Oluştur",
  "common.loading": "Yükleniyor",
  "common.records": "Kayıtlar",
  "common.new": "Yeni",

  "field.orgId": "Org ID",
  "field.apiKey": "API anahtarı",
  "field.apiKeyPlaceholder": "Yerel geliştirme anahtarı",
  "field.saveConnection": "Bağlantıyı kaydet",
  "field.technician": "Teknisyen",
  "field.viewMode": "Görünüm modu",

  "nav.workorder": "İş emri",
  "nav.dashboard": "Panel",
  "nav.connection": "Bağlantı",
  "nav.back": "Geri",

  "status.OPEN": "Açık",
  "status.IN_PROGRESS": "Devam ediyor",
  "status.COMPLETED": "Tamamlandı",
  "status.CANCELLED": "İptal edildi",

  "priority.LOW": "Düşük",
  "priority.NORMAL": "Normal",
  "priority.HIGH": "Yüksek",
  "priority.URGENT": "Acil",

  "serviq.title": "İş Emirleri",
  "serviq.subtitle": "SERVIQ saha servisi",
  "serviq.selected": "{orderNo} seçili",
  "serviq.workOrders": "İş emirleri",
  "serviq.productLabel": "Ürün etiketi",
  "serviq.newWorkOrder": "Yeni iş emri",
  "serviq.createWorkOrder": "İş emri oluştur",
  "serviq.selectOrCreate": "Bir iş emri seçin veya oluşturun.",
  "serviq.connectionRequired": "İş emirleri yüklenmeden önce bağlantı gerekli.",
  "serviq.connectionTitle": "Bağlantı gerekli",
  "serviq.connectionHelp": "İş emri oluşturmadan veya yüklemeden önce API anahtarını girin.",
  "serviq.connectionMissing": "İş emri oluşturmadan önce API anahtarını girip kaydedin.",
  "serviq.demoMode": "Demo modu",
  "serviq.demoModeInfo": "Canlı API bilgileri eklenene kadar iş emirleri bu tarayıcıda saklanır.",
  "serviq.liveApi": "Canlı API",
  "serviq.liveApiInfo": "Backend API bağlantısı aktif.",
  "serviq.demoSaved": "İş emri demo modunda bu tarayıcıya kaydedildi.",
  "serviq.loadingWorkOrders": "İş emirleri yükleniyor...",
  "serviq.noWorkOrders": "Henüz iş emri yok.",
  "serviq.startVisit": "Ziyareti başlat",
  "serviq.endVisit": "Ziyareti bitir",
  "serviq.complete": "Tamamla",
  "serviq.details": "Detaylar",
  "serviq.materials": "Malzemeler",
  "serviq.time": "Zaman",
  "serviq.sign": "İmza",
  "serviq.payment": "Ödeme",
  "serviq.assistant": "Asistan",
  "serviq.orderNo": "İş emri no",
  "serviq.titleField": "Başlık",
  "serviq.priority": "Öncelik",
  "serviq.scheduledFor": "Planlanan zaman",
  "serviq.scheduledDate": "Tarih",
  "serviq.scheduledDatePlaceholder": "gg.aa.yyyy",
  "serviq.scheduledTime": "Saat",
  "serviq.scheduledTimePlaceholder": "ss:dd",
  "serviq.customer": "Müşteri",
  "serviq.customerPhone": "Müşteri telefonu",
  "serviq.customerEmail": "Müşteri e-postası",
  "serviq.phone": "Telefon",
  "serviq.equipment": "Ekipman",
  "serviq.model": "Model",
  "serviq.serialNo": "Seri no",
  "serviq.serial": "Seri",
  "serviq.technician": "Teknisyen",
  "serviq.testTechnician": "Test teknisyen",
  "serviq.customTechnician": "Özel teknisyen",
  "serviq.visitNotes": "Ziyaret notları",
  "serviq.billToAccount": "Cari hesaba yaz",
  "serviq.created": "Oluşturuldu",
  "serviq.orderDateOpened": "Açılış tarihi",
  "serviq.viewReport": "Raporu görüntüle",
  "serviq.downloadPdf": "PDF indir",
  "serviq.sendEmail": "E-posta gönder",
  "serviq.materialUsage": "Malzeme kullanımı",
  "serviq.addMaterial": "Malzeme ekle",
  "serviq.materialCode": "Malzeme kodu",
  "serviq.materialName": "Malzeme adı",
  "serviq.warehouseLocation": "Depo/lokasyon",
  "serviq.noMaterials": "Malzeme kaydı yok.",
  "serviq.timeTracking": "Zaman takibi",
  "serviq.saveTime": "Zamanı kaydet",
  "serviq.arrival": "Varış",
  "serviq.departure": "Ayrılış",
  "serviq.laborHours": "{hours} işçilik saati",
  "serviq.technicianComment": "Teknisyen yorumu",
  "serviq.noTimeEntries": "Zaman kaydı yok.",
  "serviq.signature": "İmza",
  "serviq.saveSignature": "İmzayı kaydet",
  "serviq.signerName": "İmzalayan adı",
  "serviq.clearSignature": "İmzayı temizle",
  "serviq.capturedSignature": "İmza alındı",
  "serviq.signatureWithoutImage": "Görselsiz imza",
  "serviq.noSignatures": "İmza kaydı yok.",
  "serviq.recordPayment": "Ödemeyi kaydet",
  "serviq.paymentPending": "Ödeme bekliyor",
  "serviq.paid": "Ödendi",
  "serviq.unpaid": "Ödenmedi",
  "serviq.failed": "Başarısız",
  "serviq.cash": "Nakit",
  "serviq.creditCard": "Kredi kartı",
  "serviq.virtualPos": "Sanal POS",
  "serviq.used": "Kullanıldı",
  "serviq.returned": "İade",
  "serviq.transactionRef": "İşlem/referans no",
  "serviq.noPayments": "Ödeme kaydı yok.",
  "serviq.technicianAssistant": "Teknisyen asistanı",
  "serviq.generateSummary": "Özet oluştur",
  "serviq.assistantIntro": "Kaydedilen iş verilerine dayalı iş emri özeti oluştur.",
  "serviq.nextActions": "Sonraki aksiyonlar",

  "notice.connectionSaved": "Bağlantı kaydedildi.",
  "notice.workOrderCreated": "İş emri oluşturuldu.",
  "notice.visitStarted": "Ziyaret başlatıldı.",
  "notice.materialSaved": "Malzeme kaydedildi.",
  "notice.timeSaved": "Zaman kaydı kaydedildi.",
  "notice.signatureSaved": "İmza kaydedildi.",
  "notice.paymentRecorded": "Ödeme kaydedildi.",
  "notice.workOrderCompleted": "İş emri tamamlandı.",
  "notice.reportAvailable": "Servis raporu API üzerinden hazır.",
  "notice.pdfDownloaded": "PDF indirildi.",
  "notice.emailQueued": "Servis raporu e-postası kuyruğa alındı.",
  "notice.assistantUpdated": "Asistan özeti güncellendi.",

  "dash.title": "SERVIQ Paneli",
  "dash.subtitle": "Arka ofis ve teknisyen takvim görünümü",
  "dash.tabs": "Sekmeler",
  "dash.filters": "Filtreler",
  "dash.openWorkOrders": "İş emirlerini aç",
  "dash.dayAgenda": "Gün ajandası",
  "dash.selectedSnapshot": "Seçili kayıt özeti",
  "dash.noScheduledWork": "Bu gün için planlanmış iş yok.",
  "dash.itemsCount": "{count} kayıt",
  "dash.moreEvents": "+{count} daha",
  "dash.backofficeInfo": "Arka ofis takvimi atanmış ve atanmamış tüm iş emirlerini gösterir.",
  "dash.technicianInfo": "Teknisyen görünümü seçili teknisyenin aylık programını gösterir.",

  "stat.open": "Açık",
  "stat.active": "Aktif",
  "stat.done": "Bitti",
  "stat.customer": "Müşteri",
  "stat.technician": "Teknisyen",
  "stat.schedule": "Planlama",

  "error.loadOrders": "SERVIQ iş emirleri yüklenemedi.",
  "error.authFailed": "Kimlik doğrulama başarısız. API anahtarını veya erişim token'ını kontrol edin.",
  "error.forbidden": "Bu hesap seçili organizasyonda bu işlemi yapamaz.",
  "error.invalid": "Zorunlu bilgi eksik veya geçersiz.",
  "error.paymentRequired": "Tamamlamadan önce ödeme kaydedin veya müşteriyi cari hesaba yazın.",
  "error.lockedOrder": "Tamamlanmış veya iptal edilmiş iş emirleri değiştirilemez.",
  "error.databaseMissing": "API veritabanı bağlantısı yapılandırılmamış.",
  "error.customerEmailMissing": "Müşteri e-postası eksik.",
  "error.actionFailed": "{label} başarısız oldu",
  "error.assistantFailed": "Asistan özeti başarısız oldu",
};

const catalog: Record<Locale, Record<MessageKey, string>> = { en, tr };

// --- Context + hooks -------------------------------------------------------

type TVars = Record<string, string | number>;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey, vars?: TVars) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from localStorage once on the client.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && LOCALES.includes(saved)) setLocaleState(saved);
  }, []);

  // Keep <html lang> in sync for accessibility / SEO.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: TVars) => interpolate(catalog[locale][key] ?? en[key] ?? key, vars),
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale/useT must be used within a LocaleProvider");
  return ctx;
}

export function useLocale() {
  const { locale, setLocale } = useLocaleContext();
  return { locale, setLocale };
}

export function useT() {
  return useLocaleContext().t;
}

/** Locale-aware date formatters bound to the current locale. */
export function useFormatters() {
  const { locale } = useLocaleContext();
  const tag = localeTag[locale];
  return useMemo(
    () => ({
      monthLabel: (date: Date) =>
        date.toLocaleDateString(tag, { month: "long", year: "numeric" }),
      longDate: (date: Date) =>
        date.toLocaleDateString(tag, { weekday: "long", month: "long", day: "numeric" }),
      dateTime: (date: Date) =>
        date.toLocaleString(tag, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      /** Short weekday labels Mon..Sun for calendar headers. */
      weekdayShort: () => {
        // 2024-01-01 is a Monday; walk 7 days for stable locale-ordered labels.
        const monday = new Date(2024, 0, 1);
        return Array.from({ length: 7 }, (_, i) => {
          const day = new Date(monday);
          day.setDate(monday.getDate() + i);
          return day.toLocaleDateString(tag, { weekday: "short" });
        });
      },
    }),
    [tag],
  );
}

// --- Language toggle -------------------------------------------------------

export function LanguageToggle({ style }: { style?: React.CSSProperties }) {
  const { locale, setLocale } = useLocale();
  return (
    <div
      role="group"
      aria-label="Language"
      style={{ display: "inline-flex", border: "1px solid #e8e8e8", borderRadius: 8, overflow: "hidden", ...style }}
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            style={{
              border: 0,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              textTransform: "uppercase",
              background: active ? "#111" : "#fff",
              color: active ? "#fff" : "#666",
            }}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
