import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  X,
  Save,
  CheckCircle,
  Users,
  Calendar
} from 'lucide-react';
import {
  getMigrationStatus,
  getUnassignedSemesters,
  getUnassignedStudents,
  bulkAssignBatchToSemesters,
  bulkAssignProgramBatch
} from '../services/migration.service';
import { getProgramsDropdown } from '../services/program.service';
import { getBatchesDropdown } from '../services/batch.service';

const MigrationDashboard = () => {
  const [status, setStatus] = useState(null);
  const [unassignedSemesters, setUnassignedSemesters] = useState([]);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Selection state
  const [selectedSemesterIds, setSelectedSemesterIds] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Modals
  const [showSemesterAssignModal, setShowSemesterAssignModal] = useState(false);
  const [showStudentAssignModal, setShowStudentAssignModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown data
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);

  // Form state for assignment
  const [assignForm, setAssignForm] = useState({
    programId: '',
    batchId: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (assignForm.programId) {
      fetchBatches(assignForm.programId);
    } else {
      setBatches([]);
      setAssignForm(prev => ({ ...prev, batchId: '' }));
    }
  }, [assignForm.programId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statusData, semData, studentData, programData] = await Promise.all([
        getMigrationStatus().catch(() => null),
        getUnassignedSemesters().catch(() => ({ semesters: [] })),
        getUnassignedStudents().catch(() => ({ students: [] })),
        getProgramsDropdown().catch(() => [])
      ]);
      setStatus(statusData);
      setUnassignedSemesters(semData?.semesters || []);
      setUnassignedStudents(studentData?.students || []);
      setPrograms(programData || []);
    } catch (err) {
      setError('Failed to fetch migration data');
      console.error('Error fetching migration data:', err);
    } finally {
      setLoading(false);
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

  const handleSelectSemester = (id) => {
    setSelectedSemesterIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSelectAllSemesters = () => {
    setSelectedSemesterIds(
      selectedSemesterIds.length === unassignedSemesters.length
        ? []
        : unassignedSemesters.map(s => s._id)
    );
  };

  const handleSelectStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSelectAllStudents = () => {
    setSelectedStudentIds(
      selectedStudentIds.length === unassignedStudents.length
        ? []
        : unassignedStudents.map(s => s._id)
    );
  };

  const handleBulkAssignSemesters = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await bulkAssignBatchToSemesters(selectedSemesterIds, assignForm.batchId);
      setSuccessMsg(`Successfully assigned ${selectedSemesterIds.length} semesters to batch`);
      setShowSemesterAssignModal(false);
      setSelectedSemesterIds([]);
      setAssignForm({ programId: '', batchId: '' });
      await fetchAllData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to assign semesters';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAssignStudents = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await bulkAssignProgramBatch(selectedStudentIds, assignForm.programId, assignForm.batchId);
      setSuccessMsg(`Successfully assigned ${selectedStudentIds.length} students`);
      setShowStudentAssignModal(false);
      setSelectedStudentIds([]);
      setAssignForm({ programId: '', batchId: '' });
      await fetchAllData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to assign students';
      setError(msg);
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Migration Data</h2>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <AlertTriangle className="w-8 h-8 text-amber-600 mr-3" />
              Migration Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Track and resolve unassigned entities</p>
          </div>
          <button
            onClick={fetchAllData}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Success */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <p className="text-green-700">{successMsg}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Overall Progress</div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {status?.progress?.overall || '0%'}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: status?.progress?.overall || '0%' }}
            />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Unassigned Periods</div>
              <div className="text-3xl font-bold text-amber-600">
                {status?.counts?.unassignedSemesters ?? unassignedSemesters.length}
              </div>
            </div>
            <Calendar className="w-10 h-10 text-amber-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Unassigned Students</div>
              <div className="text-3xl font-bold text-amber-600">
                {status?.counts?.unassignedStudents ?? unassignedStudents.length}
              </div>
            </div>
            <Users className="w-10 h-10 text-amber-200" />
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {status?.recommendations?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Recommendations</h3>
          <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
            {status.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Unassigned Semesters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Unassigned Periods ({unassignedSemesters.length})
          </h2>
          {selectedSemesterIds.length > 0 && (
            <button
              onClick={() => {
                setAssignForm({ programId: '', batchId: '' });
                setShowSemesterAssignModal(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Bulk Assign Batch ({selectedSemesterIds.length})
            </button>
          )}
        </div>

        {unassignedSemesters.length > 0 ? (
          <div className="divide-y divide-gray-200">
            <div className="px-6 py-3 bg-gray-50 grid grid-cols-6 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div>
                <input
                  type="checkbox"
                  checked={selectedSemesterIds.length === unassignedSemesters.length && unassignedSemesters.length > 0}
                  onChange={handleSelectAllSemesters}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div>Name</div>
              <div>Period #</div>
              <div>Courses</div>
              <div>Start Date</div>
              <div>End Date</div>
            </div>
            {unassignedSemesters.map((sem) => (
              <div key={sem._id} className="px-6 py-3 grid grid-cols-6 gap-4 items-center hover:bg-gray-50">
                <div>
                  <input
                    type="checkbox"
                    checked={selectedSemesterIds.includes(sem._id)}
                    onChange={() => handleSelectSemester(sem._id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="text-sm font-medium text-gray-900">{sem.name}</div>
                <div className="text-sm text-gray-600">{sem.semNumber || '-'}</div>
                <div className="text-sm text-gray-600">{sem.courses?.length || 0}</div>
                <div className="text-sm text-gray-600">{formatDate(sem.startDate)}</div>
                <div className="text-sm text-gray-600">{formatDate(sem.endDate)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
            <p>All periods are assigned to batches</p>
          </div>
        )}
      </div>

      {/* Unassigned Students */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Unassigned Students ({unassignedStudents.length})
          </h2>
          {selectedStudentIds.length > 0 && (
            <button
              onClick={() => {
                setAssignForm({ programId: '', batchId: '' });
                setShowStudentAssignModal(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Bulk Assign Program & Batch ({selectedStudentIds.length})
            </button>
          )}
        </div>

        {unassignedStudents.length > 0 ? (
          <div className="divide-y divide-gray-200">
            <div className="px-6 py-3 bg-gray-50 grid grid-cols-5 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div>
                <input
                  type="checkbox"
                  checked={selectedStudentIds.length === unassignedStudents.length && unassignedStudents.length > 0}
                  onChange={handleSelectAllStudents}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div>Name</div>
              <div>Roll #</div>
              <div>Email</div>
              <div>Course Codes</div>
            </div>
            {unassignedStudents.map((student) => (
              <div key={student._id} className="px-6 py-3 grid grid-cols-5 gap-4 items-center hover:bg-gray-50">
                <div>
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student._id)}
                    onChange={() => handleSelectStudent(student._id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="text-sm font-medium text-gray-900">{student.user?.name || '-'}</div>
                <div className="text-sm text-gray-600">{student.rollNumber || '-'}</div>
                <div className="text-sm text-gray-600 truncate">{student.user?.email || '-'}</div>
                <div className="text-sm text-gray-600">
                  {student.courseCodeAssignments?.map(c => c.courseCode).join(', ') || '-'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
            <p>All students are assigned to programs and batches</p>
          </div>
        )}
      </div>

      {/* Semester Assign Modal */}
      {showSemesterAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Assign Batch to {selectedSemesterIds.length} Period(s)
              </h2>
              <button
                onClick={() => setShowSemesterAssignModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBulkAssignSemesters} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program *</label>
                <select
                  value={assignForm.programId}
                  onChange={(e) => setAssignForm({ programId: e.target.value, batchId: '' })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Program</option>
                  {programs.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select
                  value={assignForm.batchId}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, batchId: e.target.value }))}
                  required
                  disabled={!assignForm.programId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="">Select Batch</option>
                  {batches.map(b => (
                    <option key={b._id} value={b._id}>{b.name} ({b.year})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSemesterAssignModal(false)}
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
                  <span>{submitting ? 'Assigning...' : 'Assign Batch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Assign Modal */}
      {showStudentAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Assign Program & Batch to {selectedStudentIds.length} Student(s)
              </h2>
              <button
                onClick={() => setShowStudentAssignModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBulkAssignStudents} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program *</label>
                <select
                  value={assignForm.programId}
                  onChange={(e) => setAssignForm({ programId: e.target.value, batchId: '' })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Program</option>
                  {programs.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select
                  value={assignForm.batchId}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, batchId: e.target.value }))}
                  required
                  disabled={!assignForm.programId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="">Select Batch</option>
                  {batches.map(b => (
                    <option key={b._id} value={b._id}>{b.name} ({b.year})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStudentAssignModal(false)}
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
                  <span>{submitting ? 'Assigning...' : 'Assign Program & Batch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrationDashboard;
