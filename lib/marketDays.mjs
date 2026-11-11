// NYSE full-day holidays, by rule (no list to keep up to date). Early-close days (1 PM)
// are ordinary trading days here.

const ymd = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const dow = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun … 6 Sat
/** The n-th given weekday of a month (n = -1: the last one). */
function nth(y, m, weekday, n) {
  if (n > 0) { const first = dow(y, m, 1); return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7; }
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return last - ((dow(y, m, last) - weekday + 7) % 7);
}
/** A fixed-date holiday on a weekend moves to Friday (Saturday) or Monday (Sunday). */
function observed(y, m, d) {
  const w = dow(y, m, d);
  const t = Date.UTC(y, m - 1, d) + (w === 6 ? -1 : w === 0 ? 1 : 0) * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
/** Easter Sunday (Gregorian), for Good Friday. */
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day);
}

export function nyseHolidays(y) {
  const out = [
    // New Year's Day: on a Saturday the NYSE does not close the Friday before (it's in the old year).
    dow(y, 1, 1) === 6 ? null : observed(y, 1, 1),
    ymd(y, 1, nth(y, 1, 1, 3)), // Martin Luther King Jr. Day
    ymd(y, 2, nth(y, 2, 1, 3)), // Washington's Birthday
    new Date(easter(y) - 2 * 86_400_000).toISOString().slice(0, 10), // Good Friday
    ymd(y, 5, nth(y, 5, 1, -1)), // Memorial Day
    observed(y, 6, 19), // Juneteenth
    observed(y, 7, 4), // Independence Day
    ymd(y, 9, nth(y, 9, 1, 1)), // Labor Day
    ymd(y, 11, nth(y, 11, 4, 4)), // Thanksgiving
    observed(y, 12, 25), // Christmas
  ];
  return out.filter(Boolean);
}

/** True on weekends and NYSE holidays. */
export function marketClosed(date) {
  const [y, m, d] = date.split("-").map(Number);
  const w = dow(y, m, d);
  return w === 0 || w === 6 || nyseHolidays(y).includes(date);
}

/** US federal holidays, when SEC's EDGAR accepts no filings. Unlike the NYSE: open on Good
 *  Friday, closed on Columbus Day and Veterans Day. Inauguration Day (DC only) is left out. */
export function secHolidays(y) {
  return [
    observed(y, 1, 1),
    ymd(y, 1, nth(y, 1, 1, 3)), // Martin Luther King Jr. Day
    ymd(y, 2, nth(y, 2, 1, 3)), // Washington's Birthday
    ymd(y, 5, nth(y, 5, 1, -1)), // Memorial Day
    observed(y, 6, 19), // Juneteenth
    observed(y, 7, 4), // Independence Day
    ymd(y, 9, nth(y, 9, 1, 1)), // Labor Day
    ymd(y, 10, nth(y, 10, 1, 2)), // Columbus Day
    observed(y, 11, 11), // Veterans Day
    ymd(y, 11, nth(y, 11, 4, 4)), // Thanksgiving
    observed(y, 12, 25), // Christmas
  ];
}

/** True on weekends and federal holidays: no new SEC filings that day. */
export function secClosed(date) {
  const [y, m, d] = date.split("-").map(Number);
  const w = dow(y, m, d);
  return w === 0 || w === 6 || secHolidays(y).includes(date);
}
