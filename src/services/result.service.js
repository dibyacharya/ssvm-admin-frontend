import api from "./api";

// ── Result Compilation ──

export const compileResults = async (data) => {
  const res = await api.post("/results/compile", data);
  return res.data;
};

export const getAllResults = async (params = {}) => {
  const res = await api.get("/results", { params });
  return res.data;
};

export const getResultById = async (id) => {
  const res = await api.get(`/results/${id}`);
  return res.data;
};

export const updateResultStatus = async (id, data) => {
  const res = await api.put(`/results/${id}/status`, data);
  return res.data;
};

export const bulkApproveResults = async (semesterId) => {
  const res = await api.post(`/results/bulk-approve/${semesterId}`);
  return res.data;
};

export const bulkPublishResults = async (semesterId) => {
  const res = await api.post(`/results/bulk-publish/${semesterId}`);
  return res.data;
};

export const getResultAnalytics = async (semesterId, params = {}) => {
  const res = await api.get(`/results/analytics/${semesterId}`, { params });
  return res.data;
};
