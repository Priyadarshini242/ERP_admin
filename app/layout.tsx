import type { Metadata } from "next";
import type { ReactNode } from "react";

import { THEME_INIT_SCRIPT, ThemeProvider } from "@/components/ThemeProvider";

import "./globals.css";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "QuickERP";

export const metadata: Metadata = {
  title: { default: APP, template: `%s · ${APP}` },
  description: "Sales, purchase, inventory and accounts",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
