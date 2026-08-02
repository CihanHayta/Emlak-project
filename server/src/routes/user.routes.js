// server/src/routes/user.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as userController from "../controllers/user.controller.js";

export const userRouter = Router();
userRouter.use(authMiddleware, tenantMiddleware);

// "users:*" bilerek sadece owner/admin'in taban izin kümesinde ("*") var —
// agent/assistant/viewer listelerine hiç eklenmedi, bu yüzden authorize()
// onlar için otomatik olarak reddeder (bkz. authorize.middleware.js).
userRouter.get("/", authorize("users:read"), userController.listTeamMembersController);
userRouter.post("/", authorize("users:write"), userController.createTeamMemberController);
userRouter.patch("/:id", authorize("users:write"), userController.updateTeamMemberController);
userRouter.delete("/:id", authorize("users:write"), userController.deleteTeamMemberController);
