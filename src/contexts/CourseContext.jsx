import React, { createContext, useContext, useState } from "react";
import { 
  getAllCourses, 
  getAllStudentCourses, 
  getCoursesById, 
  updateCourse, 
  createCourse, 
  uploadUsersCSV 
} from "../services/courses.service";

// Create the context
const CourseContext = createContext();

// Create the provider component
export const CourseProvider = ({ children }) => {
  // State management
  const [courses, setCourses] = useState([]);
  const [studentCourses, setStudentCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  // Fetch all courses
  const fetchCourses = async () => {
    try {
      setLoading(true);
      clearError();
      
      const response = await getAllCourses();
      setCourses(response?.courseCodes || []);
      return response;
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError(error.message || 'Failed to fetch courses');
      setCourses([]);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fetch student courses
  const fetchStudentCourses = async () => {
    try {
      setLoading(true);
      clearError();
      
      const response = await getAllStudentCourses();
      setStudentCourses(response?.courses || []);
      return response;
    } catch (error) {
      console.error('Error fetching student courses:', error);
      setError(error.message || 'Failed to fetch student courses');
      setStudentCourses([]);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fetch course by ID
  const fetchCourseById = async (courseId) => {
    try {
      setLoading(true);
      clearError();
      
      const response = await getCoursesById(courseId);
      setSelectedCourse(response?.course || null);
      return response?.course;
    } catch (error) {
      console.error('Error fetching course by ID:', error);
      setError(error.message || 'Failed to fetch course');
      setSelectedCourse(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Create new course
  const handleCreateCourse = async (courseData) => {
    try {
      setCreating(true);
      clearError();
      
      const response = await createCourse(courseData);
      
      // Refresh courses list after creation
      await fetchCourses();
      
      return response;
    } catch (error) {
      console.error('Error creating course:', error);
      setError(error.message || 'Failed to create course');
      throw error;
    } finally {
      setCreating(false);
    }
  };

  // Update course
  const handleUpdateCourse = async (courseId, courseData) => {
    try {
      setUpdating(true);
      clearError();
      
      const response = await updateCourse(courseId, courseData);
      
      // Update selected course if it matches
      if (selectedCourse && selectedCourse._id === courseId) {
        setSelectedCourse(response?.course || null);
      }
      
      // Refresh courses list
      await fetchCourses();
      
      return response;
    } catch (error) {
      console.error('Error updating course:', error);
      setError(error.message || 'Failed to update course');
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  // Upload CSV
  const handleUploadCSV = async (file) => {
    try {
      setUploading(true);
      clearError();
      
      const response = await uploadUsersCSV(file);
      
      // Refresh courses after upload
      await fetchCourses();
      
      return response;
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setError(error.message || 'Failed to upload CSV');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  // Toggle upload modal
  const toggleUpload = () => {
    setShowUpload(!showUpload);
  };

  // Reset selected course
  const resetSelectedCourse = () => {
    setSelectedCourse(null);
  };

  // Check if there are active courses
  const hasActiveCourses = () => {
    return courses.some(courseCode => 
      courseCode.courses && courseCode.courses.length > 0
    );
  };

  // Get course by course code
  const getCourseByCode = (courseCode) => {
    return courses.find(course => course.courseCode === courseCode);
  };

  // Get all teachers from courses
  const getAllTeachers = () => {
    const teachers = [];
    courses.forEach(courseCode => {
      if (courseCode.teachers && courseCode.teachers.length > 0) {
        teachers.push(...courseCode.teachers);
      }
    });
    return teachers;
  };

  // Get total student count
  const getTotalStudentCount = () => {
    return courses.reduce((total, courseCode) => total + (courseCode.studentCount || 0), 0);
  };

  // Get total teacher count
  const getTotalTeacherCount = () => {
    return courses.reduce((total, courseCode) => total + (courseCode.teacherCount || 0), 0);
  };

  const value = {
    // State
    courses,
    studentCourses,
    selectedCourse,
    loading,
    creating,
    updating,
    uploading,
    error,
    showUpload,

    // Actions
    fetchCourses,
    fetchStudentCourses,
    fetchCourseById,
    handleCreateCourse,
    handleUpdateCourse,
    handleUploadCSV,
    clearError,
    toggleUpload,
    resetSelectedCourse,

    // Utility functions
    hasActiveCourses,
    getCourseByCode,
    getAllTeachers,
    getTotalStudentCount,
    getTotalTeacherCount,

    // Direct state setters (if needed)
    setCourses,
    setStudentCourses,
    setSelectedCourse,
    setShowUpload,
  };

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
};

// Custom hook for using the course context
export const useCourse = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error("useCourse must be used within a CourseProvider");
  }
  return context;
};

export default CourseContext;