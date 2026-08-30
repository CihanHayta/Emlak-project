import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Ayrı bir dosya (vite.config.js'i DEĞİŞTİRMİYOR) — sadece saf mantık
// (lib/store fonksiyonları) test ediliyor, bileşen/DOM testi yok, bu yüzden
// jsdom gibi bir environment gerekmiyor (varsayılan "node" yeterli ve hızlı).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.js"],
  },
});
