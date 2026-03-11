import api from "./api";

export const createAmendment = async (data) => {
  const response = await api.post("/course-amendments", data);
  return response.data;
};

export const listAmendments = async (params = {}) => {
  const response = await api.get("/course-amendments", { params });
  return response.data;
};

export const getAmendmentById = async (id) => {
  const response = await api.get(`/course-amendments/${id}`);
  return response.data;
};

export const updateAmendment = async (id, data) => {
  const response = await api.put(`/course-amendments/${id}`, data);
  return response.data;
};

export const submitForApproval = async (id) => {
  const response = await api.post(`/course-amendments/${id}/submit`);
  return response.data;
};

export const approveAmendment = async (id) => {
  const response = await api.post(`/course-amendments/${id}/approve`);
  return response.data;
};

export const rejectAmendment = async (id, rejectionReason = "") => {
  const response = await api.post(`/course-amendments/${id}/reject`, {
    rejectionReason,
  });
  return response.data;
};

export const getEligibleBatches = async (id) => {
  const response = await api.get(`/course-amendments/${id}/eligible-batches`);
  return response.data;
};

export const applyToBatch = async (id, batchId) => {
  const response = await api.post(
    `/course-amendments/${id}/apply/${batchId}`
  );
  return response.data;
};

export const revertFromBatch = async (id, batchId) => {
  const response = await api.post(
    `/course-amendments/${id}/revert/${batchId}`
  );
  return response.data;
};

export const getAmendmentsByProgram = async (programId) => {
  const response = await api.get(
    `/course-amendments/program/${programId}`
  );
  return response.data;
};

export const getAmendmentsByBatch = async (batchId) => {
  const response = await api.get(`/course-amendments/batch/${batchId}`);
  return response.data;
};
