import api from "./api";

const normalizeBaseUrl = (value) =>
  typeof value === "string" ? value.replace(/\/+$/, "") : "";

const resolveBackendBaseUrl = () => {
  const runtimeBase = normalizeBaseUrl(
    typeof window !== "undefined" ? window.RUNTIME_CONFIG?.BACKEND_URL : ""
  );
  if (runtimeBase) return runtimeBase;
  const apiBase = normalizeBaseUrl(api.defaults?.baseURL || "");
  return apiBase.replace(/\/api$/i, "");
};

export const resolveTicketAttachmentUrl = (url) => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = resolveBackendBaseUrl();
  if (!base) return raw;
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
};

export const listTickets = async (params = {}) => {
  const response = await api.get("/tickets", { params });
  return response.data;
};

export const getTicketTaxonomy = async () => {
  const response = await api.get("/tickets/meta/taxonomy");
  return response.data;
};

export const getTicket = async (id) => {
  const response = await api.get(`/tickets/${id}`);
  return response.data;
};

export const updateTicket = async (id, payload) => {
  const response = await api.patch(`/tickets/${id}`, payload);
  return response.data;
};

export const addAdminComment = async (id, payload) => {
  const isMultipart = payload instanceof FormData;
  const response = await api.post(`/tickets/${id}/comment`, payload, {
    headers: isMultipart ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return response.data;
};

export const closeTicket = async (id) => {
  const response = await api.post(`/tickets/${id}/close`);
  return response.data;
};

export const listAdminUsers = async (params = {}) => {
  const response = await api.get("/admin/users", {
    params: {
      role: "admin",
      page: 1,
      limit: 200,
      sortBy: "name",
      sortOrder: "asc",
      ...params,
    },
  });
  return response.data;
};
