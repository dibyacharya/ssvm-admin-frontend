import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, Edit3, Trash2, RefreshCw, X, Save } from 'lucide-react';
import {
  getAllSemester,
  createSemester,
  updateSemester,
  deleteSemester,
} from '../../services/semester.services';
import { getPeriodLabel } from '../../utils/periodLabel';
import { calculateEndDate } from '../../utils/dateCalculator';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  upcoming: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800',
};

const SemesterManager = ({ batchId, periodType = 'semester', programTotalCredits = 0 }) => {
  // Semester list state
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingSemesterId, setDeletingSemesterId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Create form state
  const [formData, setFormData] = useState({
    name: '',
    semNumber: '',
    startDate: '',
    endDate: '',
    midTermExamDate: '',
    endTermExamDate: '',
    totalCredits: '',
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    semNumber: '',
    startDate: '',
    endDate: '',
    midTermExamDate: '',
    endTermExamDate: '',
    totalCredits: '',
  });

  // Fetch semesters on mount and when batchId changes
  useEffect(() => {
    if (batchId) {
      fetchSemesters();
    }
  }, [batchId]);

  // Auto-compute endDate for create form
  useEffect(() => {
    if (formData.startDate && periodType) {
      const computed = calculateEndDate(formData.startDate, periodType);
      if (computed) {
        setFormData(prev => ({ ...prev, endDate: computed }));
      }
    }
  }, [formData.startDate, periodType]);

  // Auto-compute endDate for edit form
  useEffect(() => {
    if (editFormData.startDate && periodType) {
      const computed = calculateEndDate(editFormData.startDate, periodType);
      if (computed) {
        setEditFormData(prev => ({ ...prev, endDate: computed }));
      }
    }
  }, [editFormData.startDate, periodType]);

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSemester();
      const allSemesters = Array.isArray(data) ? data : data.semesters || [];
      // Filter client-side by batchId
      const filtered = allSemesters.filter(s => {
        const semBatchId = typeof s.batch === 'object' ? s.batch?._id : s.batch;
        return semBatchId === batchId;
      });
      setSemesters(filtered);
    } catch (err) {
      setError('Failed to fetch semester data');
      console.error('Error fetching semester data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetCreateForm = () => {
    setFormData({
      name: '',
      semNumber: '',
      startDate: '',
      endDate: '',
      midTermExamDate: '',
      endTermExamDate: '',
      totalCredits: '',
    });
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    const newCredits = Number(formData.totalCredits) || 0;
    if (programTotalCredits > 0 && newCredits > 0 && (assignedCredits + newCredits) > programTotalCredits) {
      setError(`Adding ${newCredits} credits would exceed the program total of ${programTotalCredits} credits (currently assigned: ${assignedCredits}).`);
      return;
    }
    try {
      setCreating(true);
      setError(null);

      const semesterData = {
        name: formData.name,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        batch: batchId,
      };

      if (formData.semNumber) {
        semesterData.semNumber = Number(formData.semNumber);
      }
      if (formData.midTermExamDate) {
        semesterData.midTermExamDate = new Date(formData.midTermExamDate).toISOString();
      }
      if (formData.endTermExamDate) {
        semesterData.endTermExamDate = new Date(formData.endTermExamDate).toISOString();
      }
      if (formData.totalCredits) {
        semesterData.totalCredits = Number(formData.totalCredits);
      }

      await createSemester(semesterData);
      await fetchSemesters();
      resetCreateForm();
      setShowCreateForm(false);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create semester';
      setError(msg);
      console.error('Error creating semester:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (semester) => {
    setEditingSemester(semester);
    setEditFormData({
      name: semester.name || '',
      semNumber: semester.semNumber?.toString() || '',
      startDate: semester.startDate ? semester.startDate.split('T')[0] : '',
      endDate: semester.endDate ? semester.endDate.split('T')[0] : '',
      midTermExamDate: semester.midTermExamDate ? semester.midTermExamDate.split('T')[0] : '',
      endTermExamDate: semester.endTermExamDate ? semester.endTermExamDate.split('T')[0] : '',
      totalCredits: semester.totalCredits?.toString() || '',
    });
    setShowEditForm(true);
  };

  const handleUpdateSemester = async (e) => {
    e.preventDefault();
    const newCredits = Number(editFormData.totalCredits) || 0;
    const oldCredits = Number(editingSemester.totalCredits) || 0;
    const wouldBeAssigned = assignedCredits - oldCredits + newCredits;
    if (programTotalCredits > 0 && newCredits > 0 && wouldBeAssigned > programTotalCredits) {
      setError(`Setting ${newCredits} credits would exceed the program total of ${programTotalCredits} credits (other semesters: ${assignedCredits - oldCredits}).`);
      return;
    }
    try {
      setUpdating(true);
      setError(null);

      const updateData = {
        name: editFormData.name,
        startDate: new Date(editFormData.startDate).toISOString(),
        endDate: new Date(editFormData.endDate).toISOString(),
        batch: batchId,
      };

      if (editFormData.semNumber) {
        updateData.semNumber = Number(editFormData.semNumber);
      }
      if (editFormData.midTermExamDate) {
        updateData.midTermExamDate = new Date(editFormData.midTermExamDate).toISOString();
      }
      if (editFormData.endTermExamDate) {
        updateData.endTermExamDate = new Date(editFormData.endTermExamDate).toISOString();
      }
      if (editFormData.totalCredits) {
        updateData.totalCredits = Number(editFormData.totalCredits);
      }

      await updateSemester(editingSemester._id, updateData);
      setShowEditForm(false);
      setEditingSemester(null);
      await fetchSemesters();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update semester';
      setError(msg);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (semesterId) => {
    setDeletingSemesterId(semesterId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      await deleteSemester(deletingSemesterId);
      setShowDeleteConfirm(false);
      setDeletingSemesterId(null);
      await fetchSemesters();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to delete semester';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Unknown duration';
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} weeks (${diffDays} days)`;
    } catch {
      return 'Unknown duration';
    }
  };

  const periodLabel = getPeriodLabel(periodType);

  // Credit tracking
  const assignedCredits = semesters.reduce((sum, sem) => sum + (Number(sem.totalCredits) || 0), 0);
  const remainingCredits = programTotalCredits > 0 ? programTotalCredits - assignedCredits : null;

  // Loading state
  if (loading && semesters.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading {periodLabel} Data</h2>
            <p className="text-gray-600">Please wait while we fetch the scheduling information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{periodLabel}s</h2>
              <p className="text-gray-600">Manage {periodLabel.toLowerCase()}s for this batch</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchSemesters}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add {periodLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Credit Tracking */}
      {programTotalCredits > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">
              Program Credits: <span className="font-semibold text-gray-900">{programTotalCredits}</span>
            </span>
            <span className="text-gray-600">
              Assigned: <span className={`font-semibold ${assignedCredits > programTotalCredits ? 'text-red-600' : 'text-gray-900'}`}>{assignedCredits}</span>
              {remainingCredits !== null && (
                <span className="ml-2 text-gray-400">
                  ({remainingCredits >= 0 ? `${remainingCredits} remaining` : `${Math.abs(remainingCredits)} over`})
                </span>
              )}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${assignedCredits > programTotalCredits ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, (assignedCredits / programTotalCredits) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Semesters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {semesters.map((semester) => (
          <div
            key={semester._id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{semester.name}</h3>
                  {semester.semNumber && (
                    <p className="text-sm text-gray-500">{periodLabel} #{semester.semNumber}</p>
                  )}
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleEditClick(semester)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(semester._id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {/* Status badge */}
              {semester.status && (
                <div>
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[semester.status] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {semester.status}
                  </span>
                </div>
              )}

              {/* Duration info */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Duration</p>
                <p className="text-sm text-gray-600">
                  {calculateDuration(semester.startDate, semester.endDate)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Start Date</p>
                <p className="text-sm text-gray-600">{formatDate(semester.startDate)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">End Date</p>
                <p className="text-sm text-gray-600">{formatDate(semester.endDate)}</p>
              </div>

              {/* Mid-Term Exam Date */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Mid-Term Exam Date</p>
                <p className="text-sm text-gray-600">{formatDate(semester.midTermExamDate)}</p>
              </div>

              {/* End-Term Exam Date */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">End-Term Exam Date</p>
                <p className="text-sm text-gray-600">{formatDate(semester.endTermExamDate)}</p>
              </div>

              {/* Total Credits */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Total Credits</p>
                <p className="text-sm text-gray-600">
                  {semester.totalCredits != null ? semester.totalCredits : 'Not set'}
                </p>
              </div>

              {/* Course count */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Courses</p>
                <p className="text-sm text-gray-600">
                  {semester.courses?.length === 0
                    ? 'No courses assigned'
                    : `${semester.courses?.length || 0} courses`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {semesters.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No {periodLabel}s Found</h2>
            <p className="text-gray-600 mb-4">
              Get started by creating your first {periodLabel.toLowerCase()}.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create {periodLabel}
            </button>
          </div>
        </div>
      )}

      {/* Create Semester Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Create New {periodLabel}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetCreateForm();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSemester} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {periodLabel} Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Fall 2024, Spring 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {periodLabel} Number
                </label>
                <input
                  type="number"
                  name="semNumber"
                  value={formData.semNumber}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="e.g., 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                  {formData.startDate && (
                    <span className="text-xs text-gray-400 ml-1">(auto-computed, can override)</span>
                  )}
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mid-Term Exam Date
                </label>
                <input
                  type="date"
                  name="midTermExamDate"
                  value={formData.midTermExamDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End-Term Exam Date
                </label>
                <input
                  type="date"
                  name="endTermExamDate"
                  value={formData.endTermExamDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Credits
                </label>
                <input
                  type="number"
                  name="totalCredits"
                  value={formData.totalCredits}
                  onChange={handleInputChange}
                  min="0"
                  max={remainingCredits != null && remainingCredits > 0 ? remainingCredits : undefined}
                  placeholder={remainingCredits != null && remainingCredits > 0 ? `max ${remainingCredits}` : 'e.g., 24'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {remainingCredits != null && remainingCredits > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{remainingCredits} of {programTotalCredits} program credits remaining</p>
                )}
                {formData.totalCredits && Number(formData.totalCredits) > 0 && remainingCredits != null && Number(formData.totalCredits) > remainingCredits && (
                  <p className="text-xs text-red-500 mt-1">Exceeds remaining program credits ({remainingCredits})</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-white transition-colors ${
                    creating
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{creating ? 'Creating...' : `Create ${periodLabel}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Semester Modal */}
      {showEditForm && editingSemester && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit {periodLabel}</h2>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingSemester(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSemester} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {periodLabel} Number
                </label>
                <input
                  type="number"
                  name="semNumber"
                  value={editFormData.semNumber}
                  onChange={handleEditInputChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={editFormData.startDate}
                  onChange={handleEditInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                  {editFormData.startDate && (
                    <span className="text-xs text-gray-400 ml-1">(auto-computed, can override)</span>
                  )}
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={editFormData.endDate}
                  onChange={handleEditInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mid-Term Exam Date
                </label>
                <input
                  type="date"
                  name="midTermExamDate"
                  value={editFormData.midTermExamDate}
                  onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End-Term Exam Date
                </label>
                <input
                  type="date"
                  name="endTermExamDate"
                  value={editFormData.endTermExamDate}
                  onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Credits
                </label>
                {(() => {
                  const oldCr = Number(editingSemester?.totalCredits) || 0;
                  const editRemaining = programTotalCredits > 0 ? programTotalCredits - assignedCredits + oldCr : null;
                  return (
                    <>
                      <input
                        type="number"
                        name="totalCredits"
                        value={editFormData.totalCredits}
                        onChange={handleEditInputChange}
                        min="0"
                        max={editRemaining != null && editRemaining > 0 ? editRemaining : undefined}
                        placeholder={editRemaining != null && editRemaining > 0 ? `max ${editRemaining}` : 'e.g., 24'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {editRemaining != null && editRemaining > 0 && (
                        <p className="text-xs text-gray-400 mt-1">{editRemaining} credits available for this {periodLabel.toLowerCase()}</p>
                      )}
                      {editFormData.totalCredits && Number(editFormData.totalCredits) > 0 && editRemaining != null && Number(editFormData.totalCredits) > editRemaining && (
                        <p className="text-xs text-red-500 mt-1">Exceeds available program credits ({editRemaining})</p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingSemester(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-white transition-colors ${
                    updating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{updating ? 'Updating...' : `Update ${periodLabel}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Delete {periodLabel}</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {periodLabel.toLowerCase()}? This action cannot be
              undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingSemesterId(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className={`px-4 py-2 rounded-md text-white transition-colors ${
                  deleting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemesterManager;
