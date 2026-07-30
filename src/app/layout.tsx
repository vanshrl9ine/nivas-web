import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nivas — find your next home",
  description:
    "Property search over Elasticsearch, backed by Postgres. Faceted, geo-aware listing search with saved-search alerts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t py-6">
            <div className="mx-auto max-w-7xl px-4 text-sm text-muted-foreground">
              Nivas — Spring Boot · Postgres · Elasticsearch · Redis · Kafka
            </div>
          </footer>
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
