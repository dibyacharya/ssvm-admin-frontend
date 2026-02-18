import api from "./api";

export const getCohortList = async (params = {}) => {
  const response = await api.get("/cohorts/list", { params });
  return response.data;
};

export const getEnrollmentStudentById = async (studentId) => {
  const response = await api.get(`/students/${studentId}/enrollment`);
  return response.data;
};

export const updateEnrollmentStudentById = async (studentId, payload) => {
  const response = await api.patch(`/students/${studentId}/enrollment`, payload);
  return response.data;
};
