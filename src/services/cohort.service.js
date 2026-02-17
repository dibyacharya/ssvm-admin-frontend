import api from "./api";

export const getCohortList = async (params = {}) => {
  const response = await api.get("/cohorts/list", { params });
  return response.data;
};
