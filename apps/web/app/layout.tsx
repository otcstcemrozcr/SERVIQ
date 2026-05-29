import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "SERVIQ",
  description: "AI-native field service operations for enterprise after-sales teams.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // `lang` defaults to the default locale; LocaleProvider keeps it in sync with
  // the user's stored choice on the client.
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: "#111",
        }}
      >
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
