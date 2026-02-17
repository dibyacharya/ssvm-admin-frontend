import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  GraduationCap,
  Calendar,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import {
  getProgramsDropdown,
  getAcademicPlan
} from '../services/program.service';
import { getBatchesDropdown } from '../services/batch.service';
import {
  safeDisplay,
  safeCourseType,
  safeCredits
} from '../utils/nullSafety';
import SemesterManager from '../components/academic/SemesterManager';

const isDevMode = Boolean(import.meta?.env?.DEV);

class AcademicPlanErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('AcademicPlan render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium">Academic Plan failed to render.</p>
            <p className="text-red-600 text-sm">
              {this.state.error?.message || 'Unexpected UI error.'}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AcademicPlan = () => {
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [academicPlan, setAcademicPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Batch + Semester management
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [showSemesterManager, setShowSemesterManager] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, []);

  // Fetch batches when program changes
  useEffect(() => {
    if (selectedProgram) {
      fetchBatches(selectedProgram);
    } else {
      setBatches([]);
      setSelectedBatch('');
      setShowSemesterManager(false);
    }
  }, [selectedProgram]);

  const fetchPrograms = async () => {
    try {
      const data = await getProgramsDropdown();
      setPrograms(data.programs || data || []);
    } catch (err) {
      console.error('Error fetching programs:', err);
      setError('Failed to fetch programs');
    }
  };

  const fetchBatches = async (programId) => {
    try {
      const data = await getBatchesDropdown(programId);
      setBatches(data.batches || data || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  const handleProgramSelect = async (programId) => {
    setSelectedProgram(programId);
    setSelectedBatch('');
    setShowSemesterManager(false);
    setAcademicPlan(null);
    setError(null);

    if (!programId) return;

    try {
      setLoading(true);
      const data = await getAcademicPlan(programId);
      setAcademicPlan(data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to fetch academic plan';
      setError(msg);
      console.error('Error fetching academic plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = (batchId) => {
    setSelectedBatch(batchId);
    setShowSemesterManager(!!batchId);
  };

  const handleRefresh = () => {
    if (selectedProgram) {
      handleProgramSelect(selectedProgram);
    }
  };

  const safePrograms = Array.isArray(programs) ? programs : [];
  const safeBatches = Array.isArray(batches) ? batches : [];
  const selectedProgramData = safePrograms.find(p => p._id === selectedProgram);
  const semestersList = Array.isArray(academicPlan?.semesters)
    ? academicPlan.semesters
    : [];

  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '---';
    }
  };

  // Sanity check:
  // normalizeCourses([{ courseCode: "A" }]).length === 1
  // normalizeCourses({ theory: [{ courseCode: "B" }], practical: [] }).length === 1
  const normalizeCourses = (courses) => {
    if (Array.isArray(courses)) {
      return courses.filter(Boolean);
    }

    if (courses && typeof courses === 'object') {
      const values = Object.values(courses);
      const hasUnexpectedNestedShape = values.some(
        (value) => value != null && !Array.isArray(value)
      );

      if (isDevMode && hasUnexpectedNestedShape) {
        console.warn('[AcademicPlan] Unexpected grouped courses shape:', courses);
      }

      return values.flat().filter(Boolean);
    }

    if (isDevMode && courses != null) {
      console.warn('[AcademicPlan] Unexpected courses payload type:', courses);
    }

    return [];
  };

  const groupCourseListByType = (courseList) => {
    const theory = [];
    const practical = [];
    const project = [];

    courseList.forEach((course) => {
      const type = course.courseType?.toLowerCase();
      if (type === 'practical') {
        practical.push(course);
      } else if (type === 'project') {
        project.push(course);
      } else {
        theory.push(course);
      }
    });

    return { theory, practical, project };
  };

  const groupCoursesByType = (courses) => {
    if (courses && typeof courses === 'object' && !Array.isArray(courses)) {
      const theory = Array.isArray(courses.theory) ? courses.theory.filter(Boolean) : [];
      const practical = Array.isArray(courses.practical) ? courses.practical.filter(Boolean) : [];
      const project = Array.isArray(courses.project) ? courses.project.filter(Boolean) : [];

      const knownCourses = [...theory, ...practical, ...project];
      const knownSet = new Set(knownCourses);
      const extras = normalizeCourses(courses).filter((course) => !knownSet.has(course));

      if (extras.length > 0) {
        const extraGroups = groupCourseListByType(extras);
        theory.push(...extraGroups.theory);
        practical.push(...extraGroups.practical);
        project.push(...extraGroups.project);
      }

      return { theory, practical, project };
    }

    return groupCourseListByType(normalizeCourses(courses));
  };

  const renderCourseTable = (courses, type, colorClasses) => {
    if (!courses || courses.length === 0) return null;

    const sums = { L: 0, T: 0, P: 0, C: 0 };
    courses.forEach((c) => {
      const cp = c.creditPoints || {};
      sums.L += cp.lecture || 0;
      sums.T += cp.tutorial || 0;
      sums.P += cp.practical || 0;
      sums.C += safeCredits(cp);
    });

    return (
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}>
            {safeCourseType(type)} ({courses.length})
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 font-medium text-gray-600">Code</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Title</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Teachers</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600 w-10">L</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600 w-10">T</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600 w-10">P</th>
              <th className="text-center px-2 py-2 font-medium text-gray-600 w-12">C</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses.map((course) => {
              const cp = course.creditPoints || {};
              return (
                <tr key={course._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-900 font-medium">
                    {safeDisplay(course.courseCode)}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {safeDisplay(course.title)}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {(() => {
                      const assigned = Array.isArray(course.assignedTeachers)
                        ? course.assignedTeachers
                        : [];
                      if (!assigned.length) {
                        return <div className="text-xs text-gray-400">No teachers assigned</div>;
                      }
                      return (
                        <div className="space-y-1">
                          {assigned.map((teacher, idx) => (
                            <div key={`${course._id}-t-${idx}`} className="text-xs text-gray-700">
                              {safeDisplay(teacher?.name || teacher?.user?.name || teacher?.email)}
                              {teacher?.roleLabel && (
                                <span className="text-[10px] text-gray-400 ml-1">({teacher.roleLabel})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="text-center px-2 py-2 text-gray-500">{cp.lecture || 0}</td>
                  <td className="text-center px-2 py-2 text-gray-500">{cp.tutorial || 0}</td>
                  <td className="text-center px-2 py-2 text-gray-500">{cp.practical || 0}</td>
                  <td className="text-center px-2 py-2 text-gray-900 font-semibold">{safeCredits(cp)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-medium text-gray-700">
              <td className="px-3 py-2" colSpan={3}>Total</td>
              <td className="text-center px-2 py-2">{sums.L}</td>
              <td className="text-center px-2 py-2">{sums.T}</td>
              <td className="text-center px-2 py-2">{sums.P}</td>
              <td className="text-center px-2 py-2 font-bold">{sums.C}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Academic Plan</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AcademicPlanErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
                Academic Plan
              </h1>
              <p className="text-gray-600 mt-1">View and manage the academic plan for a program</p>
            </div>
            {selectedProgram && (
              <button
                onClick={handleRefresh}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            )}
          </div>

          {/* Program + Batch Selectors */}
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedProgram}
              onChange={(e) => handleProgramSelect(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a Program</option>
              {safePrograms.map((program) => (
                <option key={program._id} value={program._id}>
                  {program.name} ({program.code})
                </option>
              ))}
            </select>

            {selectedProgram && (
              <select
                value={selectedBatch}
                onChange={(e) => handleBatchSelect(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a Batch to manage semesters</option>
                {safeBatches.map((batch) => (
                  <option key={batch._id} value={batch._id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* No program selected placeholder */}
        {!selectedProgram && !error && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Program Selected</h2>
              <p className="text-gray-600">Select a program above to view its academic plan.</p>
            </div>
          </div>
        )}

        {/* Semester Manager — shown when a batch is selected */}
        {showSemesterManager && selectedBatch && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Plus className="w-5 h-5 text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">
                Manage Semesters / Terms
              </h2>
              <span className="ml-2 text-sm text-gray-500">
                for batch: {safeBatches.find(b => b._id === selectedBatch)?.name || ''}
              </span>
            </div>
            <SemesterManager
              batchId={selectedBatch}
              periodType={selectedProgramData?.periodType || 'semester'}
              programTotalCredits={academicPlan?.program?.totalCredits || selectedProgramData?.totalCredits || 0}
            />
          </div>
        )}

        {/* Academic Plan Content */}
        {academicPlan && (
          <>
          {/* Program Info Header Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <GraduationCap className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                {safeDisplay(academicPlan.program?.name)}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Code</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {safeDisplay(academicPlan.program?.code)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Credits</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {safeDisplay(academicPlan.program?.totalCredits)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Period Type</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {safeDisplay(academicPlan.program?.periodType)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mode of Delivery</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {safeDisplay(academicPlan.program?.modeOfDelivery)}
                </p>
              </div>
            </div>
          </div>

          {/* Credit Summary Card */}
          {semestersList.length > 0 && (() => {
            const programTotal = academicPlan.program?.totalCredits;
            const semesterRows = semestersList.map((sem) => {
              const courseList = normalizeCourses(sem.courses);
              const coursesSum = courseList.reduce((s, c) => s + safeCredits(c.creditPoints), 0);
              return { name: sem.name, adminCredits: sem.totalCredits, coursesSum };
            });
            const totalAssigned = semesterRows.reduce((s, r) => s + (r.adminCredits || 0), 0);
            const totalFromCourses = semesterRows.reduce((s, r) => s + r.coursesSum, 0);

            return (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Credit Summary</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Semester</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-600">Admin-Set Credits</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-600">Courses Sum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {semesterRows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-900">{row.name}</td>
                          <td className="text-center px-3 py-2 text-gray-700">{row.adminCredits ?? '---'}</td>
                          <td className="text-center px-3 py-2 text-gray-700">{row.coursesSum || '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-medium">
                        <td className="px-3 py-2 text-gray-900">Total</td>
                        <td className="text-center px-3 py-2 text-gray-900">{totalAssigned}</td>
                        <td className="text-center px-3 py-2 text-gray-900">{totalFromCourses}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {programTotal != null && programTotal > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Program Total: <span className="font-semibold text-gray-900">{programTotal} credits</span></span>
                      <span className="text-gray-500">{totalAssigned} / {programTotal} assigned</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${totalAssigned > programTotal ? 'bg-red-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min(100, (totalAssigned / programTotal) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Semesters */}
          {semestersList.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">No semesters found for this program.</p>
                {!selectedBatch && (
                  <p className="text-sm text-gray-500">
                    Select a batch above to create semesters / terms.
                  </p>
                )}
              </div>
            </div>
          )}

          {semestersList.map((semester) => {
            const { theory, practical, project } = groupCoursesByType(semester.courses);
            const hasCourses = theory.length > 0 || practical.length > 0 || project.length > 0;
            const courseList = normalizeCourses(semester.courses);
            const coursesCreditsSum = courseList.reduce((s, c) => s + safeCredits(c.creditPoints), 0);

            return (
              <div
                key={semester._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                {/* Semester Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {safeDisplay(semester.name)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {semester.totalCredits !== undefined && semester.totalCredits !== null && (
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {semester.totalCredits} Credits
                      </span>
                    )}
                    {hasCourses && (
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Courses: {coursesCreditsSum} cr
                      </span>
                    )}
                  </div>
                </div>

                {/* Semester Dates */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">Start Date:</span>{' '}
                    <span className="text-gray-900 font-medium">{formatDate(semester.startDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">End Date:</span>{' '}
                    <span className="text-gray-900 font-medium">{formatDate(semester.endDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Mid-Term Exam:</span>{' '}
                    <span className="text-gray-900 font-medium">{formatDate(semester.midTermExamDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">End-Term Exam:</span>{' '}
                    <span className="text-gray-900 font-medium">{formatDate(semester.endTermExamDate)}</span>
                  </div>
                </div>

                {/* Course Tables */}
                {hasCourses ? (
                  <div className="border-t border-gray-200 pt-4">
                    {renderCourseTable(theory, 'theory', 'bg-blue-100 text-blue-800')}
                    {renderCourseTable(practical, 'practical', 'bg-green-100 text-green-800')}
                    {renderCourseTable(project, 'project', 'bg-orange-100 text-orange-800')}
                  </div>
                ) : (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-center py-6">
                      <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No courses added yet</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </>
        )}
      </div>
    </AcademicPlanErrorBoundary>
  );
};

export default AcademicPlan;
