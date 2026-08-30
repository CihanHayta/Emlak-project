// server/src/routes/vehicleMedia.routes.js
//
// vehicleRouter (Firestore, vehicle.routes.js) ile AYNI `/vehicles` önekine
// AYRI bir router olarak mount edilir (bkz. routes/index.js) — sadece
// `/:vehicleId/media*` alt-yollarını tanımlıyor, vehicleRouter'ın `/`, `/:id`
// route'larıyla ÇAKIŞMIYOR (Express path pattern'leri farklı segment
// sayısında, ikisi birden aynı prefix'te sorunsuz yaşar).
//
// `uploads:write` — upload.routes.js'teki (Firebase dönemi) AYNI izin,
// mevcut rol/izin sistemine (assistant dahil, bkz. permissions.js) hiç
// dokunmadan aynen devralındı.
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createUploadIntentValidator,
  confirmUploadValidator,
  reorderMediaValidator,
  setCoverMediaValidator,
} from "../validators/media.validator.js";
import * as mediaController from "../controllers/vehicleMedia.controller.js";

export const vehicleMediaRouter = Router();
vehicleMediaRouter.use(authMiddleware, tenantMiddleware);

vehicleMediaRouter.get("/:vehicleId/media", authorize("vehicles:read"), mediaController.listVehicleMediaController);
vehicleMediaRouter.post(
  "/:vehicleId/media/upload-intent",
  authorize("uploads:write"),
  createUploadIntentValidator,
  validate,
  mediaController.createUploadIntentController,
);
vehicleMediaRouter.post(
  "/:vehicleId/media/confirm",
  authorize("uploads:write"),
  confirmUploadValidator,
  validate,
  mediaController.confirmUploadController,
);
vehicleMediaRouter.post(
  "/:vehicleId/media/cover",
  authorize("uploads:write"),
  setCoverMediaValidator,
  validate,
  mediaController.setCoverController,
);
vehicleMediaRouter.post(
  "/:vehicleId/media/reorder",
  authorize("uploads:write"),
  reorderMediaValidator,
  validate,
  mediaController.reorderController,
);
vehicleMediaRouter.delete("/:vehicleId/media/:mediaId", authorize("uploads:write"), mediaController.deleteMediaController);
