import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Upload, Plus, Calendar, User, Users, GraduationCap, Edit, FileUp } from 'lucide-react';
import CSVUpload from '../components/courseManagement/csvUpload';
import { useCourse } from '../contexts/CourseContext';

export const CourseManagement = () => {
  const {
    courses,
    loading,
    error,
    showUpload,
    fetchCourses,
    toggleUpload,
    hasActiveCourses,
    handleUploadCSV,
    clearError
  } = useCourse();

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleUploadSuccess = async (file) => {
    try {
      await handleUploadCSV(file);
      console.log('Upload successful');
      toggleUpload(); // Close modal
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading courses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
        <button
          onClick={toggleUpload}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload CSV
        </button>
      </div>

      {/* No Courses State */}
      {!hasActiveCourses() ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Courses Found</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Get started by creating your first course. You can add course details, assign teachers, and manage students.
            </p>
            <Link
              to="/create-course/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Link>
          </div>
        </div>
      ) : (
        /* Courses List */
        <div className="grid gap-4">
          {courses.map((courseCode) => (
            <div key={courseCode.courseCode} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Course Code Header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-semibold text-gray-900">
                    Course Code: {courseCode.courseCode}
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3 text-xs text-gray-600">
                      <div className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {courseCode.teacherCount} Teachers
                      </div>
                      <div className="flex items-center">
                        <GraduationCap className="w-3 h-3 mr-1" />
                        {courseCode.studentCount} Students
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/edit-course/${courseCode.courseCode}`}
                        className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Link>
                      <Link
                        to={`/upload-files/${courseCode.courses[0]?._id}`} // Pass first course ID for file upload
                        className="inline-flex items-center px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
                      >
                        <FileUp className="w-3 h-3 mr-1" />
                        Upload Files
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Content */}
              {courseCode.courses && courseCode.courses.length > 0 ? (
                <div className="p-4">
                  {courseCode.courses.map((course) => (
                    <div key={course._id} className="space-y-3">
                      {/* Course Title and Status */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {course.title}
                          </h3>
                          <p className="text-gray-600 text-xs leading-relaxed mb-3 line-clamp-2">
                            {course.aboutCourse}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ml-4 ${
                          course.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {course.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Teacher and Semester Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <h4 className="font-medium text-gray-900 flex items-center text-sm">
                            <User className="w-3 h-3 mr-1" />
                            Primary Teacher
                          </h4>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="font-medium text-gray-900 text-sm">{course.teacher.name}</p>
                            <p className="text-xs text-gray-600">{course.teacher.email}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-medium text-gray-900 flex items-center text-sm">
                            <Calendar className="w-3 h-3 mr-1" />
                            Semester
                          </h4>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="font-medium text-gray-900 text-sm">{course.semester.name}</p>
                            <p className="text-xs text-gray-600">
                              {formatDate(course.semester.startDate)} - {formatDate(course.semester.endDate)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* All Associated Teachers */}
                      {courseCode.teachers.length > 0 && (
                        <div className="mt-3">
                          <h4 className="font-medium text-gray-900 mb-2 text-sm">All Associated Teachers</h4>
                          <div className="flex flex-wrap gap-1">
                            {courseCode.teachers.map((teacher) => (
                              <div key={teacher.teacherId} className="bg-blue-50 px-2 py-1 rounded text-xs">
                                <span className="text-blue-800">{teacher.email}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          Created: {formatDate(course.createdAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Updated: {formatDate(course.updatedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* No Active Courses for this Code */
                <div className="p-4 text-center">
                  <p className="text-gray-500 mb-3 text-sm">No active courses for this course code</p>
                  <Link
                    to={`/create-course/${courseCode.courseCode}`}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white font-medium rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create Course
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CSV Upload Modal */}
      {showUpload && (
        <CSVUpload
          onClose={toggleUpload}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
};