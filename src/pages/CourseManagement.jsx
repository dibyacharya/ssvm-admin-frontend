import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Calendar, User, Users, GraduationCap, Edit, FileUp, X, Save, Search, Trash2 } from 'lucide-react';
import { useCourse } from '../contexts/CourseContext';
import { getPeriodLabel } from '../utils/periodLabel';
import { getAllSemester } from '../services/semester.services';
import { deleteCourse } from '../services/courses.service';

export const CourseManagement = () => {
  const navigate = useNavigate();
  const {
    courses,
    loading,
    error,
    fetchCourses,
    handleUpdateCourse,
    handleCreateCourse,
    updating,
    creating,
    clearError,
    setCourses
  } = useCourse();

  const [semesters, setSemesters] = useState([]);
  const [changeSemesterCourse, setChangeSemesterCourse] = useState(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateCode, setQuickCreateCode] = useState('');
  const [quickCreateTitle, setQuickCreateTitle] = useState('');
  const [quickCreateError, setQuickCreateError] = useState('');
  const [toast, setToast] = useState(null);
  const [deleteTargetCourse, setDeleteTargetCourse] = useState(null);
  const [deletingCourseId, setDeletingCourseId] = useState('');

  useEffect(() => {
    fetchCourses();
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const fetchSemesters = async () => {
    try {
      const data = await getAllSemester();
      const list = Array.isArray(data) ? data : data.semesters || [];
      // Deduplicate by _id and filter out orphaned semesters (no valid batch)
      const seen = new Set();
      const unique = list.filter(s => {
        if (!s._id || seen.has(s._id)) return false;
        if (!s.batch) return false;
        seen.add(s._id);
        return true;
      });
      setSemesters(unique);
    } catch (err) {
      console.error('Error fetching semesters:', err);
    }
  };

  const handleChangeSemesterClick = (course) => {
    setChangeSemesterCourse(course);
    setSelectedSemesterId(course.semester?._id || '');
  };

  const handleSemesterUpdate = async () => {
    if (!changeSemesterCourse || !selectedSemesterId) return;
    try {
      await handleUpdateCourse(changeSemesterCourse._id, {
        ...changeSemesterCourse,
        semester: selectedSemesterId
      });
      setChangeSemesterCourse(null);
      setSelectedSemesterId('');
    } catch (err) {
      console.error('Error updating semester:', err);
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

  const allCount = courses.length;

  const searchedCourses = courses.filter((course) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (course.courseCode?.toLowerCase().includes(q)) return true;
    if (course.title?.toLowerCase().includes(q)) return true;
    if (course.assignedTeachers?.some((teacher) =>
      teacher?.name?.toLowerCase().includes(q) ||
      teacher?.email?.toLowerCase().includes(q)
    )) {
      return true;
    }
    return false;
  });

  const openQuickCreate = (seedCode = '') => {
    setQuickCreateCode((seedCode || '').toUpperCase());
    setQuickCreateTitle('');
    setQuickCreateError('');
    setQuickCreateOpen(true);
  };

  const closeQuickCreate = () => {
    if (creating) return;
    setQuickCreateOpen(false);
    setQuickCreateError('');
  };

  const handleQuickCreate = async () => {
    const code = quickCreateCode.trim().toUpperCase();
    const title = quickCreateTitle.trim();

    if (!code || !title) {
      setQuickCreateError('Course code and title are required.');
      return;
    }

    try {
      setQuickCreateError('');
      const response = await handleCreateCourse({
        courseCode: code,
        title,
        aboutCourse: title,
      });
      const createdCourseId = response?.course?._id;
      if (!createdCourseId) {
        setQuickCreateError('Course was created, but no course ID was returned.');
        return;
      }
      setQuickCreateOpen(false);
      navigate(`/courses/${createdCourseId}?tab=description`, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create course.';
      setQuickCreateError(msg);
    }
  };

  const openDeleteModal = (course) => {
    if (!course?._id) return;
    setDeleteTargetCourse(course);
  };

  const closeDeleteModal = () => {
    if (deletingCourseId) return;
    setDeleteTargetCourse(null);
  };

  const handleConfirmDelete = async () => {
    const courseId = deleteTargetCourse?._id;
    if (!courseId || deletingCourseId) return;

    setDeletingCourseId(courseId);
    try {
      const response = await deleteCourse(courseId);
      setCourses((prev) =>
        Array.isArray(prev) ? prev.filter((course) => course?._id !== courseId) : []
      );
      await fetchCourses();
      setToast({
        type: 'success',
        message: response?.message || 'Course deleted successfully.',
      });
      setDeleteTargetCourse(null);
    } catch (err) {
      const statusCode = err?.response?.status;
      const errorCode = err?.response?.data?.code;
      const dependencyMessage =
        'Cannot delete course because it is assigned to a semester/batch. Remove assignment first.';
      const message =
        statusCode === 409 || errorCode === 'COURSE_ASSIGNED'
          ? dependencyMessage
          : err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            'Failed to delete course.';
      setToast({ type: 'error', message });
    } finally {
      setDeletingCourseId('');
    }
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
        <div className="flex items-center space-x-3">
          <button
            onClick={() => openQuickCreate('')}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
        </div>
      </div>

      <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
        All Courses
        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
          {allCount}
        </span>
      </div>

      {/* Course List */}
      {error ? (
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <div className="text-center py-8">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Unable to load courses</h2>
            <p className="text-red-700 text-sm">Please re-authenticate and retry.</p>
          </div>
        </div>
      ) : searchedCourses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery.trim() ? 'No Matching Courses' : 'No Courses Found'}
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              {searchQuery.trim()
                ? 'Try a different search term.'
                : 'Get started by creating your first course.'}
            </p>
            {!searchQuery.trim() && (
              <p className="text-xs text-gray-500">Use the top-right Create Course button.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {searchedCourses.map((course) => {
            const assignedTeachers = Array.isArray(course.assignedTeachers)
              ? course.assignedTeachers
              : [];
            const studentCount =
              course?.stats?.enrolledStudentsCount ??
              course?.studentCount ??
              0;
            const courseId = course?._id;

            return (
              <div
                key={courseId || `${course.courseCode}-${course.title}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-base font-semibold text-gray-900">
                      Course Code: {course.courseCode || "N/A"}
                    </h2>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3 text-xs text-gray-600">
                        <div className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {assignedTeachers.length} Teachers
                        </div>
                        <div className="flex items-center">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          {studentCount} Students
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={courseId ? `/courses/${courseId}?tab=description` : "/courses/list"}
                          className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Manage
                        </Link>
                        <Link
                          to={courseId ? `/courses/${courseId}?tab=material` : "/courses/list"}
                          className="inline-flex items-center px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
                        >
                          <FileUp className="w-3 h-3 mr-1" />
                          Materials
                        </Link>
                        <Link
                          to={courseId ? `/courses/${courseId}?tab=students` : "/courses/list"}
                          className="inline-flex items-center px-2 py-1 bg-slate-600 text-white text-xs font-medium rounded hover:bg-slate-700 transition-colors"
                        >
                          <Users className="w-3 h-3 mr-1" />
                          Students
                        </Link>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(course)}
                          disabled={!courseId || deletingCourseId === courseId}
                          className="inline-flex items-center px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          {deletingCourseId === courseId ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {course.title}
                          </h3>
                          {course.courseType && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              course.courseType === "theory" ? "bg-blue-100 text-blue-800" :
                              course.courseType === "practical" ? "bg-green-100 text-green-800" :
                              course.courseType === "project" ? "bg-orange-100 text-orange-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {course.courseType.charAt(0).toUpperCase() + course.courseType.slice(1)}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-xs leading-relaxed mb-3 line-clamp-2">
                          {course.aboutCourse}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ml-4 ${
                        course.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {course.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <h4 className="font-medium text-gray-900 flex items-center text-sm">
                          <User className="w-3 h-3 mr-1" />
                          Assigned Teachers
                        </h4>
                        <div className="bg-gray-50 p-2 rounded">
                          {assignedTeachers.length > 0 ? (
                            assignedTeachers.map((teacher, index) => (
                              <div
                                key={teacher._id || teacher.email || `${courseId}-teacher-${index}`}
                                className="mb-1 last:mb-0"
                              >
                                <p className="font-medium text-gray-900 text-sm">
                                  {teacher.name || teacher.email}
                                </p>
                                <p className="text-xs text-gray-600">{teacher.email || "N/A"}</p>
                                {teacher.roleLabel && (
                                  <p className="text-[11px] text-gray-500">{teacher.roleLabel}</p>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-600">Unassigned</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-medium text-gray-900 flex items-center text-sm">
                          <Calendar className="w-3 h-3 mr-1" />
                          {getPeriodLabel(course.semester?.batch?.program?.periodType)}
                        </h4>
                        <div className="bg-gray-50 p-2 rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {course.semester?.name || "No semester"}
                              </p>
                              <p className="text-xs text-gray-600">
                                {formatDate(course.semester?.startDate)} - {formatDate(course.semester?.endDate)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleChangeSemesterClick(course)}
                              className="ml-2 px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100 transition-colors"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        Created: {formatDate(course.createdAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Updated: {formatDate(course.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Create Modal */}
      {quickCreateOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create Course</h2>
              <button
                onClick={closeQuickCreate}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {quickCreateError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {quickCreateError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
                <input
                  type="text"
                  value={quickCreateCode}
                  onChange={(e) => setQuickCreateCode(e.target.value)}
                  placeholder="e.g. CM101"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
                <input
                  type="text"
                  value={quickCreateTitle}
                  onChange={(e) => setQuickCreateTitle(e.target.value)}
                  placeholder="Enter course title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={closeQuickCreate}
                  disabled={creating}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickCreate}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {creating ? 'Creating...' : 'Create & Open'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      {deleteTargetCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Delete Course</h2>
              <button
                onClick={closeDeleteModal}
                disabled={Boolean(deletingCourseId)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete this course?
              </p>
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <p className="font-medium text-gray-900">{deleteTargetCourse?.title || 'Untitled Course'}</p>
                <p className="text-gray-600">{deleteTargetCourse?.courseCode || 'N/A'}</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={closeDeleteModal}
                  disabled={Boolean(deletingCourseId)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={Boolean(deletingCourseId)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {deletingCourseId ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Semester Modal */}
      {changeSemesterCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Change {getPeriodLabel(semesters.find(s => s._id === changeSemesterCourse?.semester?._id)?.batch?.program?.periodType)}</h2>
              <button
                onClick={() => { setChangeSemesterCourse(null); setSelectedSemesterId(''); }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Course</p>
                <p className="font-medium text-gray-900">{changeSemesterCourse.title}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Current {getPeriodLabel(semesters.find(s => s._id === changeSemesterCourse?.semester?._id)?.batch?.program?.periodType)}</p>
                <p className="font-medium text-gray-900">{changeSemesterCourse.semester?.name || 'None'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New {getPeriodLabel(semesters.find(s => s._id === changeSemesterCourse?.semester?._id)?.batch?.program?.periodType)} *</label>
                <select
                  value={selectedSemesterId}
                  onChange={(e) => setSelectedSemesterId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select {getPeriodLabel(semesters.find(s => s._id === changeSemesterCourse?.semester?._id)?.batch?.program?.periodType)}</option>
                  {semesters.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => { setChangeSemesterCourse(null); setSelectedSemesterId(''); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSemesterUpdate}
                  disabled={!selectedSemesterId || updating}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-white transition-colors ${
                    !selectedSemesterId || updating
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{updating ? 'Updating...' : `Update ${getPeriodLabel(semesters.find(s => s._id === changeSemesterCourse?.semester?._id)?.batch?.program?.periodType)}`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
