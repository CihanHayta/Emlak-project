// server/src/routes/vehicle.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createVehicleValidator, updateVehicleValidator } from "../validators/vehicle.validator.js";
import * as vehicleController from "../controllers/vehicle.controller.js";

export const vehicleRouter = Router();
vehicleRouter.use(authMiddleware, tenantMiddleware);

vehicleRouter.get("/", authorize("vehicles:read"), vehicleController.listVehiclesController);
vehicleRouter.post("/", authorize("vehicles:write"), createVehicleValidator, validate, vehicleController.createVehicleController);
vehicleRouter.get("/:id", authorize("vehicles:read"), vehicleController.getVehicleController);
vehicleRouter.patch("/:id", authorize("vehicles:write"), updateVehicleValidator, validate, vehicleController.updateVehicleController);
vehicleRouter.delete("/:id", authorize("vehicles:write"), vehicleController.deleteVehicleController);
