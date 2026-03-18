import api from "./api";

const BASE = "/exams/certificates/templates";

export const getAllTemplates = async (params = {}) => {
  const res = await api.get(BASE, { params });
  return res.data;
};

export const getTemplate = async (id) => {
  const res = await api.get(`${BASE}/${id}`);
  return res.data;
};

export const createTemplate = async (data) => {
  const res = await api.post(BASE, data);
  return res.data;
};

export const updateTemplate = async (id, data) => {
  const res = await api.put(`${BASE}/${id}`, data);
  return res.data;
};

export const deleteTemplate = async (id) => {
  const res = await api.delete(`${BASE}/${id}`);
  return res.data;
};

export const uploadLetterhead = async (id, data) => {
  const res = await api.post(`${BASE}/${id}/upload-letterhead`, data);
  return res.data;
};

export const previewTemplate = async (id, withLetterhead = true) => {
  const res = await api.get(`${BASE}/${id}/preview`, {
    params: { withLetterhead },
    responseType: "blob",
  });
  return res.data;
};
