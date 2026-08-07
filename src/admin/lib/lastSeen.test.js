// @vitest-environment jsdom
// src/admin/lib/lastSeen.test.js
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getLastSeen, markSeen, subscribeToLastSeen } from "./lastSeen";

describe("lastSeen", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hiç işaretlenmemiş bir anahtar için 0 döner", () => {
    expect(getLastSeen("basvurular")).toBe(0);
  });

  it("markSeen sonrası getLastSeen güncel bir zaman damgası döner", () => {
    const before = Date.now();
    markSeen("basvurular");
    const seen = getLastSeen("basvurular");
    expect(seen).toBeGreaterThanOrEqual(before);
  });

  it("farklı anahtarlar birbirinden bağımsız saklanır", () => {
    markSeen("basvurular");
    expect(getLastSeen("musteriler")).toBe(0);
  });

  it("markSeen abone olan dinleyicilere bildirim gönderir", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToLastSeen(callback);
    markSeen("basvurular");
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("unsubscribe sonrası dinleyici artık çağrılmaz", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToLastSeen(callback);
    unsubscribe();
    markSeen("basvurular");
    expect(callback).not.toHaveBeenCalled();
  });
});
