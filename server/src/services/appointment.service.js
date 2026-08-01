// server/src/services/appointment.service.js
import { appointmentRepository } from "../repositories/appointment.repository.js";
import { createDefaultAppointment } from "../models/appointment.model.js";
import { withUpdateFields } from "../models/base.model.js";

export async function listAppointments(context) {
  return appointmentRepository.findAll(context);
}

export async function createAppointment(context, data) {
  return appointmentRepository.create(context, createDefaultAppointment(data));
}

export async function updateAppointment(context, id, updates) {
  return appointmentRepository.update(context, id, withUpdateFields(updates, { actorUserId: context.userId }));
}

/** Soft delete (deletedAt) — aynı customers/leads deseni: listeden kalıcı olarak
 * kaybolur ama kayıt denetim/kurtarma için Firestore'da kalır. */
export async function deleteAppointment(context, id) {
  return appointmentRepository.softDelete(context, id);
}
