import api from "./api";

// ── Paper Formats ──

export const getAllPaperFormats = async (params = {}) => {
  const res = await api.get("/exam-paper-format", { params });
  return res.data;
};

export const getPaperFormat = async (id) => {
  const res = await api.get(`/exam-paper-format/${id}`);
  return res.data;
};

export const createPaperFormat = async (data) => {
  const res = await api.post("/exam-paper-format", data);
  return res.data;
};

export const updatePaperFormat = async (id, data) => {
  const res = await api.put(`/exam-paper-format/${id}`, data);
  return res.data;
};

export const approvePaperFormat = async (id) => {
  const res = await api.put(`/exam-paper-format/${id}/approve`);
  return res.data;
};

export const deletePaperFormat = async (id) => {
  const res = await api.delete(`/exam-paper-format/${id}`);
  return res.data;
};

export const clonePaperFormat = async (id, data) => {
  const res = await api.post(`/exam-paper-format/${id}/clone`, data);
  return res.data;
};
