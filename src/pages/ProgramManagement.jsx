import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Save,
  Filter,
  Eye
} from 'lucide-react';
import {
  getAllPrograms,
  createProgram,
  updateProgram,
  deleteProgram
} from '../services/program.service';
import { getTeachers } from '../services/user.service';
import { getPeriodLabel } from '../utils/periodLabel';
import {
  MODE_OF_DELIVERY,
  MODE_OF_DELIVERY_OPTIONS,
  getModeOfDeliveryLabel,
  normalizeModeOfDeliveryValue,
} from '../constants/modeOfDelivery';

const ProgramManagement = () => {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [filterSchool, setFilterSchool] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    totalSemesters: '',
    department: '',
    periodType: 'semester',
    school: '',
    stream: '',
    totalCredits: '',
    modeOfDelivery: MODE_OF_DELIVERY.REGULAR,
    programCoordinator: ''
  });

  const normalizeOptionalText = (value) => {
    if (value === null || value === undefined) return '';
    const trimmed = value.toString().trim();
    if (!trimmed) return '';
    if (['null', 'undefined', 'na', 'n/a'].includes(trimmed.toLowerCase())) {
      return '';
    }
    return trimmed;
  };

  const itemsPerPage = 10;

  useEffect(() => {
    fetchPrograms();
  }, [currentPage, filterDepartment, filterStatus, filterSchool, filterMode]);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const data = await getTeachers();
        setTeachers(data.users || data.teachers || []);
      } catch (err) {
        console.error('Error fetching teachers:', err);
      }
    };
    fetchTeachers();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page: currentPage, limit: itemsPerPage };
      if (filterDepartment !== 'all') params.department = filterDepartment;
      if (filterStatus !== 'all') params.isActive = filterStatus === 'active';
      if (filterSchool !== 'all') params.school = filterSchool;
      if (filterMode !== 'all') params.modeOfDelivery = filterMode;
      const data = await getAllPrograms(params);
      setPrograms(data.programs || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError('Failed to fetch programs');
      console.error('Error fetching programs:', err);
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
      name: '',
      code: '',
      description: '',
      totalSemesters: '',
      department: '',
      periodType: 'semester',
      school: '',
      stream: '',
      totalCredits: '',
      modeOfDelivery: MODE_OF_DELIVERY.REGULAR,
      programCoordinator: ''
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        ...formData,
        stream: normalizeOptionalText(formData.stream),
        modeOfDelivery:
          normalizeModeOfDeliveryValue(formData.modeOfDelivery) || MODE_OF_DELIVERY.REGULAR,
        totalSemesters: Number(formData.totalSemesters),
        totalCredits: formData.totalCredits ? Number(formData.totalCredits) : undefined
      };
      if (!payload.stream) delete payload.stream;

      await createProgram(payload);
      resetForm();
      setShowCreateModal(false);
      await fetchPrograms();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create program';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name || '',
      code: program.code || '',
      description: program.description || '',
      totalSemesters: program.totalSemesters?.toString() || '',
      department: program.department || '',
      periodType: program.periodType || 'semester',
      school: program.school || '',
      stream: normalizeOptionalText(program.stream),
      totalCredits: program.totalCredits?.toString() || '',
      modeOfDelivery:
        normalizeModeOfDeliveryValue(program.modeOfDelivery) || MODE_OF_DELIVERY.REGULAR,
      programCoordinator: program.programCoordinator?._id || program.programCoordinator || ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        name: formData.name,
        description: formData.description,
        totalSemesters: Number(formData.totalSemesters),
        department: formData.department,
        periodType: formData.periodType,
        isActive: editingProgram.isActive,
        school: formData.school,
        stream: normalizeOptionalText(formData.stream),
        totalCredits: formData.totalCredits ? Number(formData.totalCredits) : undefined,
        modeOfDelivery:
          normalizeModeOfDeliveryValue(formData.modeOfDelivery) || MODE_OF_DELIVERY.REGULAR,
        programCoordinator: formData.programCoordinator || undefined
      };
      if (!payload.stream) delete payload.stream;

      await updateProgram(editingProgram._id, payload);
      resetForm();
      setShowEditModal(false);
      setEditingProgram(null);
      await fetchPrograms();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update program';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (program) => {
    if (!window.confirm(`Are you sure you want to delete "${program.name}"?`)) return;
    try {
      setError(null);
      await deleteProgram(program._id);
      await fetchPrograms();
    } catch (err) {
      const errData = err.response?.data;
      const msg = errData?.error || 'Failed to delete program';
      const hint = errData?.hint ? ` ${errData.hint}` : '';
      setError(`${msg}${hint}`);
    }
  };

  const filteredPrograms = programs.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const departments = [...new Set(programs.map(p => p.department).filter(Boolean))];
  const schools = [...new Set(programs.map(p => p.school).filter(Boolean))];
  const modes = [
    ...new Set(
      programs
        .map((program) => normalizeModeOfDeliveryValue(program.modeOfDelivery))
        .filter(Boolean)
    )
  ];

  const totalPages = pagination?.pages || 1;

  if (loading && programs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Programs</h2>
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
              <GraduationCap className="w-8 h-8 text-blue-600 mr-3" />
              Program Management
            </h1>
            <p className="text-gray-600 mt-1">Manage academic programs</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchPrograms}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Program
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search programs..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => { setFilterDepartment(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={filterSchool}
            onChange={(e) => { setFilterSchool(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Schools</option>
            {schools.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterMode}
            onChange={(e) => { setFilterMode(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Modes</option>
            {modes.map(m => (
              <option key={m} value={m}>{getModeOfDeliveryLabel(m, m)}</option>
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
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700">
              {pagination?.total || filteredPrograms.length} programs
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {/* Table Header */}
          <div className="px-6 py-3 bg-gray-50 grid grid-cols-7 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div>Code</div>
            <div className="col-span-2">Name</div>
            <div>Department</div>
            <div>Mode</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {filteredPrograms.map((program) => (
            <div key={program._id} className="px-6 py-4 hover:bg-gray-50 grid grid-cols-7 gap-4 items-center">
              <div className="text-sm font-medium text-gray-900">{program.code}</div>
              <div className="col-span-2">
                <div className="text-sm font-medium text-gray-900">{program.name}</div>
                {program.description && (
                  <div className="text-xs text-gray-500 truncate">{program.description}</div>
                )}
              </div>
              <div className="text-sm text-gray-600">{program.department || '-'}</div>
              <div className="text-sm text-gray-600">
                {getModeOfDeliveryLabel(program.modeOfDelivery)}
              </div>
              <div>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  program.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {program.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate(`/programs/${program._id}/review`)}
                  className="p-1 text-gray-400 hover:text-green-600"
                  title="Review / View"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(program)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(program)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPrograms.length === 0 && !loading && (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Programs Found</h2>
            <p className="text-gray-600 mb-4">Get started by creating your first program.</p>
            <button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Program
            </button>
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Create New Program</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Bachelor of Technology"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program Code *</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., BTECH"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School / Department</label>
                  <input
                    type="text"
                    name="school"
                    value={formData.school}
                    onChange={handleInputChange}
                    placeholder="e.g., School of Engineering"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stream</label>
                  <input
                    type="text"
                    name="stream"
                    value={formData.stream}
                    onChange={handleInputChange}
                    placeholder="e.g., Computer Science"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode of Delivery</label>
                  <select
                    name="modeOfDelivery"
                    value={formData.modeOfDelivery}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MODE_OF_DELIVERY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Program description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Type</label>
                  <select
                    name="periodType"
                    value={formData.periodType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="semester">Semester</option>
                    <option value="term">Term</option>
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="days">Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total {getPeriodLabel(formData.periodType)}s *</label>
                  <input
                    type="number"
                    name="totalSemesters"
                    value={formData.totalSemesters}
                    onChange={handleInputChange}
                    required
                    min="1"
                    placeholder="e.g., 8"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Credits</label>
                  <input
                    type="number"
                    name="totalCredits"
                    value={formData.totalCredits}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="e.g., 160"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="e.g., Engineering"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Coordinator</label>
                <select
                  name="programCoordinator"
                  value={formData.programCoordinator}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Coordinator (optional)</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  <span>{submitting ? 'Creating...' : 'Create Program'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">Edit Program</h2>
              <button
                onClick={() => { setShowEditModal(false); setEditingProgram(null); }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School / Department</label>
                  <input
                    type="text"
                    name="school"
                    value={formData.school}
                    onChange={handleInputChange}
                    placeholder="e.g., School of Engineering"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stream</label>
                  <input
                    type="text"
                    name="stream"
                    value={formData.stream}
                    onChange={handleInputChange}
                    placeholder="e.g., Computer Science"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode of Delivery</label>
                  <select
                    name="modeOfDelivery"
                    value={formData.modeOfDelivery}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MODE_OF_DELIVERY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Type</label>
                  <select
                    name="periodType"
                    value={formData.periodType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="semester">Semester</option>
                    <option value="term">Term</option>
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="days">Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total {getPeriodLabel(formData.periodType)}s *</label>
                  <input
                    type="number"
                    name="totalSemesters"
                    value={formData.totalSemesters}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Credits</label>
                  <input
                    type="number"
                    name="totalCredits"
                    value={formData.totalCredits}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="e.g., 160"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Coordinator</label>
                <select
                  name="programCoordinator"
                  value={formData.programCoordinator}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Coordinator (optional)</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingProgram(null); }}
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
                  <span>{submitting ? 'Updating...' : 'Update Program'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramManagement;
