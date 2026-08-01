// server/src/controllers/customer.controller.js
import * as customerService from "../services/customer.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";

export async function listCustomersController(req, res) {
  const customers = await customerService.listCustomers(req.context);
  sendSuccess(res, { data: customers });
}

export async function getCustomerController(req, res) {
  const customer = await customerService.getCustomer(req.context, req.params.id);
  sendSuccess(res, { data: customer });
}

export async function createCustomerController(req, res) {
  const customer = await customerService.createCustomer(req.context, req.body);
  sendSuccess(res, { data: customer, status: 201 });
}

export async function updateCustomerController(req, res) {
  const customer = await customerService.updateCustomer(req.context, req.params.id, req.body);
  sendSuccess(res, { data: customer });
}

export async function addTimelineEntryController(req, res) {
  const customer = await customerService.addTimelineEntry(req.context, req.params.id, req.body.label);
  sendSuccess(res, { data: customer });
}

export async function deleteCustomerController(req, res) {
  await customerService.deleteCustomer(req.context, req.params.id);
  sendSuccess(res, { data: { ok: true } });
}
