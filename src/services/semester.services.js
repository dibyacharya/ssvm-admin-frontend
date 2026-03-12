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

export const scheduleVirtualClasses = async (id, options = {}) => {
  const response = await api.post(
    `/semesters/${id}/timetable/schedule-classes`,
    options
  );
  return response.data;
};

export const resetTimetable = async (id) => {
  const response = await api.post(`/semesters/${id}/timetable/reset`);
  return response.data;
};

export const getScheduledMeetings = async (id) => {
  const response = await api.get(
    `/semesters/${id}/timetable/scheduled-meetings`
  );
  return response.data;
};

export const downloadTimetableTemplate = async (id) => {
  const response = await api.get(`/semesters/${id}/timetable/template`, {
    responseType: "blob",
  });
  return response;
};

export const scheduleExamVConf = async (semesterId, itemId) => {
  const response = await api.post(`/semesters/${semesterId}/timetable/plan/${itemId}/schedule-vconf`);
  return response.data;
};

export const parseTimetableUpload = async (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(`/semesters/${id}/timetable/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
