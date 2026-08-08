import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "مدار عملیات | مدیریت فارم",
    template: "%s | مدار عملیات",
  },
  description: "سامانه فارسی مدیریت گزارش‌های روزانه و عملیات تعمیر و نگهداری فارم",
  applicationName: "مدار عملیات",
  openGraph: {
    title: "مدار عملیات | مدیریت فارم",
    description: "هر روز، روشن و قابل پیگیری.",
    locale: "fa_IR",
    type: "website",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "مدار، مرکز عملیات فارم" }],
  },
  twitter: { card: "summary_large_image", title: "مدار عملیات", description: "هر روز، روشن و قابل پیگیری.", images: ["/og.png"] },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
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
      <body>{children}</body>
    </html>
  );
}
