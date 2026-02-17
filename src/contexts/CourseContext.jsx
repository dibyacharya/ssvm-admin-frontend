import React, { createContext, useContext, useState } from "react";
import { 
  getAllCourses, 
  getAllStudentCourses, 
  getCoursesById, 
  updateCourse, 
  createCourse
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
  const [error, setError] = useState(null);

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
      setCourses(response?.courses || []);
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

  // Reset selected course
  const resetSelectedCourse = () => {
    setSelectedCourse(null);
  };

  // Check if there are active courses
  const hasActiveCourses = () => {
    return courses.some((course) => course?.isActive !== false);
  };

  // Get course by course code
  const getCourseByCode = (courseCode) => {
    return courses.find(course => course.courseCode === courseCode);
  };

  // Get all teachers from courses
  const getAllTeachers = () => {
    const teachers = [];
    courses.forEach((course) => {
      if (Array.isArray(course?.assignedTeachers)) {
        teachers.push(...course.assignedTeachers);
      }
    });
    return teachers;
  };

  // Get total student count
  const getTotalStudentCount = () => {
    return courses.reduce(
      (total, course) =>
        total + (course?.stats?.enrolledStudentsCount ?? course?.studentCount ?? 0),
      0
    );
  };

  // Get total teacher count
  const getTotalTeacherCount = () => {
    return courses.reduce(
      (total, course) => total + (Array.isArray(course?.assignedTeachers) ? course.assignedTeachers.length : 0),
      0
    );
  };

  const value = {
    // State
    courses,
    studentCourses,
    selectedCourse,
    loading,
    creating,
    updating,
    error,

    // Actions
    fetchCourses,
    fetchStudentCourses,
    fetchCourseById,
    handleCreateCourse,
    handleUpdateCourse,
    clearError,
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
