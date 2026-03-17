import api from "./api";

// ── Registration Periods ──

export const getAllRegistrationPeriods = async (params = {}) => {
  const res = await api.get("/exam-registration/periods", { params });
  return res.data;
};

export const getRegistrationPeriod = async (id) => {
  const res = await api.get(`/exam-registration/periods/${id}`);
  return res.data;
};

export const createRegistrationPeriod = async (data) => {
  const res = await api.post("/exam-registration/periods", data);
  return res.data;
};

export const updateRegistrationPeriod = async (id, data) => {
  const res = await api.put(`/exam-registration/periods/${id}`, data);
  return res.data;
};

export const deleteRegistrationPeriod = async (id) => {
  const res = await api.delete(`/exam-registration/periods/${id}`);
  return res.data;
};

// ── Registrations ──

export const getAllRegistrations = async (params = {}) => {
  const res = await api.get("/exam-registration", { params });
  return res.data;
};

export const getRegistrationById = async (id) => {
  const res = await api.get(`/exam-registration/${id}`);
  return res.data;
};

export const updateRegistrationStatus = async (id, data) => {
  const res = await api.put(`/exam-registration/${id}/status`, data);
  return res.data;
};

export const bulkConfirmRegistrations = async (examId) => {
  const res = await api.post(`/exam-registration/bulk-confirm/${examId}`);
  return res.data;
};

export const issueAdmitCards = async (examId) => {
  const res = await api.post(`/exam-registration/issue-admit-cards/${examId}`);
  return res.data;
};

export const getRegistrationStats = async (examId) => {
  const res = await api.get(`/exam-registration/stats/${examId}`);
  return res.data;
};
