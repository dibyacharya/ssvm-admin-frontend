import api from "./api";

export const getAllCategories = async (params = {}) => {
  const response = await api.get("/helpdesk-config", { params });
  return response.data;
};

export const getCategory = async (id) => {
  const response = await api.get(`/helpdesk-config/${id}`);
  return response.data;
};

export const createCategory = async (data) => {
  const response = await api.post("/helpdesk-config", data);
  return response.data;
};

export const updateCategory = async (id, data) => {
  const response = await api.put(`/helpdesk-config/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`/helpdesk-config/${id}`);
  return response.data;
};

export const reorderCategories = async (orderedIds) => {
  const response = await api.put("/helpdesk-config/reorder", { orderedIds });
  return response.data;
};

export const getAvailableRoles = async () => {
  const response = await api.get("/helpdesk-config/roles");
  return response.data;
};

export const getEscalationLevels = async () => {
  const response = await api.get("/helpdesk-config/levels");
  return response.data;
};

export const seedDefaults = async () => {
  const response = await api.post("/helpdesk-config/seed");
  return response.data;
};
