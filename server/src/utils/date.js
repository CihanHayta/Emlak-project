// server/src/utils/date.js
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_TIMEZONE = "Europe/Istanbul";

/** Şu anı İstanbul saatiyle bir dayjs nesnesi olarak döner. */
export function nowInIstanbul() {
  return dayjs().tz(DEFAULT_TIMEZONE);
}

/** Bir epoch-ms/Date/ISO değerini İstanbul saatine çevirir. */
export function toIstanbul(value) {
  return dayjs(value).tz(DEFAULT_TIMEZONE);
}

/** referenceCode üretiminde kullanılan "şu anki yıl" (İstanbul takvimine göre). */
export function currentYearInIstanbul() {
  return nowInIstanbul().year();
}
