const div = (value: number, divisor: number) => Math.floor(value / divisor);
const mod = (value: number, divisor: number) => value - div(value, divisor) * divisor;

export function normalizePersianDigits(value: string) {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return value.replace(/[۰-۹٠-٩]/g, (digit) => String(Math.max(persian.indexOf(digit), arabic.indexOf(digit))));
}

export function gregorianToJalali(gy: number, gm: number, gd: number) {
  const gregorianMonthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const year = gy - 1600;
  const month = gm - 1;
  const day = gd - 1;
  let dayNumber = 365 * year + div(year + 3, 4) - div(year + 99, 100) + div(year + 399, 400);
  dayNumber += gregorianMonthDays[month] + day;
  if (month > 1 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) dayNumber += 1;

  let jalaliDayNumber = dayNumber - 79;
  const cycle = div(jalaliDayNumber, 12053);
  jalaliDayNumber = mod(jalaliDayNumber, 12053);
  let jy = 979 + 33 * cycle + 4 * div(jalaliDayNumber, 1461);
  jalaliDayNumber = mod(jalaliDayNumber, 1461);
  if (jalaliDayNumber >= 366) {
    jy += div(jalaliDayNumber - 1, 365);
    jalaliDayNumber = mod(jalaliDayNumber - 1, 365);
  }
  const jm = jalaliDayNumber < 186 ? 1 + div(jalaliDayNumber, 31) : 7 + div(jalaliDayNumber - 186, 30);
  const jd = 1 + (jalaliDayNumber < 186 ? mod(jalaliDayNumber, 31) : mod(jalaliDayNumber - 186, 30));
  return { year: jy, month: jm, day: jd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number) {
  const year = jy + 1595;
  let days = -355668 + 365 * year + div(year, 33) * 8 + div(mod(year, 33) + 3, 4) + jd;
  days += jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186;

  let gy = 400 * div(days, 146097);
  days = mod(days, 146097);
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days = mod(days, 36524);
    if (days >= 365) days += 1;
  }
  gy += 4 * div(days, 1461);
  days = mod(days, 1461);
  if (days > 365) {
    gy += div(days - 1, 365);
    days = mod(days - 1, 365);
  }
  let gd = days + 1;
  const monthDays = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  while (gm <= 12 && gd > monthDays[gm]) gd -= monthDays[gm++];
  return { year: gy, month: gm, day: gd };
}

export function parseJalaliDate(yearValue: string, monthValue: string, dayValue: string) {
  const year = Number(normalizePersianDigits(yearValue));
  const month = Number(normalizePersianDigits(monthValue));
  const day = Number(normalizePersianDigits(dayValue));
  if (!Number.isInteger(year) || year < 1300 || year > 1500 || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31) return null;
  const gregorian = jalaliToGregorian(year, month, day);
  const roundTrip = gregorianToJalali(gregorian.year, gregorian.month, gregorian.day);
  if (roundTrip.year !== year || roundTrip.month !== month || roundTrip.day !== day) return null;
  return `${gregorian.year.toString().padStart(4, "0")}-${gregorian.month.toString().padStart(2, "0")}-${gregorian.day.toString().padStart(2, "0")}`;
}

export function normalizeTime(value: string) {
  const digits = normalizePersianDigits(value).replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  if (digits.length === 3) return `${digits.slice(0, 1)}:${digits.slice(1)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function isValidTime(value: string) {
  return /^(?:\d|[01]\d|2[0-3]):[0-5]\d$/.test(normalizePersianDigits(value));
}
