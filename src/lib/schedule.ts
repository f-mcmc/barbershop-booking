/** Ish vaqti va jadval sozlamalari. Toshkent vaqti (UTC+5, yozgi vaqt yo'q). */
export const SCHEDULE = {
  openHour: 10,
  closeHour: 20,
  slotMinutes: 30,
  daysAhead: 14,
  tzOffset: "+05:00",
  tzOffsetMinutes: 5 * 60,
} as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(date: string): boolean {
  return DATE_RE.test(date) && !Number.isNaN(new Date(`${date}T00:00:00${SCHEDULE.tzOffset}`).getTime());
}

/** Toshkent bo'yicha bugungi sana, YYYY-MM-DD. */
export function todayLocal(now: Date = new Date()): string {
  const local = new Date(now.getTime() + SCHEDULE.tzOffsetMinutes * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function localDateTime(date: string, minutesFromMidnight: number): Date {
  const h = String(Math.floor(minutesFromMidnight / 60)).padStart(2, "0");
  const m = String(minutesFromMidnight % 60).padStart(2, "0");
  return new Date(`${date}T${h}:${m}:00${SCHEDULE.tzOffset}`);
}

/** Kun ichidagi barcha slot boshlanish vaqtlari (daqiqada, yarim tundan). */
export function daySlotMinutes(): number[] {
  const out: number[] = [];
  for (let m = SCHEDULE.openHour * 60; m < SCHEDULE.closeHour * 60; m += SCHEDULE.slotMinutes) out.push(m);
  return out;
}

export function formatTime(d: Date): string {
  const local = new Date(d.getTime() + SCHEDULE.tzOffsetMinutes * 60_000);
  return local.toISOString().slice(11, 16);
}

export function formatDateLocal(d: Date): string {
  const local = new Date(d.getTime() + SCHEDULE.tzOffsetMinutes * 60_000);
  return local.toISOString().slice(0, 10);
}

const WEEKDAYS = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"] as const;
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"] as const;

export function humanDate(date: string): { weekday: string; day: string } {
  const d = new Date(`${date}T12:00:00Z`);
  return {
    weekday: WEEKDAYS[d.getUTCDay()] ?? "",
    day: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()] ?? ""}`,
  };
}

export function formatSum(n: number): string {
  return n.toLocaleString("ru-RU").replace(/ /g, " ") + " so'm";
}
