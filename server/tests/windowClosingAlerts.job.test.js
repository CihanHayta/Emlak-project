// server/tests/windowClosingAlerts.job.test.js
import dayjs from "dayjs";
import { toIstanbul } from "../src/utils/date.js"; // side effect: dayjs utc/timezone eklentilerini kaydeder
import { jest } from "@jest/globals";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";
import { createDefaultTenant } from "../src/models/tenant.model.js";
import { createDefaultConversation } from "../src/models/conversation.model.js";
import * as tenantRepo from "../src/repositories/tenant.repository.js";
import { conversationRepository } from "../src/repositories/conversation.repository.js";
import { automationEventRepository } from "../src/repositories/automationEvent.repository.js";
import { checkAllTenants } from "../src/jobs/windowClosingAlerts.job.js";

void toIstanbul;
const WEDNESDAY_NOON_ISTANBUL = dayjs.tz("2026-08-12 12:00", "Europe/Istanbul").valueOf();

async function makeTenant(windowClosingAlertOverride) {
  const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Test Ofis", slug: `ofis-${Date.now()}-${Math.random()}`, ownerUserId: "owner1" }));
  const automations = { ...tenant.automations, windowClosingAlert: windowClosingAlertOverride };
  const firebase = { projectId: "mock", clientEmail: "mock", storageBucket: "mock", encryptedPrivateKey: "mock" };
  await tenantRepo.updateTenant(tenant.id, { automations, firebase });
  return { ...tenant, automations, firebase };
}

describe("windowClosingAlerts.job — checkAllTenants", () => {
  beforeEach(() => resetMockFirestore());
  afterEach(() => jest.restoreAllMocks());

  it("otomasyonu açık olan tenant için cevapsız/kapanmak üzere olan sohbeti yakalar", async () => {
    jest.spyOn(Date, "now").mockReturnValue(WEDNESDAY_NOON_ISTANBUL);
    const tenant = await makeTenant({ enabled: true, hoursBefore: 2 });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    await conversationRepository.create(
      context,
      createDefaultConversation({ channel: "whatsapp", externalUserId: "905551234567", participantName: "Ahmet" }),
    );
    // dokümanı windowExpiresAt/lastMessageDirection ile güncelle (createDefaultConversation zaten inbound + 24h veriyor, sadece süreyi kısaltıyoruz)
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
