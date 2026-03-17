import api from "./api";

export const createMeeting = async (data) => {
  const res = await api.post("/result-committee", data);
  return res.data;
};

export const getAllMeetings = async (params = {}) => {
  const res = await api.get("/result-committee", { params });
  return res.data;
};

export const getMeeting = async (id) => {
  const res = await api.get(`/result-committee/${id}`);
  return res.data;
};

export const updateMeeting = async (id, data) => {
  const res = await api.put(`/result-committee/${id}`, data);
  return res.data;
};

export const startMeeting = async (id) => {
  const res = await api.put(`/result-committee/${id}/start`);
  return res.data;
};

export const markAttendance = async (id, attendees) => {
  const res = await api.put(`/result-committee/${id}/attendance`, { attendees });
  return res.data;
};

export const recordDecision = async (id, agendaIndex, data) => {
  const res = await api.put(`/result-committee/${id}/decide/${agendaIndex}`, data);
  return res.data;
};

export const recordMinutes = async (id, minutes) => {
  const res = await api.put(`/result-committee/${id}/minutes`, { minutes });
  return res.data;
};

export const completeMeeting = async (id) => {
  const res = await api.put(`/result-committee/${id}/complete`);
  return res.data;
};

export const finalizeMeeting = async (id) => {
  const res = await api.put(`/result-committee/${id}/finalize`);
  return res.data;
};

export const publishApprovedResults = async (id) => {
  const res = await api.post(`/result-committee/${id}/publish`);
  return res.data;
};

export const deleteMeeting = async (id) => {
  const res = await api.delete(`/result-committee/${id}`);
  return res.data;
};
