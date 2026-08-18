import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "مدار عملیات | مدیریت فارم",
    template: "%s | مدار عملیات",
  },
  description: "سامانه فارسی مدیریت گزارش‌های روزانه و عملیات تعمیر و نگهداری فارم",
  applicationName: "MinePlus",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MinePlus",
  },
  other: { "apple-mobile-web-app-capable": "yes" },
  formatDetection: { telephone: false },
  openGraph: {
    title: "مدار عملیات | مدیریت فارم",
    description: "هر روز، روشن و قابل پیگیری.",
    locale: "fa_IR",
    type: "website",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "مدار، مرکز عملیات فارم" }],
  },
  twitter: { card: "summary_large_image", title: "مدار عملیات", description: "هر روز، روشن و قابل پیگیری.", images: ["/og.png"] },
  icons: {
    icon: [
      { url: "/mineplus-icon.svg", type: "image/svg+xml" },
      { url: "/icons/mineplus-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/mineplus-icon.svg",
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#17231d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}<PwaRegistration /></body>
    </html>
  );
}
