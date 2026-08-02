// server/src/routes/conversation.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as conversationController from "../controllers/conversation.controller.js";

export const conversationRouter = Router();
conversationRouter.use(authMiddleware, tenantMiddleware);

conversationRouter.get("/", authorize("conversations:read"), conversationController.listConversationsController);
conversationRouter.get("/:id", authorize("conversations:read"), conversationController.getConversationController);
conversationRouter.patch("/:id/customer", authorize("conversations:write"), conversationController.linkConversationCustomerController);
conversationRouter.post("/:id/read", authorize("conversations:write"), conversationController.markConversationReadController);
conversationRouter.get("/:conversationId/messages", authorize("conversations:read"), conversationController.listMessagesController);
conversationRouter.post("/:conversationId/messages", authorize("conversations:write"), conversationController.sendMessageController);
