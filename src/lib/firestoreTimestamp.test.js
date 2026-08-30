// src/lib/firestoreTimestamp.test.js
import { describe, it, expect } from "vitest";
import { toMillis } from "./firestoreTimestamp";

describe("toMillis", () => {
  it("düz sayıyı olduğu gibi döner", () => {
    expect(toMillis(1700000000000)).toBe(1700000000000);
  });

  it("Firestore Timestamp formatını ({_seconds,_nanoseconds}) epoch-ms'e çevirir", () => {
    expect(toMillis({ _seconds: 1700000000, _nanoseconds: 500000000 })).toBe(1700000000500);
  });

  it("_nanoseconds eksikse 0 kabul eder", () => {
    expect(toMillis({ _seconds: 1700000000 })).toBe(1700000000000);
  });

  it("ISO string'i doğru parse eder", () => {
    expect(toMillis("2026-01-15T10:30:00.000Z")).toBe(new Date("2026-01-15T10:30:00.000Z").getTime());
  });

  it("null/undefined/boş string için 0 döner", () => {
    expect(toMillis(null)).toBe(0);
    expect(toMillis(undefined)).toBe(0);
    expect(toMillis("")).toBe(0);
  });

  it("parse edilemeyen bir string için (NaN yerine) 0 döner", () => {
    expect(toMillis("bu-bir-tarih-degil")).toBe(0);
  });

  it("bir Date nesnesini doğru çevirir", () => {
    const date = new Date("2026-05-01T00:00:00.000Z");
    expect(toMillis(date)).toBe(date.getTime());
  });
});
