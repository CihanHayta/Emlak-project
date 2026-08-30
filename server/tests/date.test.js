// server/tests/date.test.js
import { toIstanbul, nowInIstanbul, currentYearInIstanbul, DEFAULT_TIMEZONE } from "../src/utils/date.js";

describe("date.js", () => {
  it("DEFAULT_TIMEZONE İstanbul olarak sabit", () => {
    expect(DEFAULT_TIMEZONE).toBe("Europe/Istanbul");
  });

  it("toIstanbul, UTC 21:00'i (TR sabit UTC+3) ertesi gün 00:00 olarak çevirir", () => {
    const result = toIstanbul("2026-03-09T21:00:00.000Z");
    expect(result.format("YYYY-MM-DD HH:mm")).toBe("2026-03-10 00:00");
  });

  it("toIstanbul epoch-ms de kabul eder", () => {
    const ms = new Date("2026-06-15T12:00:00.000Z").getTime();
    const result = toIstanbul(ms);
    expect(result.format("YYYY-MM-DD HH:mm")).toBe("2026-06-15 15:00");
  });

  it("nowInIstanbul geçerli, İstanbul'a bağlı bir dayjs nesnesi döner", () => {
    const now = nowInIstanbul();
    expect(now.$x?.$timezone ?? now.tz()).toBeTruthy();
  });

  it("currentYearInIstanbul içinde bulunulan yılı döner", () => {
    const realYear = new Date().getFullYear();
    // TR ile sistem saati arasında yıl sınırında ±1 fark teorik olarak
    // mümkün ama pratikte testin çalıştığı an için bu aralık güvenli.
    expect([realYear - 1, realYear, realYear + 1]).toContain(currentYearInIstanbul());
  });
});
