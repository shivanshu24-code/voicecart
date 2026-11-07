import type { StorefrontHour } from "./storefront";

const DAY = 24 * 60;
const WEEK = 7 * DAY;
const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type OpenStatus =
  | { open: true; until: string }
  | { open: false; opensAt: string; opensIn: "today" | "tomorrow" | "later"; day: number };

const toMinutes = (time: string) => {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
};

/** The shop's own local time, so a visitor in another city still sees the truth. */
function localMinute(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";

  const day = dayIndex.indexOf(part("weekday"));
  return { day, minute: day * DAY + Number(part("hour")) * 60 + Number(part("minute")) };
}

/**
 * Whether the shop is open right now. Returns null rather than guessing when
 * the owner hasn't said anything about today, because a wrong "Closed" costs
 * the shop a customer.
 */
export function openStatus(hours: StorefrontHour[], now: Date, timeZone: string): OpenStatus | null {
  const { day, minute } = localMinute(now, timeZone);

  const spans = hours.flatMap((hour) => {
    if (hour.is_closed || !hour.open_time || !hour.close_time) return [];
    const open = toMinutes(hour.open_time);
    const close = toMinutes(hour.close_time);
    const start = hour.day_of_week * DAY + open;
    // Closing "before" opening means the shop runs past midnight.
    return [{ start, end: start + ((close - open + DAY) % DAY), close: hour.close_time, day: hour.day_of_week, open: hour.open_time }];
  });
  if (spans.length === 0) return null;

  // Saturday night's hours can reach into Sunday morning, at the start of the week.
  const current = spans.find(
    ({ start, end }) => (minute >= start && minute < end) || (minute + WEEK >= start && minute + WEEK < end),
  );
  if (current) return { open: true, until: current.close };

  if (!hours.some((hour) => hour.day_of_week === day)) return null;

  const wait = (start: number) => (start - minute + WEEK) % WEEK;
  const next = spans.reduce((best, span) => (wait(span.start) < wait(best.start) ? span : best));
  const daysAway = (next.day - day + 7) % 7;
  const opensIn = wait(next.start) >= 6 * DAY ? "later" : daysAway === 0 ? "today" : daysAway === 1 ? "tomorrow" : "later";

  return { open: false, opensAt: next.open, opensIn, day: next.day };
}
