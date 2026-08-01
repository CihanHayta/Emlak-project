// server/src/services/customer.service.js
import { customerRepository } from "../repositories/customer.repository.js";
import { createDefaultCustomer } from "../models/customer.model.js";
import { withUpdateFields } from "../models/base.model.js";
import { ApiError } from "../utils/ApiError.js";

export async function listCustomers(context) {
  return customerRepository.findAll(context);
}

export async function getCustomer(context, id) {
  const customer = await customerRepository.findById(context, id);
  if (!customer) throw ApiError.notFound("Müşteri bulunamadı.");
  return customer;
}

export async function createCustomer(context, data) {
  return customerRepository.create(context, createDefaultCustomer(data));
}

export async function updateCustomer(context, id, updates) {
  return customerRepository.update(context, id, withUpdateFields(updates, { actorUserId: context.userId }));
}

export async function addTimelineEntry(context, id, label) {
  const customer = await getCustomer(context, id);
  const timeline = [...(customer.timeline ?? []), { id: crypto.randomUUID(), label, at: Date.now() }];
  return updateCustomer(context, id, { timeline });
}

export async function deleteCustomer(context, id) {
  return customerRepository.softDelete(context, id);
}
