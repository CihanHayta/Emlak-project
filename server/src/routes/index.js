// server/src/routes/index.js
import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { uploadRouter } from "./upload.routes.js";
import { authRouter } from "./auth.routes.js";
import { customerRouter } from "./customer.routes.js";
import { leadRouter } from "./lead.routes.js";
import { publicLeadRouter } from "./publicLead.routes.js";
import { appointmentRouter } from "./appointment.routes.js";
import { userRouter } from "./user.routes.js";
import { propertyRouter } from "./property.routes.js";
import { publicPropertyRouter } from "./publicProperty.routes.js";

// Not: webhook route'ları (Faz 6) BİLEREK burada değil, app.js'te
// express.json()'dan ÖNCE bağlanır — çünkü Meta imza doğrulaması ham
// (raw) body üzerinde çalışır, JSON'a parse edilmiş body üzerinde değil.
export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/uploads", uploadRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/customers", customerRouter);
apiRouter.use("/leads", leadRouter);
apiRouter.use("/public/leads", publicLeadRouter);
apiRouter.use("/appointments", appointmentRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/properties", propertyRouter);
apiRouter.use("/public/properties", publicPropertyRouter);
