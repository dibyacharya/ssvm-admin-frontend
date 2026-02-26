import api from "./api";

export const getUsers = async (params = {}) => {
  const response = await api.get("/admin/users", { params });
  return response.data;
};

export const listUsers = async (params = {}) => {
  return getUsers(params);
};

export const createUser = async (payload) => {
  const response = await api.post("/admin/users", payload);
  return response.data;
};

export const updateUser = async (userId, payload) => {
  const response = await api.patch(`/admin/users/${userId}`, payload);
  return response.data;
};

export const getUserDetails = async (userId) => {
  const response = await api.get(`/admin/users/${userId}`);
  return response.data;
};

export const updateUserDetails = async (userId, payload) => {
  const response = await api.put(`/admin/users/${userId}`, payload);
  return response.data;
};

export const getUserProfile = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/profile`);
  return response.data;
};

export const getUserProgress = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/progress`);
  return response.data;
};

export const updateUserProgress = async (userId, payload) => {
  const response = await api.put(`/admin/users/${userId}/progress`, payload);
  return response.data;
};

export const updateUserProfile = async (userId, payload) => {
  const response = await api.put(`/admin/users/${userId}/profile`, payload);
  return response.data;
};

export const getUserAccessRoles = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/access-roles`);
  return response.data;
};

export const updateUserAccessRoles = async (userId, payload) => {
  const response = await api.put(`/admin/users/${userId}/access-roles`, payload);
  return response.data;
};

export const changeMyPassword = async (payload) => {
  const response = await api.put("/auth/change-password", payload);
  return response.data;
};

export const uploadUserProfilePhoto = async (userId, file, updateReason = "") => {
  const formData = new FormData();
  formData.append("photo", file);
  if (updateReason) {
    formData.append("updateReason", updateReason);
  }
  const response = await api.post(`/admin/users/${userId}/profile/photo`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const deleteUserProfilePhoto = async (userId, updateReason = "") => {
  const response = await api.delete(`/admin/users/${userId}/profile/photo`, {
    data: updateReason ? { updateReason } : undefined,
  });
  return response.data;
};

export const resetUserPassword = async (userId, payload) => {
  const response = await api.post(`/admin/users/${userId}/reset-password`, payload);
  return response.data;
};

export const sendUserInvite = async (userId) => {
  const response = await api.post(`/admin/users/${userId}/send-invite`);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};

export const bulkDeleteUsers = async (userIds) => {
  const response = await api.post("/admin/users/bulk-delete", { userIds });
  return response.data;
};

export const getTeachers = async (params = {}) => {
  const response = await api.get("/admin/teachers", {
    params: { page: 1, limit: 200, ...params },
  });
  const payload = response.data;
  const teachers = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.teachers)
      ? payload.teachers
      : Array.isArray(payload?.users)
        ? payload.users
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

  // Backward-compatible shape for old/new consumers.
  return {
    ...(payload && typeof payload === "object" ? payload : {}),
    teachers,
    users: Array.isArray(payload?.users) ? payload.users : teachers,
    data: teachers,
  };
};

export const getTeacherProfile = async (teacherOrUserId) => {
  const response = await api.get(`/admin/teachers/${teacherOrUserId}`);
  return response.data;
};

export const updateTeacherProfile = async (teacherOrUserId, payload) => {
  const response = await api.put(`/admin/teachers/${teacherOrUserId}`, payload);
  return response.data;
};

export const uploadTeacherProfilePhoto = async (
  teacherOrUserId,
  file,
  updateReason = ""
) => {
  const formData = new FormData();
  formData.append("photo", file);
  if (updateReason) {
    formData.append("updateReason", updateReason);
  }
  const response = await api.post(`/admin/teachers/${teacherOrUserId}/photo`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const deleteTeacherProfilePhoto = async (
  teacherOrUserId,
  updateReason = ""
) => {
  const response = await api.delete(`/admin/teachers/${teacherOrUserId}/photo`, {
    data: updateReason ? { updateReason } : undefined,
  });
  return response.data;
};

export const getStudents = async (params = {}) => {
  const response = await api.get("/admin/students", { params });
  return response.data;
};

export const globalSearch = async (query, type, limit = 10) => {
  const params = { query, limit };
  if (type) params.type = type;
  const response = await api.get("/admin/search", { params });
  return response.data;
};

const userService = {
  getUsers,
  listUsers,
  createUser,
  updateUser,
  getUserDetails,
  updateUserDetails,
  getUserProfile,
  getUserProgress,
  updateUserProgress,
  updateUserProfile,
  getUserAccessRoles,
  updateUserAccessRoles,
  changeMyPassword,
  uploadUserProfilePhoto,
  deleteUserProfilePhoto,
  resetUserPassword,
  sendUserInvite,
  deleteUser,
  bulkDeleteUsers,
  getTeachers,
  getTeacherProfile,
  updateTeacherProfile,
  uploadTeacherProfilePhoto,
  deleteTeacherProfilePhoto,
  getStudents,
  globalSearch,
};

export default userService;
