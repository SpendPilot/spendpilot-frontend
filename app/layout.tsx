import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "Business AI Document Scanner",
  description: "Simplified business document scanning with Entra ID and Azure AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Script id="runtime-config" src="/runtime-config" strategy="beforeInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

