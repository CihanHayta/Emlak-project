// server/src/middleware/requestId.middleware.js
import { v4 as uuidv4 } from "uuid";

/**
 * Her isteğe bir `X-Request-Id` atar/yayar (istemci zaten göndermişse onu
 * korur — servisler arası iz sürmeyi kolaylaştırır). `error.middleware.js`
 * bunu hata yanıtına ekler, `logger` çağrılarında da elle geçirilebilir.
 */
export function requestIdMiddleware(req, res, next) {
  const incoming = req.get("X-Request-Id");
  req.requestId = incoming && incoming.trim() !== "" ? incoming : uuidv4();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}
