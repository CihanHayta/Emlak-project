// server/src/repositories/automationEvent.repository.js
import { BaseRepository } from "./base.repository.js";

class AutomationEventRepository extends BaseRepository {
  constructor() {
    super("automationEvents");
  }
}

export const automationEventRepository = new AutomationEventRepository();
