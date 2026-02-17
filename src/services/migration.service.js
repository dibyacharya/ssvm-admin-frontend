import api from "./api";

export const getMigrationStatus = async () => {
  const response = await api.get("/admin/migration-status");
  return response.data;
};

export const getUnassignedSemesters = async () => {
  const response = await api.get("/semesters/unassigned");
  return response.data;
};

export const getUnassignedStudents = async () => {
  const response = await api.get("/students/unassigned");
  return response.data;
};

export const assignBatchToSemester = async (semesterId, batchId) => {
  const response = await api.patch(`/semesters/${semesterId}/assign-batch`, { batch: batchId });
  return response.data;
};

export const assignProgramBatchToStudent = async (studentId, programId, batchId) => {
  const response = await api.patch(`/students/${studentId}/assign-program-batch`, {
    program: programId,
    batch: batchId,
  });
  return response.data;
};

export const bulkAssignProgramBatch = async (studentIds, programId, batchId) => {
  const response = await api.post("/admin/bulk-assign-program-batch", {
    studentIds,
    programId,
    batchId,
  });
  return response.data;
};

export const bulkAssignBatchToSemesters = async (semesterIds, batchId) => {
  const response = await api.post("/admin/bulk-assign-batch-to-semesters", {
    semesterIds,
    batchId,
  });
  return response.data;
};
