import api from "./api";

export const getAllSemester = async () => {
  const response = await api.get("/semesters");
  return response.data;
};

export const getSemesters = async (params = {}) => {
  const response = await api.get("/semesters", { params });
  return response.data;
};

export const createSemester = async (data) => {
  const response = await api.post("/semesters", data);
  return response.data;
};

export const updateSemester = async (id, data) => {
  const response = await api.put(`/semesters/${id}`, data);
  return response.data;
};

export const getSemestersByBatch = async (batchId) => {
  const response = await api.get("/semesters", { params: { batch: batchId } });
  return response.data;
};

export const deleteSemester = async (id) => {
  const response = await api.delete(`/semesters/${id}`);
  return response.data;
};

export const getSemesterTimetable = async (id) => {
  const response = await api.get(`/semesters/${id}/timetable`);
  return response.data;
};

export const updateSemesterWeeklyTimetable = async (id, weeklyTimetable) => {
  const response = await api.put(`/semesters/${id}/timetable/weekly`, {
    weeklyTimetable,
  });
  return response.data;
};

export const updateSemesterPlan = async (id, semesterPlan) => {
  const response = await api.put(`/semesters/${id}/timetable/plan`, {
    semesterPlan,
  });
  return response.data;
};
