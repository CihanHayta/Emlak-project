// server/src/controllers/tenantSettings.controller.js
import { getTenantRolePermissions, setTenantRolePermissions } from "../services/tenant.service.js";
import { PERMISSION_CATALOG, CUSTOMIZABLE_ROLES } from "../config/permissions.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** Ayarlar > Yetkiler sayfasını doldurmak için: şu anki etkin izinler + katalog. */
export async function getRolePermissionsController(req, res) {
  const rolePermissions = await getTenantRolePermissions(req.context.tenantId);
  sendSuccess(res, { data: { rolePermissions, catalog: PERMISSION_CATALOG, roles: CUSTOMIZABLE_ROLES } });
}

export async function updateRolePermissionsController(req, res) {
  await setTenantRolePermissions(req.context.tenantId, req.body.rolePermissions);
  const rolePermissions = await getTenantRolePermissions(req.context.tenantId);
  sendSuccess(res, { data: { rolePermissions } });
}
