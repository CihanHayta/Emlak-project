// src/admin/lib/staleListing.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

const { getListingByIdMock } = vi.hoisted(() => ({ getListingByIdMock: vi.fn() }));
vi.mock("../data/listingStore", () => ({ getListingById: getListingByIdMock }));

const { getStaleListingInfo } = await import("./staleListing");

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function customer(overrides) {
  return { role: "Satıcı", sellingListingId: "listing-1", ...overrides };
}

describe("getStaleListingInfo", () => {
  beforeEach(() => {
    getListingByIdMock.mockReset();
  });

  it('"Alıcı" rolündeki müşteriler için her zaman null döner', () => {
    expect(getStaleListingInfo(customer({ role: "Alıcı" }))).toBeNull();
    expect(getListingByIdMock).not.toHaveBeenCalled();
  });

  it("bağlı bir ilanı olmayan Satıcı için null döner", () => {
    expect(getStaleListingInfo(customer({ sellingListingId: null }))).toBeNull();
  });

  it("ilan bulunamazsa (silinmiş olabilir) null döner", () => {
    getListingByIdMock.mockReturnValue(null);
    expect(getStaleListingInfo(customer({}))).toBeNull();
  });

  it("ilan henüz 1 aylık olmadıysa null döner", () => {
    getListingByIdMock.mockReturnValue({ id: "listing-1", createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000 });
    expect(getStaleListingInfo(customer({}))).toBeNull();
  });

  it("tam 1 ay geçmiş bir ilan için 1 ay olarak döner", () => {
    getListingByIdMock.mockReturnValue({ id: "listing-1", createdAt: Date.now() - MONTH_MS - 1000 });
    const result = getStaleListingInfo(customer({}));
    expect(result.monthsElapsed).toBe(1);
  });

  it("3 aydan fazla geçmiş bir ilan için doğru ay sayısını döner", () => {
    getListingByIdMock.mockReturnValue({ id: "listing-1", createdAt: Date.now() - 3.5 * MONTH_MS });
    const result = getStaleListingInfo(customer({}));
    expect(result.monthsElapsed).toBe(3);
  });

  it("createdAt bilgisi olmayan bir ilan için null döner", () => {
    getListingByIdMock.mockReturnValue({ id: "listing-1" });
    expect(getStaleListingInfo(customer({}))).toBeNull();
  });
});
