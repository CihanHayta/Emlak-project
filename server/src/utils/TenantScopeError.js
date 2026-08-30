// server/src/utils/TenantScopeError.js

/**
 * BaseRepository'nin fırlattığı tek hata türü: tenantId olmadan (ya da başka
 * bir tenant'ın kaydına) erişilmeye çalışıldığında. Bu HİÇBİR ZAMAN normal
 * bir kullanıcı hatası değildir — kodda bir yerin context'i unuttuğu/yanlış
 * geçtiği anlamına gelir, bu yüzden ApiError'dan ayrı: error.middleware.js
 * bunu 500/INTERNAL_ERROR'a düşürür ve tam mesajı sadece sunucu logunda
 * görünür (istemciye "beklenmeyen hata" dışında bir şey sızmaz).
 */
export class TenantScopeError extends Error {
  constructor(message) {
    super(message);
    this.name = "TenantScopeError";
  }
}
