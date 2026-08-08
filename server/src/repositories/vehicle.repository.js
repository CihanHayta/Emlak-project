// server/src/repositories/vehicle.repository.js
import { BaseRepository } from "./base.repository.js";

class VehicleRepository extends BaseRepository {
  constructor() {
    super("vehicles");
  }
}

export const vehicleRepository = new VehicleRepository();
