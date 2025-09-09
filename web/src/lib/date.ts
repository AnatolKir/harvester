export function utcStartOfTodayISO(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  return start.toISOString();
}

export function utcThresholdForFilter(
  filter: "today" | "week" | "month" | "all"
): string | null {
  if (filter === "all") return null;
  const now = new Date();
  switch (filter) {
    case "today":
      return utcStartOfTodayISO();
    case "week": {
      const ts = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(ts).toISOString();
    }
    case "month": {
      const monthAgo = new Date(now);
      monthAgo.setUTCMonth(monthAgo.getUTCMonth() - 1);
      return monthAgo.toISOString();
    }
    default:
      return null;
  }
}
