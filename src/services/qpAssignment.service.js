import api from "./api";

// ── QP Assignments (Admin) ──

export const getAllAssignments = async (params = {}) => {
  const res = await api.get("/qp-assignment", { params });
  return res.data;
};

export const getAssignment = async (id) => {
  const res = await api.get(`/qp-assignment/${id}`);
  return res.data;
};

export const createAssignment = async (data) => {
  const res = await api.post("/qp-assignment", data);
  return res.data;
};

export const updateAssignment = async (id, data) => {
  const res = await api.put(`/qp-assignment/${id}`, data);
  return res.data;
};

export const deleteAssignment = async (id) => {
  const res = await api.delete(`/qp-assignment/${id}`);
  return res.data;
};

export const finalizeAssignment = async (id, data = {}) => {
  const res = await api.post(`/qp-assignment/${id}/finalize`, data);
  return res.data;
};
