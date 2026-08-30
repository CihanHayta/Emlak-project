// server/src/services/customer.postgres.service.js
// customer.service.js'in (Firestore) PostgreSQL karşılığı — birebir aynı iş
// kuralları, sadece customerRepository → customerPostgresRepository.
import { customerPostgresRepository } from "../repositories/customer.postgres.repository.js";
import { createDefaultCustomer } from "../models/customer.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { ApiError } from "../utils/ApiError.js";

export async function listCustomers(context) {
  return customerPostgresRepository.findAll(context);
}

export async function getCustomer(context, id) {
  const customer = await customerPostgresRepository.findById(context, id);
  if (!customer) throw ApiError.notFound("Müşteri bulunamadı.");
  return customer;
}

// `sellingListingId` artık GERÇEK foreign key (Firestore'da yoktu) —
// appointment.postgres.service.js#normalizeReferenceFields ile AYNI gerekçe:
// bir <select>'in "seçim yok" boş string'i FK ihlali yerine NULL'a düşmeli.
function normalizeReferenceFields(data) {
  const copy = { ...data };
  if (copy.sellingListingId === "") copy.sellingListingId = null;
  return copy;
}

export async function createCustomer(context, data) {
  return customerPostgresRepository.create(context, normalizeReferenceFields(createDefaultCustomer(data)));
}

export async function updateCustomer(context, id, updates) {
  return customerPostgresRepository.update(
    context,
    id,
    withUpdateFields(normalizeReferenceFields(updates), { actorUserId: context.userId }),
  );
}

export async function addTimelineEntry(context, id, label) {
  const customer = await getCustomer(context, id);
  const timeline = [...(customer.timeline ?? []), { id: crypto.randomUUID(), label, at: Date.now() }];
  return updateCustomer(context, id, { timeline });
}

export async function deleteCustomer(context, id) {
  return customerPostgresRepository.softDelete(context, id);
}
