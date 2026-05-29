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

  "field.orgId": "Org ID",
  "field.apiKey": "API key",
  "field.apiKeyPlaceholder": "Local development key",
  "field.saveConnection": "Save connection",
  "field.technician": "Technician",
  "field.viewMode": "View mode",

  "nav.workorder": "Workorder",
  "nav.dashboard": "Dashboard",
  "nav.connection": "Connection",

  "status.OPEN": "Open",
  "status.IN_PROGRESS": "In progress",
  "status.COMPLETED": "Completed",
  "status.CANCELLED": "Cancelled",

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

  "field.orgId": "Org ID",
  "field.apiKey": "API anahtarı",
  "field.apiKeyPlaceholder": "Yerel geliştirme anahtarı",
  "field.saveConnection": "Bağlantıyı kaydet",
  "field.technician": "Teknisyen",
  "field.viewMode": "Görünüm modu",

  "nav.workorder": "İş emri",
  "nav.dashboard": "Panel",
  "nav.connection": "Bağlantı",

  "status.OPEN": "Açık",
  "status.IN_PROGRESS": "Devam ediyor",
  "status.COMPLETED": "Tamamlandı",
  "status.CANCELLED": "İptal edildi",

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
