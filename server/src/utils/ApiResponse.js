// server/src/utils/ApiResponse.js

/**
 * Tüm başarılı yanıtların ortak zarfı: { success:true, data, meta? }.
 * `meta` sadece sayfalı liste endpoint'lerinde gönderilir (bkz. pagination.js).
 */
export function sendSuccess(res, { data, meta, status = 200 }) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}
