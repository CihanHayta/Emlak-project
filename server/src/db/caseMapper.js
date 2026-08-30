// server/src/db/caseMapper.js
//
// Aşama 2 tasarımının kararı: SQL sütunları snake_case (Postgres'in kendi
// quoting tuzağını önlemek için — bkz. tırnaksız tanımlanan bir sütun adı
// otomatik küçük harfe çevrilir, mixed-case bir sütun her sorguda tırnak
// gerektirir), ama modeller (property.model.js vb.) ve JS'in geri kalanı
// camelCase. Bu, ikisi arasındaki TEK, küçük çeviri katmanı — sadece üst
// düzey anahtarları çevirir, iç içe JSONB gövdelerine (ör. customers.timeline
// içindeki {id,label,at}) DOKUNMAZ, onlar zaten camelCase olarak saklanıp
// öyle geri okunuyor (JSONB'nin kendi alanları birer SQL sütunu değil).
export function camelToSnake(key) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(key) {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function toSnakeCaseRow(obj) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [camelToSnake(key), value]));
}

export function toCamelCaseRow(row) {
  if (!row) return row;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [snakeToCamel(key), value]));
}
