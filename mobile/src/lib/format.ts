const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

export function faNumber(value: number | string) {
  return String(value).replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export function formatMoney(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

export const roleLabels = { admin: "مدیر اصلی", manager: "مدیر عملیات", employee: "کارمند" } as const;
export const statusLabels: Record<string, string> = { submitted: "ثبت‌شده", approved: "تأییدشده", rejected: "ردشده", revision_requested: "نیازمند اصلاح", draft: "پیش‌نویس", received: "در حال تعمیر", delivered: "تحویل‌شده", awaiting_handover: "در انتظار تحویل", with_technician: "نزد تعمیرکار", awaiting_return: "منتظر تحویل به شما", returned: "تحویل‌گرفته‌شده", awaiting_rework: "منتظر تأیید مرجوعی" };
