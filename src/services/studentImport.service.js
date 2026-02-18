import api from "./api";

export const downloadStudentProfileTemplate = async (format = "csv") => {
  const response = await api.get("/admin/students/template", {
    params: { format },
    responseType: "blob",
  });
  return response;
};

export const importStudentsFromTemplate = async ({
  file,
  mode = "dry_run",
  programId,
  batchId,
}) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("programId", programId);
  formData.append("batchId", batchId);

  const response = await api.post("/admin/students/import", formData, {
    params: { mode },
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const listStudentImportRuns = async () => {
  const response = await api.get("/admin/students/import-runs");
  return response.data;
};

export const getStudentImportRun = async (importRunId) => {
  const response = await api.get(`/admin/students/import-runs/${importRunId}`);
  return response.data;
};

export const pullFromExtraaedgeCrm = async (date) => {
  const response = await api.get("/integrations/extraaedge/pull", {
    params: { date },
  });
  return response.data;
};

export const importFromExtraaedgeCrm = async ({
  requestedDate,
  items,
  programId,
  batchId,
}) => {
  const response = await api.post("/integrations/extraaedge/import", {
    requestedDate,
    items,
    programId,
    batchId,
  });
  return response.data;
};
