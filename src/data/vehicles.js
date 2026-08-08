/**
 * Public-site vehicles — data/properties.js ile birebir aynı desen, sadece
 * "/public/vehicles" uç noktasını kullanır. bkz. o dosyanın yorumu.
 */
import { apiClient } from "../lib/apiClient";

const TENANT_ID = import.meta.env.VITE_TENANT_ID;

let cache = [];
let loadPromise = null;
const listeners = new Set();

function notify() {
  listeners.forEach((callback) => callback());
}

async function refresh() {
  if (!TENANT_ID) {
    console.error("VITE_TENANT_ID tanımlı değil — .env dosyasını kontrol edin.");
    cache = [];
    notify();
    return;
  }
  try {
    cache = await apiClient.get(`/public/vehicles?tenantId=${TENANT_ID}`);
  } catch (error) {
    console.error("Araçlar yüklenemedi:", error);
    cache = [];
  }
  notify();
}

function ensureLoaded() {
  if (!loadPromise) loadPromise = refresh();
  return loadPromise;
}

export function subscribeToVehicles(callback) {
  listeners.add(callback);
  ensureLoaded();
  return () => listeners.delete(callback);
}

/** Tüm araçlar, kategori gözetmeksizin. */
export function getAllVehicles() {
  ensureLoaded();
  return cache;
}

export function getSaleVehicles() {
  ensureLoaded();
  return cache.filter((v) => v.category === "satilik");
}

export function getRentVehicles() {
  ensureLoaded();
  return cache.filter((v) => v.category === "kiralik");
}

export function getVehicleById(id) {
  ensureLoaded();
  return cache.find((v) => v.id === id) ?? null;
}

/** "Benzer Araçlar" — aynı kategori (satılık/kiralık), önce aynı marka, sonra geri kalanı. */
export function getSimilarVehicles(vehicle, limit = 8) {
  ensureLoaded();
  const others = cache.filter((v) => v.id !== vehicle.id && v.category === vehicle.category);
  const sameBrand = others.filter((v) => v.brand === vehicle.brand);
  const otherBrand = others.filter((v) => v.brand !== vehicle.brand);
  return [...sameBrand, ...otherBrand].slice(0, limit);
}
