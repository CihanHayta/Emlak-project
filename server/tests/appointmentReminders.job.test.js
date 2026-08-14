// server/tests/appointmentReminders.job.test.js
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";
import { createDefaultTenant } from "../src/models/tenant.model.js";
import { createDefaultCustomer } from "../src/models/customer.model.js";
import { createDefaultAppointment } from "../src/models/appointment.model.js";
import { encryptToken } from "../src/utils/crypto.util.js";
import * as tenantRepo from "../src/repositories/tenant.repository.js";
import { customerRepository } from "../src/repositories/customer.repository.js";
import { appointmentRepository } from "../src/repositories/appointment.repository.js";
import { automationEventRepository } from "../src/repositories/automationEvent.repository.js";
import { checkAllTenants } from "../src/jobs/appointmentReminders.job.js";

async function makeTenant({ hoursBefore = 2 } = {}) {
  const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Test Ofis", slug: `ofis-${Date.now()}-${Math.random()}`, ownerUserId: "owner1" }));
  const automations = {
    ...tenant.automations,
    appointmentReminder: { enabled: true, hoursBefore, templateStatus: "not_submitted", templateName: null, templateMetaId: null },
  };
  const whatsapp = { phoneNumberId: "pn-1", wabaId: "waba-1", accessToken: encryptToken("fake-token"), displayPhoneNumber: "+905550000000" };
  // getTenantsWithFirebaseConnected() (jobs/appointmentReminders.job.js'in
  // tenant'ları bulma yolu) SADECE `tenant.firebase` truthy olan tenant'ları
  // döner (bkz. tenant.repository.js#findTenantsWithFirebaseConnected) —
  // mock modda içeriği önemli değil, sadece var olması yeterli.
  const firebase = { projectId: "mock", clientEmail: "mock", storageBucket: "mock", encryptedPrivateKey: "mock" };
  await tenantRepo.updateTenant(tenant.id, { automations, whatsapp, firebase });
  return { ...tenant, automations, whatsapp, firebase };
}

describe("appointmentReminders.job — checkAllTenants", () => {
  beforeEach(() => resetMockFirestore());

  it("hatırlatma penceresine düşen bir randevu için otomasyon event'i oluşturur ve reminderSentAt'i işaretler", async () => {
    const tenant = await makeTenant({ hoursBefore: 2 });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67" }));
    // Tam olarak "şimdi + 2 saat" — job'ın penceresi [now+2h, now+2h+15dk) olduğu için içeride.
    const appointment = await appointmentRepository.create(context, createDefaultAppointment({ customerId: customer.id, dateTime: Date.now() + 2 * 60 * 60 * 1000 + 60 * 1000 }));

    await checkAllTenants();

    const events = await automationEventRepository.findAll(context);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("appointmentReminder");

    const updatedAppointment = await appointmentRepository.findById(context, appointment.id);
    expect(updatedAppointment.reminderSentAt).not.toBeNull();
  });

  it("aynı randevu için job İKİNCİ kez çalışınca (ör. yeniden başlama) TEKRAR event oluşturmaz (idempotency)", async () => {
    const tenant = await makeTenant({ hoursBefore: 2 });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67" }));
    await appointmentRepository.create(context, createDefaultAppointment({ customerId: customer.id, dateTime: Date.now() + 2 * 60 * 60 * 1000 + 60 * 1000 }));

    await checkAllTenants();
    await checkAllTenants(); // aynı pencereye ikinci kez düşse bile

    expect(await automationEventRepository.findAll(context)).toHaveLength(1);
  });

  it("penceresi henüz gelmemiş bir randevu için hiçbir şey yapmaz", async () => {
    const tenant = await makeTenant({ hoursBefore: 2 });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67" }));
    await appointmentRepository.create(context, createDefaultAppointment({ customerId: customer.id, dateTime: Date.now() + 10 * 60 * 60 * 1000 })); // 10 saat sonra

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });

  it("otomasyon kapalıyken hiçbir tenant için işlem yapmaz", async () => {
    const tenant = await tenantRepo.createTenant(createDefaultTenant({ name: "Kapalı Ofis", slug: `kapali-${Date.now()}`, ownerUserId: "owner1" }));
    // firebase bağlı (tenant bulunuyor) ama automations.appointmentReminder
    // varsayılan olarak enabled:false — asıl test ettiğimiz bu, "tenant hiç
    // bulunamadı" değil.
    await tenantRepo.updateTenant(tenant.id, { firebase: { projectId: "mock", clientEmail: "mock", storageBucket: "mock", encryptedPrivateKey: "mock" } });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67" }));
    await appointmentRepository.create(context, createDefaultAppointment({ customerId: customer.id, dateTime: Date.now() + 2 * 60 * 60 * 1000 }));

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });

  it("iptal edilmiş bir randevu için hatırlatma göndermez", async () => {
    const tenant = await makeTenant({ hoursBefore: 2 });
    const context = { tenantId: tenant.id, userId: "u1", role: "owner" };
    const customer = await customerRepository.create(context, createDefaultCustomer({ name: "Ahmet", phone: "0555 123 45 67" }));
    await appointmentRepository.create(context, createDefaultAppointment({ customerId: customer.id, dateTime: Date.now() + 2 * 60 * 60 * 1000 + 60 * 1000, status: "İptal Edildi" }));

    await checkAllTenants();

    expect(await automationEventRepository.findAll(context)).toHaveLength(0);
  });
});
