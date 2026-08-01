// server/src/controllers/appointment.controller.js
import * as appointmentService from "../services/appointment.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";

export async function listAppointmentsController(req, res) {
  const appointments = await appointmentService.listAppointments(req.context);
  sendSuccess(res, { data: appointments });
}

export async function createAppointmentController(req, res) {
  const appointment = await appointmentService.createAppointment(req.context, req.body);
  sendSuccess(res, { data: appointment, status: 201 });
}

export async function updateAppointmentController(req, res) {
  const appointment = await appointmentService.updateAppointment(req.context, req.params.id, req.body);
  sendSuccess(res, { data: appointment });
}

export async function deleteAppointmentController(req, res) {
  await appointmentService.deleteAppointment(req.context, req.params.id);
  sendSuccess(res, { data: { ok: true } });
}
