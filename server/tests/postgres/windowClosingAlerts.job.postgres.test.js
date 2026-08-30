// server/tests/postgres/windowClosingAlerts.job.postgres.test.js
// tests/windowClosingAlerts.job.test.js'in AŞAMA 11 karşılığı — conversations
// artık Postgres'te. AŞAMA (File Store kaldırma): tenant fixture'ları da artık Postgres.
import { jest } from "@jest/globals";
import dayjs from "dayjs";
import { toIstanbul } from "../../src/utils/date.js"; // side effect
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { createDefaultTenant } = await import("../../src/models/tenant.model.js");
const { createDefaultConversation } = await import("../../src/models/conversation.model.js");
const tenantRepo = await import("../../src/repositories/tenant.postgres.repository.js");
const { conversationPostgresRepository: conversationRepository } = await import("../../src/repositories/conversation.postgres.repository.js");
const { automationEventPostgresRepository: automationEventRepository } = await import(
  "../../src/repositories/automationEvent.postgres.repository.js"
);
const { checkAllTenants } = await import("../../src/jobs/windowClosingAlerts.job.js");

void toIstanbul;
const WEDNESDAY_NOON_ISTANBUL = dayjs.tz("2026-08-12 12:00", "Europe/Istanbul").valueOf();

async function makeTenant(windowClosingAlertOverride) {
  const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Test Ofis", slug: `ofis-${Date.now()}-${Math.random()}`, ownerUserId: "owner1" }));
  const automations = { ...tenant.automations, windowClosingAlert: windowClosingAlertOverride };
  await tenantRepo.updateTenant(tenant.id, { automations });
  return { ...tenant, automations };
}

describe("windowClosingAlerts.job (Postgres) — checkAllTenants", () => {
  beforeAll(() => getTestPool());
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(() => closeTestPool());

  it("otomasyonu açık olan tenant için cevapsız/kapanmak üzere olan sohbeti yakalar", async () => {
    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_NOON_ISTANBUL);
    const tenant = await makeTenant({ enabled: true, hoursBefore: 2 });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await conversationRepository.create(
      context,
      createDefaultConversation({ channel: "whatsapp", externalUserId: "905551234567", participantName: "Ahmet" }),
    );
    const [conversation] = await conversationRepository.findAll(context);
    await conversationRepository.update(context, conversation.id, { windowExpiresAt: WEDNESDAY_NOON_ISTANBUL + 60 * 60 * 1000 });

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(1);
  });

  it("otomasyonu kapalı olan tenant'ları atlar", async () => {
    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_NOON_ISTANBUL);
    const tenant = await makeTenant({ enabled: false, hoursBefore: 2 });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await conversationRepository.create(context, createDefaultConversation({ channel: "whatsapp", externalUserId: "905551234567" }));
    const [conversation] = await conversationRepository.findAll(context);
    await conversationRepository.update(context, conversation.id, { windowExpiresAt: WEDNESDAY_NOON_ISTANBUL + 60 * 60 * 1000 });

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });
});
