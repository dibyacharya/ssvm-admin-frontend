import api from "./api";

export const getAllPrograms = async (params = {}) => {
  const response = await api.get("/programs", { params });
  return response.data;
};

export const getProgramById = async (id) => {
  const response = await api.get(`/programs/${id}`);
  return response.data;
};

export const createProgram = async (data) => {
  const response = await api.post("/programs", data);
  return response.data;
};

export const updateProgram = async (id, data) => {
  const response = await api.put(`/programs/${id}`, data);
  return response.data;
};

export const deleteProgram = async (id) => {
  const response = await api.delete(`/programs/${id}`);
  return response.data;
};

export const getProgramsDropdown = async () => {
  const response = await api.get("/programs/dropdown");
  return response.data;
};

export const getProgramStreams = async (params = {}) => {
  const query = {};
  if (params.programId) query.programId = params.programId;
  const response = await api.get("/programs/streams", { params: query });
  return response.data;
};

export const getAcademicPlan = async (programId) => {
  const response = await api.get(`/programs/${programId}/academic-plan`);
  return response.data;
};

export const getProgramSheet = async (programId) => {
  const response = await api.get(`/programs/${programId}/sheet`);
  return response.data;
};

export const getSemesterCourseAssignment = async (programId, semesterId) => {
  const response = await api.get(
    `/academic-plan/${programId}/${semesterId}/course-assignment`
  );
  return response.data;
};

export const updateSemesterCourseAssignment = async (
  programId,
  semesterId,
  payload
) => {
  const response = await api.put(
    `/academic-plan/${programId}/${semesterId}/course-assignment`,
    payload
  );
  return response.data;
};

export const updateCourseAssessmentPlan = async (courseId, payload) => {
  const response = await api.put(`/courses/${courseId}/assessment-plan`, payload);
  return response.data;
};
