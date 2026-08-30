// server/src/routes/publicVehicle.routes.js
//
// Kimlik doğrulaması YOK — publicProperty.routes.js ile birebir aynı desen.
import { Router } from "express";
import { listPublicVehiclesController, getPublicVehicleController } from "../controllers/vehicle.controller.js";

export const publicVehicleRouter = Router();
publicVehicleRouter.get("/", listPublicVehiclesController);
publicVehicleRouter.get("/:id", getPublicVehicleController);
