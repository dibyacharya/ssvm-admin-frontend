import api from "./api";

export const getCourseModules = async (courseId) => {
    
  const response = await api.get(`/admin/courses/${courseId}/modules`);
  console.log("Modules response:", response.data);
  return response.data;
};

// Add content to module
export const addModuleContent = async (courseID, moduleID, formData) => {
  try {
    // For debugging
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    const response = await api.post(
      `/syllabus/course/${courseID}/syllabus/module/${moduleID}/content`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

  
    return response.data;
  } catch (error) {
    console.error("Error adding module content:", error);
    throw error;
  }
};

// Update content item
export const updateContentItem = async (
  courseID,
  moduleID,
  contentType,
  contentID,
  formData
) => {
  try {
    // For debugging
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
   let type=contentType.slice(0, -1);
    const response = await api.put(
      `/syllabus/course/${courseID}/syllabus/module/${moduleID}/content/${type}/${contentID}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

   
    return response.data;
  } catch (error) {
    console.error("Error updating content item:", error);
    throw error;
  }
};

// Delete content item
export const deleteContentItem = async (courseID, moduleID, contentType, contentID) => {
  try {
    const response = await api.delete(
      `/syllabus/course/${courseID}/syllabus/module/${moduleID}/content/${contentType}/${contentID}`
    );
   
    return response.data;
  } catch (error) {
    console.error("Error deleting content item:", error);
    throw error;
  }
};