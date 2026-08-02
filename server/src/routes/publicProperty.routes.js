// server/src/routes/publicProperty.routes.js
//
// Kimlik doğrulaması YOK — public site'ın ilan listeleme/detay sayfaları
// buradan okur (bkz. publicLead.routes.js'teki aynı desen).
import { Router } from "express";
import { listPublicPropertiesController, getPublicPropertyController } from "../controllers/property.controller.js";

export const publicPropertyRouter = Router();
publicPropertyRouter.get("/", listPublicPropertiesController);
publicPropertyRouter.get("/:id", getPublicPropertyController);
