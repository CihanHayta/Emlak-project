// server/src/repositories/appointment.repository.js
import { BaseRepository } from "./base.repository.js";

class AppointmentRepository extends BaseRepository {
  constructor() {
    super("appointments");
  }

  /** Slot çakışma kontrolü için (bkz. appointment.service.js) — `[startMs, endMs)` aralığındaki randevuları döner. */
  async findByDateRange(context, startMs, endMs) {
    const query = await this.scopedQuery(context);
    const snapshot = await query.where("dateTime", ">=", startMs).where("dateTime", "<", endMs).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
}

export const appointmentRepository = new AppointmentRepository();
