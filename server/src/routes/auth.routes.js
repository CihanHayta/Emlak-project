// server/src/routes/auth.routes.js
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { authRateLimit } from "../middleware/rateLimit.middleware.js";
import { loginController, getMeController, logoutController } from "../controllers/auth.controller.js";

export const authRouter = Router();

// authRateLimit SADECE /login'e (gerçek şifre-doğrulama denemesi, brute
// force riski burada) uygulanır — /me ve /logout'a değil. /me neredeyse her
// sayfa yüklemesinde/yenilemesinde çağrılır (bkz. admin/lib/auth.js'in
// onAuthStateChanged akışı); geçerli bir session cookie'si zaten şart
// olduğu için brute-force riski taşımaz, aynı sıkı limiti paylaşırsa
// normal kullanımda bile (birkaç kişi aynı ofis IP'sinden, sekmeler
// arasında geçişler) meşru kullanıcılar "çok fazla istek" hatası alır.
authRouter.post("/login", authRateLimit, loginController);
authRouter.get("/me", authMiddleware, tenantMiddleware, getMeController);
authRouter.post("/logout", authMiddleware, logoutController);
