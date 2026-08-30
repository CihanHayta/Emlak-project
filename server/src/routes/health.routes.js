// server/src/routes/health.routes.js
import { Router } from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { env } from "../config/env.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  sendSuccess(res, { data: { status: "ok", uptimeSeconds: Math.round(process.uptime()), version } });
});

// Faz 2'de firebase/firestore.client.js gelince buraya gerçek bir
// "bir doküman okumayı dene" kontrolü eklenecek. Şimdilik sadece
// hangi modda çalıştığını doğrular — mock modda her zaman "ready"dir.
healthRouter.get("/ready", (_req, res) => {
  sendSuccess(res, {
    data: {
      status: "ok",
      firebaseMode: env.firebaseMode,
      integrationsMode: env.integrationsMode,
    },
  });
});
