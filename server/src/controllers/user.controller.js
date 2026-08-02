// server/src/controllers/user.controller.js
import { listTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember } from "../services/user.service.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export async function listTeamMembersController(req, res) {
  const users = await listTeamMembers(req.context);
  sendSuccess(res, { data: users });
}

export async function createTeamMemberController(req, res) {
  const { email, password, displayName, role } = req.body;
  if (!email) throw ApiError.validation("E-posta zorunlu.");
  if (!password) throw ApiError.validation("Şifre zorunlu.");
  if (!role) throw ApiError.validation("Rol zorunlu.");

  const created = await createTeamMember(req.context, { email, password, displayName, role });
  sendSuccess(res, { data: created, status: 201 });
}

export async function updateTeamMemberController(req, res) {
  const updated = await updateTeamMember(req.context, req.params.id, req.body);
  sendSuccess(res, { data: updated });
}

export async function deleteTeamMemberController(req, res) {
  await deleteTeamMember(req.context, req.params.id);
  sendSuccess(res, { data: { ok: true } });
}
