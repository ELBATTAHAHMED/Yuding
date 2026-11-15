const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function formatAdminDay(value?: unknown): string {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(ISO_DAY.test(value) ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatAdminMoment(value?: unknown): string {
  const day = formatAdminDay(value);
  if (day === "—" || typeof value !== "string" || ISO_DAY.test(value)) return day;
  return `${day}, ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))}`;
}

export function formatStayDates(start?: unknown, end?: unknown): string {
  const first = formatAdminDay(start);
  const last = formatAdminDay(end);
  if (first === "—") return last;
  if (last === "—") return first;
  if (typeof start !== "string" || typeof end !== "string") return `${first} – ${last}`;
  const sameMonth = ISO_DAY.test(start) && ISO_DAY.test(end) && start.slice(0, 7) === end.slice(0, 7);
  const nights = ISO_DAY.test(start) && ISO_DAY.test(end) ? (Date.parse(end) - Date.parse(start)) / 86400000 : 0;
  return `${sameMonth ? start.slice(8) : first} – ${last}${Number.isInteger(nights) && nights > 0 ? ` · ${nights} ${nights === 1 ? "nuit" : "nuits"}` : ""}`;
}
