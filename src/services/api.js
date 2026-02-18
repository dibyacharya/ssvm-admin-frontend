import axios from "axios";

const normalizeBase = (value) =>
  typeof value === "string" ? value.replace(/\/+$/, "") : undefined;

const ensureApiBase = (value) => {
  const normalized = normalizeBase(value);
  if (!normalized) return normalized;
  const parts = normalized.split("/");
  return parts[parts.length - 1] === "api" ? normalized : `${normalized}/api`;
};

const rawEnvApiBase = import.meta.env.REACT_APP_BACKEND_URL;
const isDev = import.meta.env.DEV === true;
const devFallbackBase = "http://localhost:5000/api";
const selectedBase = normalizeBase(rawEnvApiBase) || (isDev ? devFallbackBase : "");

export const API_URL = ensureApiBase(selectedBase);

if (!API_URL) {
  throw new Error(
    "API URL is undefined. Set REACT_APP_BACKEND_URL (e.g. http://localhost:5000/api)."
  );
}

if (typeof window !== "undefined") {
  window.__API_URL__ = API_URL;
  if (!window.__API_URL_LOGGED__) {
    window.__API_URL_LOGGED__ = true;
    console.log(`[api] API_URL=${API_URL}`);
    if (isDev) {
      console.info(`[api] raw REACT_APP_BACKEND_URL=${rawEnvApiBase || "(empty)"}`);
    }
  }
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const toAbsoluteUrl = (config) => {
  const base = config?.baseURL || API_URL || "";
  const path = config?.url || "";
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedBase = String(base).replace(/\/+$/, "");
  const normalizedPath = String(path).replace(/^\/+/, "");
  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase;
};

const summarizePayload = (payload) => {
  if (payload === undefined || payload === null) return "";
  const raw =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  return raw.length > 180 ? `${raw.slice(0, 180)}...` : raw;
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (isDev) {
      const method = (response.config?.method || "GET").toUpperCase();
      console.log(
        "[API_OK]",
        method,
        toAbsoluteUrl(response.config),
        response.status,
        summarizePayload(response.data)
      );
    }
    return response;
  },
  (error) => {
    if (isDev) {
      const method = (error.config?.method || "GET").toUpperCase();
      console.log(
        "[API_ERR]",
        method,
        toAbsoluteUrl(error.config),
        error.response?.status || "NO_STATUS",
        summarizePayload(error.response?.data)
      );
    }
    if (error.response?.status === 401) {
      const requestUrl = String(error.config?.url || "");
      const isAuthRequest = /\/auth\/(login|register)\b/.test(requestUrl);
      const isOnLoginPage =
        typeof window !== "undefined" && window.location.pathname === "/login";

      // Avoid forced refresh-loop while user is actively trying to log in.
      if (!isAuthRequest && !isOnLoginPage) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    const statusCode = error.response?.status;
    const payloadMessage = String(
      error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        ""
    ).toLowerCase();
    const isCorsLike403 =
      statusCode === 403 &&
      (payloadMessage.includes("origin not allowed by cors") ||
        payloadMessage.includes("cors"));

    if (isCorsLike403 && typeof window !== "undefined") {
      const bannerMessage =
        "CORS blocked. Fix backend ALLOWED_ORIGINS to include http://localhost:3000";
      if (window.__CORS_BANNER_MESSAGE__ !== bannerMessage) {
        window.__CORS_BANNER_MESSAGE__ = bannerMessage;
        window.dispatchEvent(
          new CustomEvent("api:cors-blocked", {
            detail: { message: bannerMessage },
          })
        );
      }
    }

    return Promise.reject(error);
  }
);

// Auth service
export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      return response;
    } catch (error) {
      throw error;
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default api;
