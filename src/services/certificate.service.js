import api from "./api";

export const generateCertificates = async (data) => {
  const res = await api.post("/certificates/generate", data);
  return res.data;
};

export const getAllCertificates = async (params = {}) => {
  const res = await api.get("/certificates", { params });
  return res.data;
};

export const getCertificate = async (id) => {
  const res = await api.get(`/certificates/${id}`);
  return res.data;
};

export const verifyCertificate = async (id, remarks) => {
  const res = await api.put(`/certificates/${id}/verify`, { remarks });
  return res.data;
};

export const issueCertificate = async (id, data = {}) => {
  const res = await api.put(`/certificates/${id}/issue`, data);
  return res.data;
};

export const revokeCertificate = async (id, reason) => {
  const res = await api.put(`/certificates/${id}/revoke`, { reason });
  return res.data;
};

export const bulkVerify = async (certificateIds) => {
  const res = await api.post("/certificates/bulk-verify", { certificateIds });
  return res.data;
};

export const bulkIssue = async (certificateIds) => {
  const res = await api.post("/certificates/bulk-issue", { certificateIds });
  return res.data;
};

export const getCertificateStats = async (params = {}) => {
  const res = await api.get("/certificates/stats", { params });
  return res.data;
};

export const downloadCertificatePdf = async (id, withLetterhead = true) => {
  const res = await api.get(`/certificates/${id}/download-pdf`, {
    params: { withLetterhead },
    responseType: "blob",
  });
  return res.data;
};

export const issueToStudent = async (data) => {
  const res = await api.post("/certificates/issue-individual", data);
  return res.data;
};
