import api from "./api";

export const listRoles = async () => {
  const response = await api.get("/admin/rbac/roles");
  return response.data;
};

export const createRole = async (payload) => {
  const response = await api.post("/admin/rbac/roles", payload);
  return response.data;
};

export const deleteRole = async (roleId) => {
  const response = await api.delete(`/admin/rbac/roles/${roleId}`);
  return response.data;
};

export const getRoleFeatures = async () => {
  const response = await api.get("/admin/rbac/features");
  return response.data;
};

export const actAsRolePreview = async (roleKey) => {
  const response = await api.post("/auth/act-as-role", { roleKey });
  return response.data;
};

export const clearActAsRolePreview = async () => {
  const response = await api.post("/auth/clear-act-as");
  return response.data;
};
