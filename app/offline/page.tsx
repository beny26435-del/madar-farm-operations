import type { Metadata } from "next";
import { RefreshCw, WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "بدون اتصال | MinePlus" };

export default function OfflinePage() {
  return <main className="offline-page"><section className="surface offline-card"><span><WifiOff /></span><small>MinePlus</small><h1>اتصال اینترنت برقرار نیست</h1><p>پس از وصل‌شدن اینترنت، دوباره تلاش کنید. اطلاعات خصوصی حساب شما در حافظه عمومی دستگاه ذخیره نمی‌شود.</p><a className="button button-primary" href="/dashboard"><RefreshCw /> تلاش دوباره</a></section></main>;
}
