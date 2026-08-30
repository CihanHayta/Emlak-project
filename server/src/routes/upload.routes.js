// server/src/routes/upload.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { uploadMiddleware } from "../middleware/upload.middleware.js";
import { uploadImage, uploadVideo, uploadDocument } from "../controllers/upload.controller.js";

export const uploadRouter = Router();
uploadRouter.use(authMiddleware, tenantMiddleware, authorize("uploads:write"));

uploadRouter.post("/image", uploadMiddleware("image", "file"), uploadImage);
uploadRouter.post("/video", uploadMiddleware("video", "file"), uploadVideo);
uploadRouter.post("/document", uploadMiddleware("document", "file"), uploadDocument);
