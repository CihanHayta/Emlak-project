// server/src/routes/health.routes.js
import { Router } from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { env } from "../config/env.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { getPool } from "../db/pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  sendSuccess(res, { data: { status: "ok", uptimeSeconds: Math.round(process.uptime()), version } });
});

// Gerçek bir Postgres sorgusu deneyerek "veritabanına gerçekten bağlanabiliyor
// muyum" diye doğrular — sadece hangi modda çalıştığını raporlamaktan farklı
// olarak, DB düşükse bu uç 503 döner (Railway/health-check'lerin bunu
// yakalayabilmesi için).
healthRouter.get("/ready", async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.query("SELECT 1");
  } catch (error) {
    return res.status(503).json({
      success: false,
      data: { status: "error", firebaseMode: env.firebaseMode, integrationsMode: env.integrationsMode, error: error.message },
    });
  }
  sendSuccess(res, {
    data: {
      status: "ok",
      firebaseMode: env.firebaseMode,
      integrationsMode: env.integrationsMode,
    },
  });
});
