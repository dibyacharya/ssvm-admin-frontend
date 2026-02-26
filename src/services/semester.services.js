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

export const getSemesterDateView = async (id) => {
  const response = await api.get(`/semesters/${id}/timetable/date-view`);
  return response.data;
};

export const updateSemesterWeeklyTimetable = async (id, weeklyClassSchedule) => {
  const response = await api.put(`/semesters/${id}/timetable/weekly`, {
    weeklyClassSchedule,
  });
  return response.data;
};

export const updateSemesterSlotTemplates = async (id, slotTemplates) => {
  const response = await api.put(`/semesters/${id}/timetable/slots`, {
    slotTemplates,
  });
  return response.data;
};

export const updateSemesterDateClassSchedule = async (id, dateClassSchedule) => {
  const response = await api.put(`/semesters/${id}/timetable/date`, {
    dateClassSchedule,
  });
  return response.data;
};

export const updateSemesterPlan = async (id, semesterPlan) => {
  const response = await api.put(`/semesters/${id}/timetable/plan`, {
    semesterPlan,
  });
  return response.data;
};
