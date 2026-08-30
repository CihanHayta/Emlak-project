// server/src/db/typeParsers.js
//
// node-postgres varsayılan olarak BIGINT (OID 20) VE NUMERIC/DECIMAL (OID
// 1700) sütunlarını STRING olarak döner — ikisi de aynı gerekçeyle
// (precision kaybını sessizce önlemek). Bu projede:
//   - BIGINT SADECE epoch-ms zaman damgaları için (appointments.date_time,
//     conversations.*_at, automation_events.sent_at) — Number.MAX_SAFE_INTEGER'a
//     hiç yaklaşmaz, frontend `new Date(x)` ile doğrudan bir JS number bekliyor.
//   - NUMERIC SADECE düz sayısal alanlar için (properties.area, vehicles.km/
//     damage_amount, customers.budget_min/budget_max, property_media/
//     vehicle_media.video_duration_seconds) — PARA/kesin ondalık hassasiyet
//     GEREKTİRMEYEN alanlar (bkz. property.model.js'in "price BİLEREK string"
//     yorumu — asıl parasal gösterim zaten hiç NUMERIC'e girmiyor). Bu
//     parser'ları kaydetmemek bu alanları sessizce string'e çevirir — hata
//     vermez, ama `vehicle.km === 20000` gibi bir eşitlik/karşılaştırma ya da
//     frontend'deki aritmetik sessizce bozulur (canlıda Aşama 3 testleriyle
//     yakalandı: `updated.km` `20000` yerine `"20000"` döndü). Uygulama
//     boot olurken BİR KERE, herhangi bir pool oluşturulmadan ÖNCE
//     çağrılmalı (bkz. pool.js).
import pg from "pg";

const PG_TYPE_INT8 = 20;
const PG_TYPE_NUMERIC = 1700;

let registered = false;

export function registerNumericTypeParsers() {
  if (registered) return;
  pg.types.setTypeParser(PG_TYPE_INT8, (value) => (value === null ? null : Number(value)));
  pg.types.setTypeParser(PG_TYPE_NUMERIC, (value) => (value === null ? null : Number(value)));
  registered = true;
}
