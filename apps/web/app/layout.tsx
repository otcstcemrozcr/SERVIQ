import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/lib/i18n";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SERVIQ",
  description: "AI-native field service operations for enterprise after-sales teams.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body
        className={inter.className}
        style={{
          margin: 0,
          color: "#111",
        }}
      >
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
