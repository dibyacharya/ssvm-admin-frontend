import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Save,
  Eye,
  Plus,
  GraduationCap
} from 'lucide-react';
import {
  getAllBatches,
  createBatch,
  updateBatch,
  deleteBatch
} from '../services/batch.service';
import { getProgramsDropdown } from '../services/program.service';
import { calculateBatchEndDate, formatMonthYear } from '../utils/dateCalculator';
import { getPeriodLabel } from '../utils/periodLabel';

const statusColors = {
  upcoming: 'bg-blue-100 text-blue-800',
  ongoing: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  graduated: 'bg-gray-100 text-gray-800',
  archived: 'bg-gray-100 text-gray-800'
};

const normalizeStatus = (status) => {
  if (!status) return 'upcoming';
  if (status === 'active') return 'ongoing';
  if (status === 'graduated') return 'completed';
  return status;
};

const BatchManagement = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    program: '',
    year: '',
    name: '',
    cohort: '',
    startDate: '',
    expectedEndDate: '',
    maxStrength: ''
  });

  // --- Create Batch modal state ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [createFormData, setCreateFormData] = useState({
    program: '',
    year: new Date().getFullYear().toString(),
    name: '',
    cohort: '',
    startDate: '',
    expectedEndDate: '',
    maxStrength: ''
  });

  const itemsPerPage = 10;

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [currentPage, filterProgram, filterStatus]);

  // Auto-compute batch name and end date when create form inputs change
  useEffect(() => {
    if (!showCreateModal || !selectedProgram) return;
    const { startDate } = createFormData;
    const updates = {};

    // Auto-name from start date
    if (startDate) {
      const autoName = formatMonthYear(startDate);
      if (autoName) updates.name = autoName;
    }

    // Auto-compute expected end date
    if (startDate && selectedProgram.periodType && selectedProgram.totalSemesters) {
      const endDate = calculateBatchEndDate(startDate, selectedProgram.periodType, selectedProgram.totalSemesters);
      if (endDate) updates.expectedEndDate = endDate;
    }

    if (Object.keys(updates).length > 0) {
      setCreateFormData(prev => ({ ...prev, ...updates }));
    }
  }, [createFormData.startDate, selectedProgram, showCreateModal]);

  const fetchPrograms = async () => {
    try {
      const data = await getProgramsDropdown();
      setPrograms(data || []);
    } catch (err) {
      console.error('Error fetching programs dropdown:', err);
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page: currentPage, limit: itemsPerPage };
      if (filterProgram !== 'all') params.program = filterProgram;
      if (filterStatus !== 'all') params.status = filterStatus;
      const data = await getAllBatches(params);
      setBatches(data.batches || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError('Failed to fetch batches');
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      program: '',
      year: '',
      name: '',
      cohort: '',
      startDate: '',
      expectedEndDate: '',
      maxStrength: ''
    });
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setFormData({
      program: batch.program?._id || '',
      year: batch.year?.toString() || '',
      name: batch.name || '',
      cohort: batch.cohort || '',
      startDate: batch.startDate ? batch.startDate.split('T')[0] : '',
      expectedEndDate: batch.expectedEndDate ? batch.expectedEndDate.split('T')[0] : '',
      maxStrength: batch.maxStrength?.toString() || ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await updateBatch(editingBatch._id, {
        name: formData.name,
        cohort: formData.cohort,
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate,
        maxStrength: formData.maxStrength ? Number(formData.maxStrength) : 0
      });
      resetForm();
      setShowEditModal(false);
      setEditingBatch(null);
      await fetchBatches();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update batch';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (batch) => {
    if (!window.confirm(`Are you sure you want to delete batch "${batch.name}"?`)) return;
    try {
      setError(null);
      await deleteBatch(batch._id);
      await fetchBatches();
    } catch (err) {
      const errData = err.response?.data;
      const msg = errData?.error || 'Failed to delete batch';
      const hint = errData?.hint ? ` ${errData.hint}` : '';
      setError(`${msg}${hint}`);
    }
  };

  // --- Create Batch handlers ---
  const openCreateModal = () => {
    setCreateError(null);
    setSelectedProgram(null);
    setCreateFormData({
      program: '',
      year: new Date().getFullYear().toString(),
      name: '',
      cohort: '',
      startDate: '',
      expectedEndDate: '',
      maxStrength: ''
    });
    setShowCreateModal(true);
  };

  const handleCreateInputChange = (e) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProgramSelect = (e) => {
    const programId = e.target.value;
    setCreateFormData(prev => ({ ...prev, program: programId }));
    const prog = programs.find(p => p._id === programId);
    setSelectedProgram(prog || null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createFormData.program || !createFormData.startDate) {
      setCreateError('Program and Start Date are required.');
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const payload = {
        program: createFormData.program,
        year: Number(createFormData.year) || new Date().getFullYear(),
        name: createFormData.name || formatMonthYear(createFormData.startDate) || 'New Batch',
        startDate: createFormData.startDate,
      };
      if (createFormData.expectedEndDate) payload.expectedEndDate = createFormData.expectedEndDate;
      if (createFormData.maxStrength) payload.maxStrength = Number(createFormData.maxStrength);
      if (createFormData.cohort) payload.cohort = createFormData.cohort;

      await createBatch(payload);
      setShowCreateModal(false);
      await fetchBatches();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to create batch.';
      setCreateError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const totalPages = pagination?.pages || 1;

  if (loading && batches.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Batches</h2>
            <p className="text-gray-600">Please wait...</p>
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Layers className="w-8 h-8 text-blue-600 mr-3" />
              Batch Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage batches for your programs.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchBatches}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Batch
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
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filterMonth}
            onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Months</option>
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            {pagination?.total || batches.length} batches
          </span>
        </div>

        <div className="divide-y divide-gray-200">
          {/* Table Header */}
          <div className="px-6 py-3 bg-gray-50 grid grid-cols-8 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-2">Batch Name</div>
            <div>Program</div>
            <div>Year</div>
            <div>Start Date</div>
            <div>End Date</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {batches.map((batch) => (
            <div
              key={batch._id}
              onClick={() => navigate(`/batch-detail/${batch._id}`)}
              className="px-6 py-4 hover:bg-gray-50 grid grid-cols-8 gap-4 items-center cursor-pointer"
            >
              <div className="col-span-2">
                <div className="text-sm font-medium text-gray-900">{batch.name}</div>
                {batch.cohort && (
                  <div className="text-xs text-gray-500">Cohort: {batch.cohort}</div>
                )}
                {batch.maxStrength > 0 && (
                  <div className="text-xs text-gray-500">Max: {batch.maxStrength} students</div>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {batch.program?.code || batch.program?.name || '-'}
              </div>
              <div className="text-sm text-gray-600">{batch.year}</div>
              <div className="text-sm text-gray-600">{formatDate(batch.startDate)}</div>
              <div className="text-sm text-gray-600">{formatDate(batch.expectedEndDate)}</div>
              <div>
                {(() => {
                  const displayStatus = normalizeStatus(batch.status);
                  return (
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[displayStatus] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {displayStatus}
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/batch-detail/${batch._id}`);
                  }}
                  className="p-1 text-gray-400 hover:text-green-600"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(batch);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(batch);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {batches.length === 0 && !loading && (
          <div className="text-center py-12">
            <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Batches Found</h2>
            <p className="text-gray-600 mb-4">Click "Add Batch" to create one.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages} ({pagination?.total || 0} total)
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
      </div>

      {/* Edit Modal */}
      {showEditModal && editingBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Batch</h2>
              <button
                onClick={() => { setShowEditModal(false); setEditingBatch(null); }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                <input
                  type="text"
                  value={programs.find(p => p._id === formData.program)?.name || formData.program}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cohort Mapping</label>
                <input
                  type="text"
                  name="cohort"
                  value={formData.cohort}
                  onChange={handleInputChange}
                  placeholder="e.g., Cohort 2024-A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    name="expectedEndDate"
                    value={formData.expectedEndDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Strength</label>
                <input
                  type="number"
                  name="maxStrength"
                  value={formData.maxStrength}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="0 = unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingBatch(null); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-white transition-colors ${
                    submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? 'Updating...' : 'Update Batch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add Batch</h2>
                <p className="text-sm text-gray-500 mt-1">Create a new batch for a program.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {createError}
                </div>
              )}

              {/* Program selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program *</label>
                <select
                  name="program"
                  value={createFormData.program}
                  onChange={handleProgramSelect}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a program...</option>
                  {programs.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              {/* Program info banner */}
              {selectedProgram && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">{selectedProgram.name}</span>
                    {selectedProgram.code && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{selectedProgram.code}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                    <div>Period Type: <span className="font-medium">{getPeriodLabel(selectedProgram.periodType)}</span></div>
                    <div>Total {getPeriodLabel(selectedProgram.periodType)}s: <span className="font-medium">{selectedProgram.totalSemesters ?? '-'}</span></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <input
                    type="number"
                    name="year"
                    value={createFormData.year}
                    onChange={handleCreateInputChange}
                    required
                    min="2000"
                    max="2100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={createFormData.startDate}
                    onChange={handleCreateInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                  <input
                    type="text"
                    name="name"
                    value={createFormData.name}
                    onChange={handleCreateInputChange}
                    placeholder="Auto-filled from start date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-400 mt-1 block">Auto-computed from start date</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected End Date</label>
                  <input
                    type="date"
                    name="expectedEndDate"
                    value={createFormData.expectedEndDate}
                    onChange={handleCreateInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-400 mt-1 block">Auto-computed from program duration</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Strength</label>
                <input
                  type="number"
                  name="maxStrength"
                  value={createFormData.maxStrength}
                  onChange={handleCreateInputChange}
                  min="0"
                  placeholder="0 = unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting || !createFormData.program}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-white transition-colors ${
                    createSubmitting || !createFormData.program ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{createSubmitting ? 'Creating...' : 'Create Batch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchManagement;
