"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Bell, CalendarDays, ChevronLeft, ChevronsLeft, ChevronsRight,
  CircleHelp, ContactRound, FileBarChart, Gauge, HardHat, Hexagon, Home, ListTodo, LogOut, Menu,
  Search, Settings, UserRound, Users, WalletCards, Wrench, X,
} from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { hasPermission, roleLabels, type Permission } from "@/lib/auth/roles";
import type { Viewer } from "@/lib/auth/types";

const nav = [
  { href: "/dashboard", label: "داشبورد", icon: Gauge, permission: "dashboard:view" },
  { href: "/maintenance", label: "تعمیرات و سرویس", icon: Wrench, permission: "maintenance-report:write" },
  { href: "/daily-reports", label: "گزارش", icon: CalendarDays, permission: "daily-report:write" },
  { href: "/daily-tasks", label: "کارهای روزانه", icon: ListTodo, permission: "dashboard:view" },
  { href: "/expenses", label: "مخارج", icon: WalletCards, permission: "dashboard:view" },
  { href: "/employees", label: "کارکنان", icon: Users, permission: "employees:view" },
  { href: "/customers", label: "مشتریان", icon: ContactRound, permission: "customers:view" },
  { href: "/technicians", label: "تعمیرکاران", icon: HardHat, permission: "technician-jobs:manage" },
  { href: "/reports", label: "گزارش‌ها", icon: FileBarChart, permission: "reports:review" },
  { href: "/activity", label: "فعالیت‌ها", icon: Activity, permission: "activity:view" },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "نمای عملیات",
  "/daily-reports": "گزارش‌های روزانه",
  "/daily-reports/new": "ثبت گزارش روزانه",
  "/daily-tasks": "کارهای روزانه",
  "/expenses": "مخارج",
  "/maintenance": "تعمیرات و سرویس",
  "/maintenance/new": "ثبت تعمیرات",
  "/employees": "کارکنان",
  "/employees/new": "ساخت کاربر",
  "/customers": "مشتریان",
  "/customers/new": "افزودن مشتری",
  "/technicians": "تحویل به تعمیرکار",
  "/reports": "بررسی گزارش‌ها",
  "/activity": "فعالیت‌ها",
  "/profile": "پنل کاربری",
};

export function AppShell({ children, viewer }: { children: React.ReactNode; viewer: Viewer }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const visibleNav = nav.filter((item) => hasPermission(viewer.role, item.permission as Permission));
  const canManageSettings = hasPermission(viewer.role, "settings:manage");
  const currentDate = new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const currentPageTitle = pageTitles[pathname] ?? (pathname.startsWith("/customers/") ? "پرونده مشتری" : "مدار عملیات");
  const avatarUrl = viewer.avatarPath ? createClient().storage.from("profile-avatars").getPublicUrl(viewer.avatarPath).data.publicUrl : null;

  const active = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Hexagon strokeWidth={1.8} /><i /></span>
          <span className="brand-copy"><strong>مدار</strong><small>مرکز عملیات فارم</small></span>
        </div>
        <nav className="sidebar-nav" aria-label="ناوبری اصلی">
          <p className="nav-caption">محیط کار</p>
          {visibleNav.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-item ${active(item.href) ? "active" : ""}`} title={collapsed ? item.label : undefined}>
              <item.icon /><span>{item.label}</span>{active(item.href) && <i />}
            </Link>
          ))}
          {canManageSettings && <><p className="nav-caption nav-caption-secondary">سامانه</p>
          <Link href="/settings" className={`nav-item ${active("/settings") ? "active" : ""}`}><Settings /><span>تنظیمات</span></Link></>}
        </nav>
        <button className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label="جمع کردن نوار کناری">
          {collapsed ? <ChevronsLeft /> : <ChevronsRight />}<span>جمع کردن منو</span>
        </button>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-title"><span>{currentDate}</span><strong>{currentPageTitle}</strong></div>
          <div className="topbar-actions">
            <button className="global-search"><Search /><span>جست‌وجو در گزارش‌ها...</span><kbd>⌘ K</kbd></button>
            <span className="topbar-date"><CalendarDays /> {currentDate}</span>
            <button className="topbar-icon notification-button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="اعلان‌ها"><Bell /></button>
            <button className="user-button" onClick={() => setUserOpen((value) => !value)} aria-expanded={userOpen}><span className={`avatar ${avatarUrl ? "has-image" : ""}`} style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}>{!avatarUrl && viewer.displayName.slice(0, 1)}</span><span className="user-copy"><strong>{viewer.displayName}</strong><small>{roleLabels[viewer.role]}</small></span><ChevronLeft /></button>
          </div>
          <div className="mobile-topbar">
            <div className="brand"><span className="brand-mark"><Hexagon /><i /></span><span className="brand-copy"><strong>مدار</strong><small>عملیات فارم</small></span></div>
            <button className="topbar-icon notification-button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="اعلان‌ها"><Bell /></button>
          </div>
          {notificationsOpen && (
            <div className="notification-popover">
              <div><strong>اعلان‌ها</strong><button onClick={() => setNotificationsOpen(false)}><X /></button></div>
              <div className="notification-empty"><Bell /><strong>اعلانی وجود ندارد</strong><small>اعلان‌های واقعی سامانه در اینجا نمایش داده می‌شوند.</small></div>
            </div>
          )}
          {userOpen && (
            <div className="user-popover">
              <div><span className={`avatar ${avatarUrl ? "has-image" : ""}`} style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}>{!avatarUrl && viewer.displayName.slice(0, 1)}</span><p><strong>{viewer.displayName}</strong><small>{roleLabels[viewer.role]}</small></p></div>
              <Link href="/profile"><UserRound />پنل کاربری</Link>
              <button onClick={signOut} disabled={signingOut}><LogOut />{signingOut ? "در حال خروج..." : "خروج امن از سامانه"}</button>
            </div>
          )}
        </header>
        <main>{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="ناوبری موبایل">
        <Link href="/dashboard" className={active("/dashboard") ? "active" : ""}><Home /><span>خانه</span></Link>
        <Link href="/maintenance/new" className={active("/maintenance") ? "active" : ""}><Wrench /><span>تعمیرات</span></Link>
        <Link href="/daily-reports/new" className={`mobile-nav-primary ${active("/daily-reports") ? "active" : ""}`}><span><CalendarDays /></span><em>گزارش</em></Link>
        <Link href="/daily-reports" className={pathname === "/daily-reports" ? "active" : ""}><FileBarChart /><span>سوابق</span></Link>
        <button onClick={() => setMoreOpen(true)}><Menu /><span>بیشتر</span></button>
      </nav>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="بیشتر">
        <div className="more-grid">
          {hasPermission(viewer.role, "employees:view") && <Link href="/employees"><Users />کارکنان</Link>}
          {hasPermission(viewer.role, "customers:view") && <Link href="/customers"><ContactRound />مشتریان</Link>}
          <Link href="/daily-tasks"><ListTodo />کارهای روزانه</Link>
          <Link href="/expenses"><WalletCards />مخارج</Link>
          {hasPermission(viewer.role, "technician-jobs:manage") && <Link href="/technicians"><HardHat />تعمیرکاران</Link>}
          {hasPermission(viewer.role, "reports:review") && <Link href="/reports"><FileBarChart />گزارش‌ها</Link>}
          {hasPermission(viewer.role, "activity:view") && <Link href="/activity"><Activity />فعالیت‌ها</Link>}
          <Link href="/profile"><UserRound />پنل کاربری</Link>
          {canManageSettings && <Link href="/settings"><Settings />تنظیمات</Link>}
          <button><CircleHelp />راهنما</button><button onClick={signOut} disabled={signingOut}><LogOut />خروج</button>
        </div>
      </BottomSheet>
    </div>
  );
}
