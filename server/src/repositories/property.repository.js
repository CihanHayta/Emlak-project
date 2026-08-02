// server/src/repositories/property.repository.js
import { BaseRepository } from "./base.repository.js";

class PropertyRepository extends BaseRepository {
  constructor() {
    super("properties");
  }
}

export const propertyRepository = new PropertyRepository();
