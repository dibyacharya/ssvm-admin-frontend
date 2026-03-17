import api from "./api";

// ── Admin: Exam Overview ──

export const getAllExams = async (params = {}) => {
  const res = await api.get("/exam/admin/exams", { params });
  return res.data;
};

export const getExamById = async (examId) => {
  const res = await api.get(`/exam/exams/${examId}`);
  return res.data;
};

export const getCourseExams = async (courseId, params = {}) => {
  const res = await api.get(`/exam/courses/${courseId}/exams`, { params });
  return res.data;
};

export const getAllSubmissions = async (examId) => {
  const res = await api.get(`/exam/exams/${examId}/submissions`);
  return res.data;
};

export const getExamAnalytics = async (examId) => {
  const res = await api.get(`/exam/exams/${examId}/analytics`);
  return res.data;
};

export const exportResults = async (examId) => {
  const res = await api.get(`/exam/exams/${examId}/export`, {
    responseType: "blob",
  });
  return res.data;
};

export const getLiveDashboard = async (examId) => {
  const res = await api.get(`/exam/exams/${examId}/live-dashboard`);
  return res.data;
};

export const getProctoringReport = async (examId, studentId) => {
  const res = await api.get(
    `/exam/exams/${examId}/proctoring-report/${studentId}`
  );
  return res.data;
};

export const cancelExam = async (examId) => {
  const res = await api.post(`/exam/exams/${examId}/cancel`);
  return res.data;
};

export const deleteExam = async (examId) => {
  const res = await api.delete(`/exam/exams/${examId}`);
  return res.data;
};

// ── Question Bank ──

export const getQuestionStats = async (courseId) => {
  const res = await api.get(`/exam/courses/${courseId}/question-bank/stats`);
  return res.data;
};
