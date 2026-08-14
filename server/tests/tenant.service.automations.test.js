// server/tests/tenant.service.automations.test.js
//
// getTenantAutomations/setTenantAutomations'ın DEFAULT_AUTOMATIONS ile
// yaptığı birleştirmenin sadece `automations` alanı TAMAMEN yoksa değil,
// alan VAR ama içinde yeni bir alt-otomasyon anahtarı (ör. windowClosingAlert
// eklendiğinde) eksikse de doğru davrandığını kanıtlıyor. Canlıda yakalanan
// bir regresyon: windowClosingAlert eklendiğinde, automations alanı zaten
// olan (başka bir otomasyonu daha önce açılmış) bir tenant'ta GET bu yeni
// alanı hiç döndürmüyordu — sadece üst seviye `??` bunu yakalayamıyordu.
import { getTenantAutomations, setTenantAutomations } from "../src/services/tenant.service.js";
import { createTenant } from "../src/repositories/tenant.repository.js";
import { createDefaultTenant, DEFAULT_AUTOMATIONS } from "../src/models/tenant.model.js";
import { resetMockFirestore } from "../src/firebase/mock/firestore.mock.js";

describe("tenant.service — getTenantAutomations/setTenantAutomations", () => {
  beforeEach(() => resetMockFirestore());

  it("automations alanı hiç yoksa DEFAULT_AUTOMATIONS'ın tamamını döner", async () => {
    const tenant = await createTenant(createDefaultTenant({ name: "Ofis", slug: `ofis-${Date.now()}`, ownerUserId: "owner1" }));
    expect(await getTenantAutomations(tenant.id)).toEqual(DEFAULT_AUTOMATIONS);
  });

  it("automations VAR ama yeni bir alt-otomasyon anahtarı eksikse, sadece o eksik anahtarı DEFAULT'tan tamamlar (mevcutları ezmez)", async () => {
    const tenant = await createTenant(createDefaultTenant({ name: "Ofis", slug: `ofis-${Date.now()}`, ownerUserId: "owner1" }));
    // windowClosingAlert hiç yokmuş gibi, eski bir tenant'ı simüle et.
    const { windowClosingAlert: _omitted, ...eskiAutomations } = DEFAULT_AUTOMATIONS;
    void _omitted;
    const customizedOffHours = { ...eskiAutomations.offHoursReply, enabled: true };
    await setTenantAutomations(tenant.id, { ...eskiAutomations, offHoursReply: customizedOffHours });

    const result = await getTenantAutomations(tenant.id);
    expect(result.windowClosingAlert).toEqual(DEFAULT_AUTOMATIONS.windowClosingAlert);
    expect(result.offHoursReply.enabled).toBe(true);
  });

  it("setTenantAutomations kısmi bir güncellemeyi (tek alt-otomasyon) diğerlerini bozmadan kaydeder", async () => {
    const tenant = await createTenant(createDefaultTenant({ name: "Ofis", slug: `ofis-${Date.now()}`, ownerUserId: "owner1" }));
    await setTenantAutomations(tenant.id, { listingMatch: { ...DEFAULT_AUTOMATIONS.listingMatch, enabled: true } });

    const result = await getTenantAutomations(tenant.id);
    expect(result.listingMatch.enabled).toBe(true);
    expect(result.appointmentReminder).toEqual(DEFAULT_AUTOMATIONS.appointmentReminder);
    expect(result.windowClosingAlert).toEqual(DEFAULT_AUTOMATIONS.windowClosingAlert);
  });
});
