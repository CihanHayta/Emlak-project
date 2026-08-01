// server/src/utils/asyncHandler.js

/**
 * async route handler'ları sarar, fırlatılan/reject olan hatayı `next(err)`'e
 * yönlendirir. `express-async-errors` zaten Express 4'ün router'ını bu işi
 * otomatik yapacak şekilde yamalıyor (app.js'in en başında import edilir) —
 * bu sarmalayıcı ona rağmen açıkça kullanılabilir, controller'ı okuyan
 * birinin "hata nereye gidiyor" diye express-async-errors'ın iç yamasını
 * bilmesine gerek bırakmaz.
 */
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
