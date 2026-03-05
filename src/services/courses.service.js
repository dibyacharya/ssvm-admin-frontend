import api, { API_URL } from "./api";

const COURSE_LIST_ENDPOINT = "/admin/courses";
const COURSE_LIST_DETAILED_ENDPOINT = "/admin/courses/all";

const buildAbsoluteApiUrl = (endpoint) => {
  const base = String(API_URL || "").replace(/\/+$/, "");
  const path = String(endpoint || "").startsWith("/")
    ? String(endpoint || "")
    : `/${String(endpoint || "")}`;
  return `${base}${path}`;
};

const ensureCoursesPayload = (payload, endpoint) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(
      `Invalid course list response from ${endpoint}: expected object payload`
    );
  }

  if (!Array.isArray(payload.courses)) {
    throw new Error(
      `Invalid course list response from ${endpoint}: missing courses[]`
    );
  }
};

export const getAllCourses = async (params = {}, options = {}) => {
  const endpoint = options?.detailed
    ? COURSE_LIST_DETAILED_ENDPOINT
    : COURSE_LIST_ENDPOINT;
  const limit = 200;
  let page = 1;
  let totalPages = 1;
  let combinedCourses = [];
  let firstPayload = null;
  const searchInput = typeof params?.q === "string" ? params.q : params?.search;
  const searchTerm =
    typeof searchInput === "string" && searchInput.trim()
      ? searchInput.trim()
      : "";
  const absoluteUrl = buildAbsoluteApiUrl(endpoint);

  if (import.meta.env.DEV) {
    console.log("[CourseAPI] course list URL", absoluteUrl);
  }

  while (page <= totalPages) {
    const response = await api.get(endpoint, {
      params: {
        page,
        limit,
        ...(searchTerm ? { q: searchTerm } : {}),
      },
    });
    const payload = response.data || {};
    ensureCoursesPayload(payload, absoluteUrl);

    if (!firstPayload) {
      firstPayload = payload;
    }

    const pageCourses = Array.isArray(payload?.courses) ? payload.courses : [];
    combinedCourses = combinedCourses.concat(pageCourses);

    const reportedPages = Number(payload?.pagination?.totalPages);
    totalPages =
      Number.isFinite(reportedPages) && reportedPages > 0 ? reportedPages : 1;
    page += 1;
  }

  if (!firstPayload) {
    return { success: true, courses: [] };
  }

  return {
    ...firstPayload,
    pagination: {
      ...(firstPayload.pagination || {}),
      currentPage: 1,
      totalPages: 1,
      totalCourses: combinedCourses.length,
      hasNext: false,
      hasPrev: false,
    },
    courses: combinedCourses,
  };
};


export const getAllStudentCourses = async () => {
  const response = await api.get("/courses/student");
  return response.data;
};

export const getCoursesById = async (codeid) => {
  const response = await api.get(`admin/courses/by-code/${codeid}`);
  return response.data;
};

export const lookupCourseByCode = async (courseCode) => {
  const response = await api.get(`/admin/courses/by-code/${courseCode}`);
  return response.data;
};

export const updateCourse = async (codeid, courseData) => {
  const response = await api.put(`admin/courses/update`, courseData);
  return response.data;
};

export const createCourse = async (courseData) => {
  try {
    const response = await api.post("/admin/courses/create", courseData);
    return response.data;
  } catch (error) {
    console.error("Error creating course:", error);
    throw error;
  }
};

export const getCoursesForSemester = async (semesterId) => {
  const response = await api.get(`/semesters/${semesterId}`);
  return response.data?.courses || [];
};

export const deleteCourse = async (courseId) => {
  const response = await api.delete(`/admin/courses/${courseId}`);
  return response.data;
};

export const unlinkCourseFromSemester = async (semesterId, courseId) => {
  const response = await api.delete(`/semesters/${semesterId}/courses/${courseId}`);
  return response.data;
};

export const updateCourseTeachers = async (semesterId, courseId, teachers) => {
  const isObjectArray =
    Array.isArray(teachers) && teachers.some((t) => typeof t === "object");
  const payload = isObjectArray ? { teachers } : { teacherIds: teachers };
  const response = await api.put(
    `/semesters/${semesterId}/courses/${courseId}/teachers`,
    payload
  );
  return response.data;
};

export const getTeacherCourses = async () => {
  const response = await api.get("/courses");
  return response.data;
};

export const getCourseDescription = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/description`);
  return response.data;
};

export const getCourseTaxonomyCategories = async () => {
  const response = await api.get("/course-taxonomy/categories");
  return response.data;
};

export const getCourseTaxonomySubcategories = async (categoryId) => {
  const response = await api.get("/course-taxonomy/subcategories", {
    params: { categoryId },
  });
  return response.data;
};

export const updateCourseDescription = async (courseId, payload) => {
  const response = await api.put(`/courses/${courseId}/description`, payload);
  return response.data;
};

export const getCourseMaterials = async (courseId) => {
  const response = await api.get(`/courses/${courseId}/materials`);
  return response.data;
};

export const getAdminCourseMaterials = async (courseId) => {
  const response = await api.get(`/admin/courses/${courseId}/materials`);
  return response.data;
};

export const getAdminCourseModules = async (courseId) => {
  const response = await api.get(`/admin/courses/${courseId}/modules`);
  return response.data;
};

export const getTeacherContent = async (courseId) => {
  const response = await api.get(`/admin/courses/${courseId}/teacher-content`);
  return response.data;
};

export const createAdminCourseModule = async (courseId, payload = {}) => {
  const response = await api.post(`/admin/courses/${courseId}/modules`, payload);
  return response.data;
};

export const updateAdminCourseModule = async (courseId, moduleId, payload = {}) => {
  const response = await api.patch(
    `/admin/courses/${courseId}/modules/${moduleId}`,
    payload
  );
  return response.data;
};

export const deleteAdminCourseModule = async (courseId, moduleId) => {
  const response = await api.delete(`/admin/courses/${courseId}/modules/${moduleId}`);
  return response.data;
};

export const uploadCourseModulePdf = async (courseId, moduleId, payload = {}) => {
  const formData = new FormData();
  if (payload?.title) formData.append("title", payload.title);
  if (payload?.file) formData.append("file", payload.file);
  const response = await api.post(
    `/admin/courses/${courseId}/modules/${moduleId}/pdfs`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};

export const uploadCourseModulePresentation = async (
  courseId,
  moduleId,
  payload = {}
) => {
  const formData = new FormData();
  if (payload?.title) formData.append("title", payload.title);
  if (payload?.file) formData.append("file", payload.file);
  const response = await api.post(
    `/admin/courses/${courseId}/modules/${moduleId}/presentations`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};

export const addCourseModuleVideo = async (courseId, moduleId, payload = {}) => {
  const response = await api.post(`/admin/courses/${courseId}/modules/${moduleId}/videos`, {
    title: payload?.title,
    url: payload?.url,
  });
  return response.data;
};

export const deleteCourseModulePdf = async (courseId, moduleId, pdfId) => {
  const response = await api.delete(
    `/admin/courses/${courseId}/modules/${moduleId}/pdfs/${pdfId}`
  );
  return response.data;
};

export const deleteCourseModulePresentation = async (courseId, moduleId, pptId) => {
  const response = await api.delete(
    `/admin/courses/${courseId}/modules/${moduleId}/presentations/${pptId}`
  );
  return response.data;
};

export const deleteCourseModuleVideo = async (courseId, moduleId, videoId) => {
  const response = await api.delete(
    `/admin/courses/${courseId}/modules/${moduleId}/videos/${videoId}`
  );
  return response.data;
};

export const addCourseModuleLink = async (courseId, moduleId, payload = {}) => {
  const response = await api.post(`/admin/courses/${courseId}/modules/${moduleId}/links`, {
    title: payload?.title,
    url: payload?.url,
  });
  return response.data;
};

export const deleteCourseModuleLink = async (courseId, moduleId, linkId) => {
  const response = await api.delete(
    `/admin/courses/${courseId}/modules/${moduleId}/links/${linkId}`
  );
  return response.data;
};

export const addCourseMaterialItem = async (courseId, moduleNo, payload = {}) => {
  const normalizedType = String(payload?.type || "").toLowerCase();
  const requiresFile = normalizedType === "pdf" || normalizedType === "presentation";

  if (requiresFile) {
    const formData = new FormData();
    if (payload?.type) formData.append("type", payload.type);
    if (payload?.title) formData.append("title", payload.title);
    if (payload?.description) formData.append("description", payload.description);
    if (payload?.file) formData.append("file", payload.file);
    const response = await api.post(
      `/admin/courses/${courseId}/materials/modules/${moduleNo}/items`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  }

  const response = await api.post(
    `/admin/courses/${courseId}/materials/modules/${moduleNo}/items`,
    {
      type: payload?.type,
      title: payload?.title,
      url: payload?.url,
      description: payload?.description,
    }
  );
  return response.data;
};

export const updateCourseMaterialItem = async (courseId, itemId, payload = {}) => {
  const normalizedType = String(payload?.type || "").toLowerCase();
  const hasFile = !!payload?.file;
  if (hasFile && (normalizedType === "pdf" || normalizedType === "presentation")) {
    const formData = new FormData();
    if (payload?.title) formData.append("title", payload.title);
    if (payload?.description !== undefined) {
      formData.append("description", payload.description);
    }
    formData.append("file", payload.file);
    const response = await api.put(
      `/admin/courses/${courseId}/materials/items/${itemId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  }

  const response = await api.put(`/admin/courses/${courseId}/materials/items/${itemId}`, {
    title: payload?.title,
    url: payload?.url,
    description: payload?.description,
  });
  return response.data;
};

export const deleteCourseMaterialItem = async (courseId, itemId) => {
  const response = await api.delete(`/admin/courses/${courseId}/materials/items/${itemId}`);
  return response.data;
};

export const uploadCourseMaterial = async (courseId, payload) => {
  const formData = new FormData();
  if (payload?.materialType) formData.append("materialType", payload.materialType);
  if (payload?.name) formData.append("name", payload.name);
  if (payload?.description) formData.append("description", payload.description);
  if (payload?.moduleIndex !== undefined && payload?.moduleIndex !== null) {
    formData.append("moduleIndex", String(payload.moduleIndex));
  }
  if (payload?.assetId) formData.append("assetId", payload.assetId);
  if (payload?.file) formData.append("file", payload.file);

  const response = await api.post(`/courses/${courseId}/materials/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getCourseStudents = async (courseId, params = {}) => {
  const response = await api.get(`/courses/${courseId}/students`, { params });
  return response.data;
};
