// server/tests/leadResponseAlerts.job.test.js
import { jest } from "@jest/globals";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";
import { createDefaultTenant } from "../src/models/tenant.model.js";
import { createDefaultCustomer } from "../src/models/customer.model.js";
import * as tenantRepo from "../src/repositories/tenant.repository.js";
import { customerRepository } from "../src/repositories/customer.repository.js";
import { automationEventRepository } from "../src/repositories/automationEvent.repository.js";
import { checkAllTenants } from "../src/jobs/leadResponseAlerts.job.js";

async function makeTenant(leadResponseAlertOverride) {
  const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Test Ofis", slug: `ofis-${Date.now()}-${Math.random()}`, ownerUserId: "owner1" }));
  const automations = { ...tenant.automations, leadResponseAlert: leadResponseAlertOverride };
  const firebase = { projectId: "mock", clientEmail: "mock", storageBucket: "mock", encryptedPrivateKey: "mock" };
  await tenantRepo.updateTenant(tenant.id, { automations, firebase });
  return { ...tenant, automations, firebase };
}

describe("leadResponseAlerts.job — checkAllTenants", () => {
  beforeEach(() => resetMockFirestore());
  afterEach(() => jest.restoreAllMocks());

  it("otomasyonu açık olan tenant için eşiği geçmiş, hâlâ 'Yeni' durumdaki bir müşteriyi yakalar", async () => {
    const tenant = await makeTenant({ enabled: true, minutesThreshold: 10 });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", source: "Web Sitesi" }));
    await customerRepository.update(context, customer.id, { createdAt: new Date(Date.now() - 15 * 60 * 1000) });

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(1);
  });

  it("otomasyonu kapalı olan tenant'ları atlar", async () => {
    const tenant = await makeTenant({ enabled: false, minutesThreshold: 10 });
    const context = { tenantId: tenant.id, userId: null, role: "system" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67", source: "Web Sitesi" }));
    await customerRepository.update(context, customer.id, { createdAt: new Date(Date.now() - 15 * 60 * 1000) });

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });
});
