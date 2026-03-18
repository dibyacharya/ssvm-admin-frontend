import api from "./api";

// Fee Config
export const getAllFeeConfigs = async () => {
  const res = await api.get("/certificate-applications/fee-config");
  return res.data;
};

export const updateFeeConfig = async (type, data) => {
  const res = await api.put(`/certificate-applications/fee-config/${type}`, data);
  return res.data;
};

// Applications
export const getAllApplications = async (params = {}) => {
  const res = await api.get("/certificate-applications", { params });
  return res.data;
};

export const getApplication = async (id) => {
  const res = await api.get(`/certificate-applications/${id}`);
  return res.data;
};

export const reviewApplication = async (id, data) => {
  const res = await api.put(`/certificate-applications/${id}/review`, data);
  return res.data;
};

export const assignApplication = async (id, assignedTo) => {
  const res = await api.put(`/certificate-applications/${id}/assign`, { assignedTo });
  return res.data;
};

export const getApplicationStats = async () => {
  const res = await api.get("/certificate-applications/stats");
  return res.data;
};
