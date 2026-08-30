// server/src/repositories/vehicle.postgres.repository.js
//
// vehicle.repository.js'in (Firestore) PostgreSQL karşılığı. `parts_status`
// ([{part,status}]) ve `history` ([{date,km,action,description}]) JSONB
// sütunlar — vehicle.model.js'in kendi yorumu bunların serbest biçimli
// olduğunu, ayrı bir tabloya çıkarmanın gerekmediğini söylüyor (bkz.
// migrations/tenant/..._create-vehicles-tables.js). `equipment` gerçek
// TEXT[]. Medya (images/videoUrl/documents/expertiseReportUrl) properties
// ile aynı desende `vehicle_media` tablosuna ayrıştı — bu domain'in medya
// deposu (vehicleMedia.postgres.repository.js) vehicles'ın kendisi
// Aşama 3'ün bu turunda ele alınmadığı için henüz YAZILMADI, sadece CRUD
// repository'si hazırlandı (bkz. Aşama 3 raporu, "sıradaki adım" notu).
import { BasePostgresRepository } from "./base.postgres.repository.js";

class VehiclePostgresRepository extends BasePostgresRepository {
  constructor() {
    super("vehicles", { jsonbColumns: ["partsStatus", "history"] });
  }
}

export const vehiclePostgresRepository = new VehiclePostgresRepository();
