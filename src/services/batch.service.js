import api from "./api";

export const getAllBatches = async (params = {}) => {
  const response = await api.get("/batches", { params });
  return response.data;
};

export const getBatchById = async (id) => {
  const response = await api.get(`/batches/${id}`);
  return response.data;
};

export const createBatch = async (data) => {
  const response = await api.post("/batches", data);
  return response.data;
};

export const updateBatch = async (id, data) => {
  const response = await api.put(`/batches/${id}`, data);
  return response.data;
};

export const deleteBatch = async (id) => {
  const response = await api.delete(`/batches/${id}`);
  return response.data;
};

export const getBatchesByProgram = async (programId) => {
  const response = await api.get(`/batches/program/${programId}`);
  return response.data;
};

export const getBatchesDropdown = async (programId) => {
  const params = programId ? { program: programId } : {};
  const response = await api.get("/batches/dropdown", { params });
  return response.data;
};

export const getBatchGanttData = async (batchId) => {
  const response = await api.get(`/batches/${batchId}/gantt`);
  return response.data;
};

export const getBatchStudents = async (batchId, params = {}) => {
  const response = await api.get(`/batches/${batchId}/students`, { params });
  return response.data;
};

export const uploadBatchStudentsCSV = async (
  batchId,
  file,
  options = {}
) => {
  const formData = new FormData();
  formData.append("file", file);
  if (options.overrideAssignment !== undefined) {
    formData.append(
      "overrideAssignment",
      options.overrideAssignment ? "true" : "false"
    );
  }

  const base = api.defaults?.baseURL || "";
  const normalized = base.replace(/\/+$/, "");
  const uploadUrl = `${normalized}/batches/${batchId}/students/upload`;
  const logUrl =
    options.overrideAssignment === undefined
      ? uploadUrl
      : `${uploadUrl}?overrideAssignment=${options.overrideAssignment}`;
  console.log("[UploadStudents] POST", uploadUrl);
  console.log("[UploadStudents] Effective URL", logUrl);

  const response = await api.post(`/batches/${batchId}/students/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
