// server/src/utils/pagination.js
import { PAGINATION } from "../config/constants.js";

/**
 * Liste endpoint'lerinin ortak `?page=&limit=` sözleşmesini query'den okur.
 * Geçersiz/eksik değerlerde hata fırlatmak yerine makul varsayılana düşer —
 * sayfalama bir güvenlik sınırı değil, kullanıcı kolaylığıdır.
 */
export function parsePageParams(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const rawLimit = Number.parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, rawLimit), PAGINATION.MAX_LIMIT);
  return { page, limit, offset: (page - 1) * limit };
}

export function buildMeta({ page, limit, total }) {
  return { page, limit, total, hasNext: page * limit < total };
}
