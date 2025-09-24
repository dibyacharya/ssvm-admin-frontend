import api from "./api";

export const getAllSemester = async () => {
  const response = await api.get("/semesters");
  return response.data;
};
