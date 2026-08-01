// server/src/repositories/appointment.repository.js
import { BaseRepository } from "./base.repository.js";

class AppointmentRepository extends BaseRepository {
  constructor() {
    super("appointments");
  }
}

export const appointmentRepository = new AppointmentRepository();
