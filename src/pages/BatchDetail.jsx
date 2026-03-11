import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Plus,
  Search,
  User,
  Users,
  X,
  FileText,
} from 'lucide-react';
import { getBatchById, getBatchStudents } from '../services/batch.service';
import { getProgramById } from '../services/program.service';
import { getAmendmentsByBatch } from '../services/courseAmendment.service';
import SemesterManager from '../components/academic/SemesterManager';
import { getPeriodLabel } from '../utils/periodLabel';

const statusColors = {
  upcoming: 'bg-blue-100 text-blue-800',
  ongoing: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  graduated: 'bg-gray-100 text-gray-800',
  archived: 'bg-gray-100 text-gray-800',
  Assigned: 'bg-green-100 text-green-800',
  'Not Assigned': 'bg-amber-100 text-amber-800',
};

const normalizeStatus = (status) => {
  if (!status) return 'upcoming';
  if (status === 'active') return 'ongoing';
  if (status === 'graduated') return 'completed';
  return status;
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const toInputDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const getStudentDisplayName = (student) => student?.name || student?.user?.name || '-';

const getStudentPrimaryId = (student) =>
  student?.registrationNumber || student?.enrollmentNumber || '-';

const VALID_BATCH_TABS = ['SEMESTER', 'STUDENT', 'AMENDMENTS'];

const BatchDetail = () => {
  const { batchId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [batch, setBatch] = useState(null);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [activeBatchTab, setActiveBatchTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    return VALID_BATCH_TABS.includes(tabFromUrl) ? tabFromUrl : 'SEMESTER';
  });
  const [hasLoadedStudents, setHasLoadedStudents] = useState(false);

  const [amendments, setAmendments] = useState([]);
  const [amendmentsLoading, setAmendmentsLoading] = useState(false);
  const [hasLoadedAmendments, setHasLoadedAmendments] = useState(false);

  // Sync activeBatchTab to URL so tab persists on refresh
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', activeBatchTab);
      return next;
    }, { replace: true });
  }, [activeBatchTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBatchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const batchData = await getBatchById(batchId);
      setBatch(batchData);

      const programId = batchData?.program?._id || batchData?.program;
      if (programId) {
        try {
          const programData = await getProgramById(programId);
          setProgram(programData);
        } catch (err) {
          console.error('Error fetching program:', err);
        }
      }
    } catch (err) {
      setError('Failed to fetch batch details');
      console.error('Error fetching batch:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchStudents = async () => {
    try {
      setStudentsLoading(true);
      setStudentsError('');
      const data = await getBatchStudents(batchId);
      setStudents(Array.isArray(data?.students) ? data.students : []);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to fetch students for this batch';
      setStudentsError(message);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchAmendments = async () => {
    try {
      setAmendmentsLoading(true);
      const res = await getAmendmentsByBatch(batchId);
      setAmendments(res.amendments || []);
    } catch {
      setAmendments([]);
    } finally {
      setAmendmentsLoading(false);
    }
  };

  const handleBatchTabChange = (tabKey) => {
    setActiveBatchTab(tabKey);
    if (tabKey === 'STUDENT' && !hasLoadedStudents) {
      setHasLoadedStudents(true);
      fetchBatchStudents();
    }
    if (tabKey === 'AMENDMENTS' && !hasLoadedAmendments) {
      setHasLoadedAmendments(true);
      fetchAmendments();
    }
  };

  useEffect(() => {
    fetchBatchData();
  }, [batchId]);

  useEffect(() => {
    setActiveBatchTab('SEMESTER');
    setHasLoadedStudents(false);
    setStudents([]);
    setStudentsError('');
    setStudentSearch('');
    setSelectedStudent(null);
  }, [batchId]);

  const filteredStudents = useMemo(() => {
    const needle = studentSearch.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((student) => {
      const haystack = [
        student?.rollNumber,
        student?.registrationNumber,
        student?.enrollmentNumber,
        student?.debId,
        student?.name,
        student?.email,
        student?.stream,
        student?.program?.name,
        student?.program?.code,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [students, studentSearch]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Batch Details</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link to="/batches" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Batches
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="space-y-6">
        <Link to="/batches" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Batches
        </Link>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Batch Not Found</h2>
            <p className="text-gray-600">The requested batch could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  const displayStatus = normalizeStatus(batch.status);
  const programName = batch.program?.name || program?.name || '-';
  const programCode = batch.program?.code || program?.code || '';

  return (
    <div className="space-y-6">
      <Link to="/batches" className="flex items-center text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Batches
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Layers className="w-8 h-8 text-blue-600 mr-3" />
              {batch.name}
            </h1>
            <p className="text-gray-600 mt-1">
              {programName}
              {programCode ? ` (${programCode})` : ''}
            </p>
            <div className="mt-2">
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[displayStatus] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {displayStatus}
              </span>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div className="flex items-center text-gray-600">
              <Calendar className="w-5 h-5 mr-2 text-gray-400" />
              <span className="text-sm">
                {formatDate(batch.startDate)} - {formatDate(batch.expectedEndDate)}
              </span>
            </div>
            <div className="flex items-center text-gray-600">
              <User className="w-5 h-5 mr-2 text-gray-400" />
              <span className="text-sm">Year: {batch.year || '-'}</span>
            </div>
          </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-gray-200">
          <div className="inline-flex items-center gap-2 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => handleBatchTabChange('SEMESTER')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeBatchTab === 'SEMESTER'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {getPeriodLabel(program?.periodType)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleBatchTabChange('STUDENT')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeBatchTab === 'STUDENT'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Users className="w-4 h-4" />
                Student
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleBatchTabChange('AMENDMENTS')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeBatchTab === 'AMENDMENTS'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Amendments
              </span>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className={activeBatchTab === 'SEMESTER' ? '' : 'hidden'}>
            <SemesterManager
              batchId={batchId}
              periodType={program?.periodType}
              programTotalCredits={program?.totalCredits || 0}
              detailedView
              allowSemesterCreation={false}
              setupWizardOnly
            />
          </div>

          {(hasLoadedStudents || activeBatchTab === 'STUDENT') && (
            <div className={activeBatchTab === 'STUDENT' ? 'space-y-4' : 'hidden'}>
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-gray-900">Batch Students</h3>
                <div className="text-sm text-gray-500">Total: {filteredStudents.length}</div>
              </div>

              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by name, roll, registration, enrollment..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {studentsError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                  {studentsError}
                </div>
              ) : studentsLoading ? (
                <div className="text-sm text-gray-500">Loading students...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <Users className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">No students found</p>
                  <p className="text-sm text-gray-500 mt-1">No students are currently mapped to this batch.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[480px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Roll Number</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Registration/Enrollment</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Program / Stream</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStudents.map((student) => (
                        <tr
                          key={student._id}
                          className="hover:bg-blue-50 cursor-pointer"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <td className="px-4 py-3 text-gray-700">{student.rollNumber || '-'}</td>
                          <td className="px-4 py-3 text-gray-700">{getStudentPrimaryId(student)}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium">{getStudentDisplayName(student)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                statusColors[student.status] || 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {student.status || 'Assigned'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {(student.program?.name || '-') + (student.stream ? ` / ${student.stream}` : '')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {(hasLoadedAmendments || activeBatchTab === 'AMENDMENTS') && (
            <div className={activeBatchTab === 'AMENDMENTS' ? 'space-y-4' : 'hidden'}>
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-gray-900">Course Amendments</h3>
                <a
                  href="/course-amendments/new"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Amendment
                </a>
              </div>
              {amendmentsLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  <span className="ml-2 text-sm text-gray-500">Loading amendments...</span>
                </div>
              )}
              {!amendmentsLoading && amendments.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No amendments found for this batch.
                </div>
              )}
              {!amendmentsLoading && amendments.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changes</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {amendments.map((amd) => (
                        <tr
                          key={amd._id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => window.location.href = `/course-amendments/${amd._id}`}
                        >
                          <td className="px-4 py-3 text-sm font-mono text-blue-600">{amd.amendmentId || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{amd.title || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              amd.status === 'FULLY_APPLIED' ? 'bg-green-100 text-green-800' :
                              amd.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                              amd.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                              amd.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {amd.status?.replace(/_/g, ' ') || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              amd.batchStatus === 'APPLIED' ? 'bg-green-100 text-green-800' :
                              amd.batchStatus === 'REVERTED' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {amd.batchStatus || 'Not Applied'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {amd.changes?.length || 0} change{(amd.changes?.length || 0) !== 1 ? 's' : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {amd.createdAt ? formatDate(amd.createdAt) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/30"
            onClick={() => setSelectedStudent(null)}
            aria-hidden="true"
          />
          <div className="w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Student Details</h3>
                <p className="text-sm text-gray-500">{getStudentDisplayName(selectedStudent)}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-sm">
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Basic</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-500">Name:</span> {getStudentDisplayName(selectedStudent)}
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span> {selectedStudent.email || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span> {selectedStudent.phone || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">Roll Number:</span> {selectedStudent.rollNumber || '-'}
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Identifiers</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-500">Registration Number:</span>{' '}
                    {selectedStudent.registrationNumber || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">Enrollment Number:</span>{' '}
                    {selectedStudent.enrollmentNumber || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">DEB ID:</span> {selectedStudent.debId || '-'}
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Profile</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-500">Sex:</span> {selectedStudent.sex || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">Age:</span> {selectedStudent.age ?? '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">Mode:</span> {selectedStudent.mode || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">Company Associated:</span>{' '}
                    {selectedStudent.companyAssociated || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">Stream:</span> {selectedStudent.stream || '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">Source:</span> {selectedStudent.source || '-'}
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Program & Batch</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <span className="text-gray-500">Program:</span>{' '}
                    {selectedStudent.program
                      ? `${selectedStudent.program.name || '-'} (${selectedStudent.program.code || '-'})`
                      : '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">Batch:</span>{' '}
                    {selectedStudent.batch
                      ? `${selectedStudent.batch.name || '-'} (${selectedStudent.batch.year || '-'})`
                      : '-'}
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span> {selectedStudent.status || '-'}
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Audit</h4>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <span className="text-gray-500">Created At:</span> {formatDate(selectedStudent.createdAt)}
                  </div>
                  <div>
                    <span className="text-gray-500">Updated At:</span> {formatDate(selectedStudent.updatedAt)}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchDetail;
