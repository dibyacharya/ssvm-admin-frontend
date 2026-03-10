import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, Edit3, Trash2, RefreshCw, X, Save } from 'lucide-react';
import { getAllSemester, createSemester, updateSemester, deleteSemester } from '../services/semester.services';
import { getProgramsDropdown } from '../services/program.service';
import { getBatchesDropdown } from '../services/batch.service';
import { getPeriodLabel } from '../utils/periodLabel';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  upcoming: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800'
};

export const Scheduling = () => {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Filters
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterPeriodType, setFilterPeriodType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Dropdown data
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedPeriodType, setSelectedPeriodType] = useState(null);

  // Edit state
  const [editingSemester, setEditingSemester] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Delete state
  const [deletingSemesterId, setDeletingSemesterId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    semNumber: '',
    startDate: '',
    endDate: '',
    selectedProgram: '',
    batch: ''
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    semNumber: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchPrograms();
    fetchSemesterData();
  }, []);

  useEffect(() => {
    if (formData.selectedProgram) {
      fetchBatches(formData.selectedProgram);
      const selectedProg = programs.find(p => p._id === formData.selectedProgram);
      setSelectedPeriodType(selectedProg?.periodType || null);
    } else {
      setBatches([]);
      setFormData(prev => ({ ...prev, batch: '' }));
      setSelectedPeriodType(null);
    }
  }, [formData.selectedProgram]);

  const fetchPrograms = async () => {
    try {
      const data = await getProgramsDropdown();
      setPrograms(data || []);
    } catch (err) {
      console.error('Error fetching programs:', err);
    }
  };

  const fetchBatches = async (programId) => {
    try {
      const data = await getBatchesDropdown(programId);
      setBatches(data || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
      setBatches([]);
    }
  };

  const fetchSemesterData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSemester();
      setSemesters(Array.isArray(data) ? data : data.semesters || []);
    } catch (err) {
      setError('Failed to fetch semester data');
      console.error('Error fetching semester data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering
  const filteredSemesters = useMemo(() => {
    let result = semesters;
    if (filterProgram !== 'all') {
      result = result.filter(s => s.batch?.program?._id === filterProgram);
    }
    if (filterPeriodType !== 'all') {
      result = result.filter(s => s.batch?.program?.periodType === filterPeriodType);
    }
    if (filterStatus !== 'all') {
      result = result.filter(s => s.status === filterStatus);
    }
    return result;
  }, [semesters, filterProgram, filterPeriodType, filterStatus]);

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(filteredSemesters.length / itemsPerPage));
  const paginatedSemesters = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSemesters.slice(start, start + itemsPerPage);
  }, [filteredSemesters, currentPage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();

    try {
      setCreating(true);

      const semesterData = {
        name: formData.name,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString()
      };

      if (formData.batch) {
        semesterData.batch = formData.batch;
      }
      if (formData.semNumber) {
        semesterData.semNumber = Number(formData.semNumber);
      }

      await createSemester(semesterData);

      await fetchSemesterData();

      setFormData({ name: '', semNumber: '', startDate: '', endDate: '', selectedProgram: '', batch: '' });
      setSelectedPeriodType(null);
      setShowCreateForm(false);

    } catch (err) {
      console.error('Error creating semester:', err);
      setError('Failed to create semester');
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
      endDate: semester.endDate ? semester.endDate.split('T')[0] : ''
    });
    setShowEditForm(true);
  };

  const handleUpdateSemester = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      setError(null);
      const updateData = {
        name: editFormData.name,
        startDate: new Date(editFormData.startDate).toISOString(),
        endDate: new Date(editFormData.endDate).toISOString()
      };
      if (editFormData.semNumber) {
        updateData.semNumber = Number(editFormData.semNumber);
      }
      await updateSemester(editingSemester._id, updateData);
      setShowEditForm(false);
      setEditingSemester(null);
      await fetchSemesterData();
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
      await fetchSemesterData();
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
        day: 'numeric'
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

  if (loading && semesters.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Schedule Data</h2>
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Scheduling & Timetables</h1>
              <p className="text-gray-600">Manage academic schedules and period information</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Period</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={filterProgram}
            onChange={(e) => { setFilterProgram(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Programs</option>
            {programs.map(p => (
              <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
            ))}
          </select>
          <select
            value={filterPeriodType}
            onChange={(e) => { setFilterPeriodType(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="semester">Semester</option>
            <option value="term">Term</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Semesters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedSemesters.map((semester) => (
          <div key={semester._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{semester.name}</h3>
                  <p className="text-sm text-gray-500">ID: {semester._id.slice(-8)}</p>
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
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    statusColors[semester.status] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {semester.status}
                  </span>
                </div>
              )}

              {/* Batch/Program info */}
              {semester.batch && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Batch / Program</p>
                  <p className="text-sm text-gray-600">
                    {semester.batch.name || semester.batch}
                    {semester.batch.program && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({semester.batch.program.code || semester.batch.program.name})
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Duration</p>
                <p className="text-sm text-gray-600">{calculateDuration(semester.startDate, semester.endDate)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Start Date</p>
                <p className="text-sm text-gray-600">{formatDate(semester.startDate)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">End Date</p>
                <p className="text-sm text-gray-600">{formatDate(semester.endDate)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Courses</p>
                <p className="text-sm text-gray-600">
                  {semester.courses?.length === 0 ? 'No courses assigned' : `${semester.courses?.length || 0} courses`}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Created</p>
                <p className="text-sm text-gray-600">{formatDate(semester.createdAt)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredSemesters.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No {filterPeriodType !== 'all' ? getPeriodLabel(filterPeriodType) : 'Period'}s Found</h2>
            <p className="text-gray-600 mb-4">Get started by creating your first {filterPeriodType !== 'all' ? getPeriodLabel(filterPeriodType).toLowerCase() : 'period'}.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Period
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages} ({filteredSemesters.length} total)
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-3 py-1 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    currentPage === page
                      ? 'text-white bg-blue-600'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-3 py-1 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Semester Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New {getPeriodLabel(selectedPeriodType)}</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSemester} className="p-6 space-y-4">
              {/* Program Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                <select
                  name="selectedProgram"
                  value={formData.selectedProgram}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Program (optional)</option>
                  {programs.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              {/* Batch Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                <select
                  name="batch"
                  value={formData.batch}
                  onChange={handleInputChange}
                  disabled={!formData.selectedProgram}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="">Select Batch (optional)</option>
                  {batches.map(b => (
                    <option key={b._id} value={b._id}>{b.name} ({b.year})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{getPeriodLabel(selectedPeriodType)} Name *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{getPeriodLabel(selectedPeriodType)} Number</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
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
                  <span>{creating ? 'Creating...' : `Create ${getPeriodLabel(selectedPeriodType)}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Semester Modal */}
      {showEditForm && editingSemester && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit {getPeriodLabel(editingSemester?.batch?.program?.periodType)}</h2>
              <button
                onClick={() => { setShowEditForm(false); setEditingSemester(null); }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{getPeriodLabel(editingSemester?.batch?.program?.periodType)} Number</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={editFormData.endDate}
                  onChange={handleEditInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditForm(false); setEditingSemester(null); }}
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
                  <span>{updating ? 'Updating...' : `Update ${getPeriodLabel(editingSemester?.batch?.program?.periodType)}`}</span>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Delete {getPeriodLabel(semesters.find(s => s._id === deletingSemesterId)?.batch?.program?.periodType)}</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this {getPeriodLabel(semesters.find(s => s._id === deletingSemesterId)?.batch?.program?.periodType).toLowerCase()}? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletingSemesterId(null); }}
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
