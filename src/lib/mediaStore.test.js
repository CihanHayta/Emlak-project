// src/lib/mediaStore.test.js
//
// SADECE saf idb: referans yardımcıları (isMediaRef/toMediaRef/fromMediaRef)
// — putMediaFile/getMediaBlob/deleteMediaFile gerçek IndexedDB gerektiriyor
// (jsdom bunu desteklemiyor) ve zaten dosyanın kendi yorumunda "eski
// listeler için tutuluyor, yeni upload'larda kullanılmıyor" diye işaretli
// legacy kod — düşük değer/efor oranı, kapsam dışı bırakıldı.
import { describe, it, expect } from "vitest";
import { isMediaRef, toMediaRef, fromMediaRef } from "./mediaStore";

describe("isMediaRef / toMediaRef / fromMediaRef", () => {
  it("toMediaRef bir id'yi idb: önekiyle sarar", () => {
    expect(toMediaRef("abc-123")).toBe("idb:abc-123");
  });

  it("isMediaRef idb: ile başlayan bir string'i tanır", () => {
    expect(isMediaRef("idb:abc-123")).toBe(true);
  });

  it("isMediaRef normal bir URL için false döner", () => {
    expect(isMediaRef("https://images.unsplash.com/photo.jpg")).toBe(false);
  });

  it("isMediaRef string olmayan değerler için false döner (throw etmez)", () => {
    expect(isMediaRef(null)).toBe(false);
    expect(isMediaRef(undefined)).toBe(false);
    expect(isMediaRef(123)).toBe(false);
    expect(isMediaRef({})).toBe(false);
  });

  it("fromMediaRef önekini kaldırıp ham id'yi döner", () => {
    expect(fromMediaRef("idb:abc-123")).toBe("abc-123");
  });

  it("toMediaRef + fromMediaRef gidip gelince aynı id'yi verir", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(fromMediaRef(toMediaRef(id))).toBe(id);
  });
});
