import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Lora } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/lib/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${lora.variable}`}>
      <body className="flex min-h-full flex-col bg-canvas font-sans text-ink antialiased">
        <SiteHeader />
        <main className="w-full flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
