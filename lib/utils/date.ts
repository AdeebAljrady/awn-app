/**
 * Format a date to Hijri (Islamic) calendar in Arabic
 * Returns format like: ١‏/٧‏/١٤٤٧ هـ
 */
export function formatHijriDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(dateObj);
}

/**
 * Format a date to Hijri with month name
 * Returns format like: ١ رجب ١٤٤٧ هـ
 */
export function formatHijriDateFull(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateObj);
}
