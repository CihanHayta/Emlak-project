// server/src/repositories/property.postgres.repository.js
//
// property.repository.js'in (Firestore) PostgreSQL karşılığı — AYNI şekilde
// hiçbir ekstra metod eklemeden BasePostgresRepository'yi genişletiyor,
// çünkü Firestore versiyonu da tam olarak böyle (bkz. property.repository.js,
// sadece `super("properties")`). `images`/`image`/`videoUrl` gibi
// property.model.js alanları burada YOK — bunlar migrations/tenant/
// ...properties-tables.js'te ayrı bir `property_media` tablosuna
// ayrıştırıldı (bkz. propertyMedia.postgres.repository.js), `amenities`
// ise gerçek bir Postgres TEXT[] sütunu (JSONB DEĞİL, ekstra serileştirme
// gerekmiyor).
import { BasePostgresRepository } from "./base.postgres.repository.js";

class PropertyPostgresRepository extends BasePostgresRepository {
  constructor() {
    super("properties");
  }
}

export const propertyPostgresRepository = new PropertyPostgresRepository();
