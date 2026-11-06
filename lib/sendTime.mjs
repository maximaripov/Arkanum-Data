// When the daily digest goes out: 5:00 PM New York time (daylight saving handled).
export const SEND_AT_MINUTES = 17 * 60;

/** Date (YYYY-MM-DD) and minutes past midnight in New York. */
export function nyNow(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) + Number(p.second) / 60 };
}

/** True from 15 seconds before 5:00 PM New York time (a timer can fire a hair early). */
export const pastSendTime = (now = new Date()) => nyNow(now).minutes >= SEND_AT_MINUTES - 0.25;
