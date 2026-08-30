// server/src/repositories/lead.postgres.repository.js
import { BasePostgresRepository } from "./base.postgres.repository.js";

class LeadPostgresRepository extends BasePostgresRepository {
  constructor() {
    super("leads");
  }
}

export const leadPostgresRepository = new LeadPostgresRepository();
