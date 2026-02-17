import api from "./api";

export const getEnrollmentStudents = async (params = {}) => {
  const response = await api.get("/enrollment/students", { params });
  return response.data;
};

export const updateEnrollmentStudentBatch = async (studentId, batchId) => {
  const response = await api.put(`/enrollment/students/${studentId}/batch`, {
    batchId,
  });
  return response.data;
};

export const bulkAssignEnrollmentBatch = async (studentIds, batchId) => {
  const response = await api.put("/enrollment/students/batch", {
    studentIds,
    batchId,
  });
  return response.data;
};
