import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Users, Pencil } from 'lucide-react';
import { getCohortList } from '../services/cohort.service';
import { getProgramsDropdown } from '../services/program.service';
import { getBatchesDropdown } from '../services/batch.service';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'not_assigned', label: 'Not Assigned' },
];

const CohortList = () => {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filters, setFilters] = useState({
    programId: '',
    stream: '',
    batchId: '',
    status: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const streamOptions = useMemo(() => {
    const values = new Set();
    programs.forEach((program) => {
      if (program.stream) values.add(program.stream);
    });
    return Array.from(values);
  }, [programs]);

  const fetchPrograms = async () => {
    try {
      const data = await getProgramsDropdown();
      setPrograms(data?.programs || data || []);
    } catch (err) {
      console.error('Failed to load programs', err);
      setPrograms([]);
    }
  };

  const fetchBatches = async (programId) => {
    try {
      const data = await getBatchesDropdown(programId || undefined);
      setBatches(data?.batches || data || []);
    } catch (err) {
      console.error('Failed to load batches', err);
      setBatches([]);
    }
  };

  const fetchCohortList = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.programId) params.programId = filters.programId;
      if (filters.stream) params.stream = filters.stream;
      if (filters.batchId) params.batchId = filters.batchId;
      if (filters.status) params.status = filters.status;

      const data = await getCohortList(params);
      const resultBlocks = data?.blocks || [];
      setBlocks(resultBlocks);
    } catch (err) {
      console.error('Failed to load cohort list', err);
      setError(err?.response?.data?.error || 'Failed to load cohort list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
    fetchBatches();
    fetchCohortList();
  }, []);

  useEffect(() => {
    fetchBatches(filters.programId);
  }, [filters.programId]);

  const applyFilters = (e) => {
    e?.preventDefault();
    fetchCohortList();
  };

  const clearFilters = () => {
    setFilters({ programId: '', stream: '', batchId: '', status: '' });
    fetchCohortList();
  };

  const handleEditStudent = (student) => {
    const targetUserId = student?.userId || '';
    if (!targetUserId) {
      setError('Unable to open user profile for this student because userId is missing.');
      return;
    }
    navigate(`/users/${targetUserId}`);
  };

  const renderTable = (block) => {
    const title = block.title || block.type;
    const students = block.students || [];

    return (
      <div key={block.type} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">Total: {students.length}</p>
        </div>
        {students.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {block.type === 'WILP' && (
                    <>
                      <th className="px-3 py-2 text-left">Registration Number</th>
                      <th className="px-3 py-2 text-left">Roll Number</th>
                    </>
                  )}
                  {block.type === 'ONLINE' && (
                    <>
                      <th className="px-3 py-2 text-left">Enrolment Number</th>
                      <th className="px-3 py-2 text-left">DEB ID</th>
                    </>
                  )}
                  {block.type === 'CERTIFICATE' && (
                    <th className="px-3 py-2 text-left">Registration Number</th>
                  )}
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Sex</th>
                  <th className="px-3 py-2 text-left">Age</th>
                  <th className="px-3 py-2 text-left">Program</th>
                  <th className="px-3 py-2 text-left">Stream</th>
                  <th className="px-3 py-2 text-left">Batch</th>
                  <th className="px-3 py-2 text-left">Stage</th>
                  <th className="px-3 py-2 text-left">Mode</th>
                  <th className="px-3 py-2 text-left">Company Associated</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student._id}>
                    {block.type === 'WILP' && (
                      <>
                        <td className="px-3 py-2">{student.registrationNumber || '-'}</td>
                        <td className="px-3 py-2">{student.rollNumber || '-'}</td>
                      </>
                    )}
                    {block.type === 'ONLINE' && (
                      <>
                        <td className="px-3 py-2">{student.enrollmentNumber || '-'}</td>
                        <td className="px-3 py-2">{student.debId || '-'}</td>
                      </>
                    )}
                    {block.type === 'CERTIFICATE' && (
                      <td className="px-3 py-2">{student.registrationNumber || '-'}</td>
                    )}
                    <td className="px-3 py-2">{student.name || '-'}</td>
                    <td className="px-3 py-2">{student.sex || '-'}</td>
                    <td className="px-3 py-2">{student.age || '-'}</td>
                    <td className="px-3 py-2">{student.program?.name || '-'}</td>
                    <td className="px-3 py-2">{student.stream || '-'}</td>
                    <td className="px-3 py-2">{student.batch?.name || '-'}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {student.stage || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{student.modeOfDelivery || '-'}</td>
                    <td className="px-3 py-2">{student.companyAssociated || '-'}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleEditStudent(student)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Student Enrollment
          </h1>
          <p className="text-sm text-gray-600">Enroll students into batches and manage their enrollment assignments.</p>
        </div>
        <button
          onClick={fetchCohortList}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <form onSubmit={applyFilters} className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Program</label>
            <select
              value={filters.programId}
              onChange={(e) => setFilters((prev) => ({ ...prev, programId: e.target.value }))}
              className="mt-1 w-full rounded-md border-gray-200 text-sm"
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={program._id} value={program._id}>
                  {program.name} {program.code ? `(${program.code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Stream</label>
            <select
              value={filters.stream}
              onChange={(e) => setFilters((prev) => ({ ...prev, stream: e.target.value }))}
              className="mt-1 w-full rounded-md border-gray-200 text-sm"
            >
              <option value="">All Streams</option>
              {streamOptions.map((stream) => (
                <option key={stream} value={stream}>{stream}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Batch</label>
            <select
              value={filters.batchId}
              onChange={(e) => setFilters((prev) => ({ ...prev, batchId: e.target.value }))}
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
            <label className="text-xs font-medium text-gray-500">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="mt-1 w-full rounded-md border-gray-200 text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
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

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-600">
          Loading cohort list...
        </div>
      ) : (
        <div className="space-y-6">
          {blocks.map(renderTable)}
        </div>
      )}
    </div>
  );
};

export default CohortList;
