// server/src/repositories/lead.repository.js
import { BaseRepository } from "./base.repository.js";

class LeadRepository extends BaseRepository {
  constructor() {
    super("leads");
  }
}

export const leadRepository = new LeadRepository();
