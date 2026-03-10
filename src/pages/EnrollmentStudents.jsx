import React, { useEffect, useMemo, useState } from 'react';
import { Users, CheckCircle, XCircle } from 'lucide-react';
import { getEnrollmentStudents, updateEnrollmentStudentBatch } from '../services/enrollment.service';
import { getAllBatches } from '../services/batch.service';

const sourceOptions = [
  { value: '', label: 'All Sources' },
  { value: 'BULK', label: 'Bulk Upload' },
  { value: 'SINGLE', label: 'Manual' },
  { value: 'CRM', label: 'CRM' }
];

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'not_assigned', label: 'Not Assigned' }
];

const EnrollmentStudents = () => {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    batchId: '',
    source: '',
    group: ''
  });
  const [pendingBatchMap, setPendingBatchMap] = useState({});

  const batchesById = useMemo(() => {
    const map = new Map();
    batches.forEach((batch) => {
      map.set(batch._id, batch);
    });
    return map;
  }, [batches]);

  const fetchBatches = async () => {
    try {
      const data = await getAllBatches({ limit: 200 });
      setBatches(data?.batches || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
      setBatches([]);
    }
  };

  const buildParams = () => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.batchId) params.batchId = filters.batchId;
    if (filters.source) params.source = filters.source;
    if (filters.group) params.group = filters.group;
    return params;
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEnrollmentStudents(buildParams());
      const list = data?.students || [];
      setStudents(list);
      const nextMap = {};
      list.forEach((student) => {
        nextMap[student._id] = student.batch?._id || '';
      });
      setPendingBatchMap(nextMap);
    } catch (err) {
      console.error('Error fetching enrollment students:', err);
      setError(err?.response?.data?.error || 'Failed to load enrollment students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchStudents();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilters = (e) => {
    e?.preventDefault();
    fetchStudents();
  };

  const clearFilters = () => {
    const reset = { status: '', batchId: '', source: '', group: '' };
    setFilters(reset);
    fetchStudents();
  };

  const handleBatchSelect = (studentId, value) => {
    setPendingBatchMap((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleAssignBatch = async (studentId) => {
    const batchId = pendingBatchMap[studentId] || null;
    try {
      setUpdatingId(studentId);
      setError(null);
      const result = await updateEnrollmentStudentBatch(studentId, batchId);
      const updated = result?.student;
      if (updated) {
        setStudents((prev) =>
          prev.map((student) =>
            student._id === studentId
              ? { ...student, ...updated }
              : student
          )
        );
      } else {
        await fetchStudents();
      }
    } catch (err) {
      console.error('Error assigning batch:', err);
      setError(err?.response?.data?.error || 'Failed to update batch');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Student Enrollment
          </h1>
          <p className="text-sm text-gray-600">
            View enrolled students and assign or change their batch.
          </p>
        </div>
      </div>

      <form onSubmit={applyFilters} className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="mt-1 w-full rounded-md border-gray-200 text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Batch</label>
            <select
              value={filters.batchId}
              onChange={(e) => handleFilterChange('batchId', e.target.value)}
              className="mt-1 w-full rounded-md border-gray-200 text-sm"
            >
              <option value="">All Batches</option>
              {batches.map((batch) => (
                <option key={batch._id} value={batch._id}>
                  {batch.name} {batch.year ? `(${batch.year})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Source</label>
            <select
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="mt-1 w-full rounded-md border-gray-200 text-sm"
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Group</label>
            <input
              type="text"
              value={filters.group}
              onChange={(e) => handleFilterChange('group', e.target.value)}
              className="mt-1 w-full rounded-md border-gray-200 text-sm"
              placeholder="Cohort / group"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-600">Loading enrollment students...</div>
        ) : students.length === 0 ? (
          <div className="p-6 text-center text-gray-600">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Roll</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Batch</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((student) => {
                  const isAssigned = Boolean(student.batch);
                  const currentBatch = student.batch ? batchesById.get(student.batch._id) : null;
                  return (
                    <tr key={student._id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{student.name || 'Unnamed'}</div>
                        <div className="text-xs text-gray-500">{student.email}</div>
                      </td>
                      <td className="px-4 py-3">{student.rollNumber || '-'}</td>
                      <td className="px-4 py-3">{student.source || 'Bulk Upload'}</td>
                      <td className="px-4 py-3">
                        {currentBatch ? (
                          <span>{currentBatch.name} {currentBatch.year ? `(${currentBatch.year})` : ''}</span>
                        ) : (
                          <span className="text-gray-500">Not Assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAssigned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                            <XCircle className="h-3 w-3" />
                            Not Assigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <select
                            value={pendingBatchMap[student._id] ?? ''}
                            onChange={(e) => handleBatchSelect(student._id, e.target.value)}
                            className="rounded-md border-gray-200 text-sm"
                          >
                            <option value="">-- Unassigned --</option>
                            {batches.map((batch) => (
                              <option key={batch._id} value={batch._id}>
                                {batch.name} {batch.year ? `(${batch.year})` : ''}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAssignBatch(student._id)}
                            disabled={updatingId === student._id}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {updatingId === student._id ? 'Saving...' : 'Save Batch'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrollmentStudents;
