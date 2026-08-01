// server/src/routes/appointment.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as appointmentController from "../controllers/appointment.controller.js";

export const appointmentRouter = Router();
appointmentRouter.use(authMiddleware, tenantMiddleware);

appointmentRouter.get("/", authorize("appointments:read"), appointmentController.listAppointmentsController);
appointmentRouter.post("/", authorize("appointments:write"), appointmentController.createAppointmentController);
appointmentRouter.patch("/:id", authorize("appointments:write"), appointmentController.updateAppointmentController);
appointmentRouter.delete("/:id", authorize("appointments:write"), appointmentController.deleteAppointmentController);
