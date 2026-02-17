import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Printer, Layers } from 'lucide-react';
import { getProgramSheet } from '../services/program.service';

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

const ProgramReview = () => {
  const { programId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatCoordinator = (coordinator) => {
    if (!coordinator) return '-';
    if (typeof coordinator === 'string') return coordinator;
    if (typeof coordinator === 'object') {
      return coordinator.name || coordinator.email || coordinator._id || '-';
    }
    return '-';
  };

  useEffect(() => {
    const fetchSheet = async () => {
      try {
        if (!programId) {
          setError('Program ID missing in URL.');
          return;
        }
        setLoading(true);
        setError(null);
        const res = await getProgramSheet(programId);
        setData(res);
      } catch (err) {
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load program sheet';
        setError(message);
        console.error('Error fetching program sheet:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSheet();
  }, [programId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Program Sheet</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link to="/programs" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Programs
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const program = data?.program || {};
  const summary = data?.summary || {};
  const breakdown = data?.breakdown || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/programs" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Programs
        </Link>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="w-6 h-6 text-blue-600 mr-2" />
              Program Sheet
            </h1>
            <p className="text-gray-600 mt-1">
              {program.name} {program.code ? `(${program.code})` : ''}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {program.periodType ? `${program.periodType.toUpperCase()}-based` : ''}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="space-y-2 text-sm text-gray-700">
            <div><span className="font-medium text-gray-900">School:</span> {program.school || '-'}</div>
            <div><span className="font-medium text-gray-900">Department:</span> {program.department || '-'}</div>
            <div><span className="font-medium text-gray-900">Stream:</span> {program.stream || '-'}</div>
            <div><span className="font-medium text-gray-900">Mode:</span> {program.modeOfDelivery || '-'}</div>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <div><span className="font-medium text-gray-900">Total Periods:</span> {program.totalPeriods || '-'}</div>
            <div><span className="font-medium text-gray-900">Total Credits:</span> {program.totalCredits ?? '-'}</div>
            <div><span className="font-medium text-gray-900">Coordinator:</span> {formatCoordinator(program.programCoordinator)}</div>
          </div>
        </div>

        {program.description && (
          <div className="mt-4 text-sm text-gray-700">
            <span className="font-medium text-gray-900">Description:</span> {program.description}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500">Batches</div>
          <div className="text-lg font-semibold text-gray-900">{summary.totalBatches || 0}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500">Semesters</div>
          <div className="text-lg font-semibold text-gray-900">{summary.totalSemesters || 0}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500">Courses</div>
          <div className="text-lg font-semibold text-gray-900">{summary.totalCourses || 0}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500">Cohort Strength</div>
          <div className="text-lg font-semibold text-gray-900">{summary.totalStudents || 0}</div>
        </div>
      </div>

      {breakdown.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-gray-600">No batches or semesters found for this program.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {breakdown.map((batch) => (
            <div key={batch.batchId} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Layers className="w-5 h-5 text-blue-600 mr-2" />
                      {batch.batchName} {batch.year ? `(${batch.year})` : ''}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Cohort: {batch.cohort || '-'} | Strength: {batch.studentCount || 0}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(batch.startDate)} - {formatDate(batch.expectedEndDate)}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {batch.semesters.map((sem) => (
                  <div key={sem._id} className="border border-gray-200 rounded-lg">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">
                        {sem.name} (#{sem.semNumber})
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(sem.startDate)} - {formatDate(sem.endDate)}
                      </div>
                    </div>
                    <div className="px-4 py-4">
                      {sem.courses.length === 0 ? (
                        <p className="text-sm text-gray-500">No courses assigned.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs uppercase text-gray-500">
                                <th className="py-2 pr-4">Course</th>
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Credits (L/T/P)</th>
                                <th className="py-2 pr-4">Teachers</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {sem.courses.map((course) => (
                                <tr key={course._id}>
                                  <td className="py-2 pr-4">
                                    <div className="font-medium text-gray-900">{course.courseCode}</div>
                                    <div className="text-xs text-gray-500">{course.title}</div>
                                  </td>
                                  <td className="py-2 pr-4 text-gray-600">{course.courseType || '-'}</td>
                                  <td className="py-2 pr-4 text-gray-600">
                                    {course.credits.lecture}/{course.credits.tutorial}/{course.credits.practical} (Total {course.credits.total})
                                  </td>
                                  <td className="py-2 pr-4 text-gray-600">
                                    {course.teachers.length > 0
                                      ? course.teachers.map((t) => t.name || t.email).join(', ')
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgramReview;
