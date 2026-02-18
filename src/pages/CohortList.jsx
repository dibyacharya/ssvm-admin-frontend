import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Users, Eye } from 'lucide-react';
import { getCohortList } from '../services/cohort.service';
import { getProgramStreams, getProgramsDropdown } from '../services/program.service';
import { getBatchesDropdown } from '../services/batch.service';
import {
  getModeOfDeliveryLabel,
  MODE_OF_DELIVERY_OPTIONS,
} from '../constants/modeOfDelivery';

const BLOCK_TITLES_ALL_PROGRAMS = {
  REGULAR: 'Regular Students',
  WILP: 'WILP Students',
  ONLINE: 'Online Students',
  CERTIFICATE: 'Certificate Students',
};

const CohortList = () => {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [streamOptions, setStreamOptions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filters, setFilters] = useState({
    programId: '',
    stream: '',
    batchId: '',
    modeOfDelivery: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const selectedProgram = useMemo(
    () => programs.find((program) => program._id === filters.programId) || null,
    [programs, filters.programId]
  );

  const visibleBlocks = useMemo(() => {
    if (filters.programId) return blocks;
    return blocks.filter((block) => (block.students || []).length > 0);
  }, [blocks, filters.programId]);

  useEffect(() => {
    if (!filters.stream) return;
    const exists = streamOptions.some((stream) => stream === filters.stream);
    if (!exists) {
      setFilters((prev) => ({ ...prev, stream: '' }));
    }
  }, [streamOptions, filters.stream]);

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

  const fetchStreams = async (programId) => {
    try {
      const data = await getProgramStreams(
        programId ? { programId } : {}
      );
      setStreamOptions(Array.isArray(data?.streams) ? data.streams : []);
    } catch (err) {
      console.error('Failed to load streams', err);
      setStreamOptions([]);
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
      if (filters.modeOfDelivery) params.modeOfDelivery = filters.modeOfDelivery;

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
    fetchStreams();
    fetchBatches();
    fetchCohortList();
  }, []);

  useEffect(() => {
    fetchBatches(filters.programId);
    fetchStreams(filters.programId);
  }, [filters.programId]);

  const applyFilters = (e) => {
    e?.preventDefault();
    fetchCohortList();
  };

  const clearFilters = () => {
    setFilters({ programId: '', stream: '', batchId: '', modeOfDelivery: '' });
    fetchCohortList();
  };

  const handleViewStudent = (student) => {
    const targetStudentId = student?._id || '';
    if (!targetStudentId) {
      setError('Unable to open student details because studentId is missing.');
      return;
    }
    navigate(`/cohorts/students/${targetStudentId}`);
  };

  const getSourceBadge = (sourceType) => {
    const normalized = String(sourceType || "").trim().toUpperCase();
    if (normalized === "CRM") {
      return {
        label: "CRM",
        className: "bg-indigo-100 text-indigo-800",
      };
    }
    if (normalized === "BULK_UPLOAD" || normalized === "BULK") {
      return {
        label: "Bulk Upload",
        className: "bg-amber-100 text-amber-800",
      };
    }
    return {
      label: "Manual",
      className: "bg-slate-100 text-slate-700",
    };
  };

  const renderTable = (block) => {
    const title = filters.programId
      ? block.title || block.type
      : BLOCK_TITLES_ALL_PROGRAMS[block.type] || 'Students';
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
                  {block.type === 'REGULAR' && (
                    <>
                      <th className="px-3 py-2 text-left">Registration Number</th>
                      <th className="px-3 py-2 text-left">Roll Number</th>
                    </>
                  )}
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
                  <th className="px-3 py-2 text-left">Source</th>
                  <th className="px-3 py-2 text-left">Company Associated</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student._id}>
                    {block.type === 'REGULAR' && (
                      <>
                        <td className="px-3 py-2">{student.registrationNumber || '-'}</td>
                        <td className="px-3 py-2">{student.rollNumber || '-'}</td>
                      </>
                    )}
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
                    <td className="px-3 py-2">{getModeOfDeliveryLabel(student.modeOfDelivery)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          getSourceBadge(student.sourceType).className
                        }`}
                      >
                        {getSourceBadge(student.sourceType).label}
                      </span>
                    </td>
                    <td className="px-3 py-2">{student.companyAssociated || '-'}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleViewStudent(student)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
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
              {streamOptions.length === 0 ? (
                <option value="" disabled>No streams available</option>
              ) : (
                streamOptions.map((stream) => (
                  <option key={stream} value={stream}>{stream}</option>
                ))
              )}
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
            <label className="text-xs font-medium text-gray-500">Mode of Delivery</label>
            <select
              value={filters.modeOfDelivery}
              onChange={(e) => setFilters((prev) => ({ ...prev, modeOfDelivery: e.target.value }))}
              className="mt-1 w-full rounded-md border-gray-200 text-sm"
            >
              <option value="">All Modes</option>
              {MODE_OF_DELIVERY_OPTIONS.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
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
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {filters.programId
                ? selectedProgram?.name || 'Selected Program'
                : 'All Programs'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {filters.programId
                ? 'Program-specific enrollment view.'
                : 'Student Enrollment summary across all programs.'}
            </p>
          </div>
          {visibleBlocks.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-600">
              No students found.
            </div>
          ) : (
            <div className="space-y-6">
              {visibleBlocks.map(renderTable)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CohortList;
