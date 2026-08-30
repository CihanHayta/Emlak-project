// server/tests/postgres/matching.postgres.test.js
// tests/matching.service.test.js'in I/O'lu tek testi — bkz. o dosyanın
// üstündeki yorum. Saf mantık (findMatchingCustomers) hâlâ orada, npm test'te.
import { jest } from "@jest/globals";
import { getTestPool, truncateAll, closeTestPool } from "./pgTestDb.js";

jest.unstable_mockModule("../../src/db/pool.js", () => ({ getPool: async () => getTestPool() }));

const { getMatchingCustomers } = await import("../../src/services/matching.service.js");
const { customerPostgresRepository } = await import("../../src/repositories/customer.postgres.repository.js");
const { createDefaultCustomer } = await import("../../src/models/customer.model.js");

const context = { tenantId: "test-tenant", userId: "u1", role: "owner" };

describe("matching.service (Postgres) — getMatchingCustomers", () => {
  beforeAll(() => getTestPool());
  beforeEach(() => truncateAll());
  afterAll(() => closeTestPool());

  it("tenant'ın gerçek müşteri listesini okuyup skorlar", async () => {
    await customerPostgresRepository.create(context, createDefaultCustomer({ name: "Eşleşen", interests: ["Daire"] }));
    await customerPostgresRepository.create(context, createDefaultCustomer({ name: "Eşleşmeyen", interests: ["Arsa"] }));

    const listing = { id: "p1", type: "Daire", price: "0 TL" };
    const matches = await getMatchingCustomers(context, listing);

    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe("Eşleşen");
  });
});
