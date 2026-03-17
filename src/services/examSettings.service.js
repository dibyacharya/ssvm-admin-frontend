import api from "./api";

export const getAllSettings = async (params = {}) => {
  const res = await api.get("/exam-settings", { params });
  return res.data;
};

export const getSetting = async (key) => {
  const res = await api.get(`/exam-settings/${key}`);
  return res.data;
};

export const updateSetting = async (key, data) => {
  const res = await api.put(`/exam-settings/${key}`, data);
  return res.data;
};

export const createSetting = async (data) => {
  const res = await api.post("/exam-settings", data);
  return res.data;
};

export const resetToDefaults = async () => {
  const res = await api.post("/exam-settings/reset");
  return res.data;
};

export const deleteSetting = async (key) => {
  const res = await api.delete(`/exam-settings/${key}`);
  return res.data;
};
