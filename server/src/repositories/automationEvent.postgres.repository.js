// server/src/repositories/automationEvent.postgres.repository.js
import { BasePostgresRepository } from "./base.postgres.repository.js";

class AutomationEventPostgresRepository extends BasePostgresRepository {
  constructor() {
    super("automation_events");
  }
}

export const automationEventPostgresRepository = new AutomationEventPostgresRepository();
