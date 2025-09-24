import api from "./api";

export const getAllCourses = async () => {
  const response = await api.get("/admin/course-codes");
  return response.data;
};


export const getAllStudentCourses = async () => {
  const response = await api.get("/courses/student");
  return response.data;
};

export const getCoursesById = async (codeid) => {
  const response = await api.get(`admin/courses/by-code/${codeid}`);
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

// Admin service for uploading users CSV
export const uploadUsersCSV = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/admin/upload-users', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading users CSV:", error);
    throw error;
  }
};

