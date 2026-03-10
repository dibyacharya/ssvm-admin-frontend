import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, X } from 'lucide-react';
import {
  getProgramById,
  getAcademicPlan,
  updateCourseAssessmentPlan,
} from '../services/program.service';
import { getTeachers } from '../services/user.service';
import { getPeriodLabel } from '../utils/periodLabel';
import SemesterCourseTable from '../components/academic/SemesterCourseTable';
import {
  getModeOfDeliveryLabel,
} from '../constants/modeOfDelivery';

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toAssessmentInputValue = (value) =>
  value === null || value === undefined || value === '' ? '' : String(value);

const flattenSemesterCourses = (courses) => {
  if (Array.isArray(courses)) return courses.filter(Boolean);
  if (!courses || typeof courses !== 'object') return [];
  return Object.values(courses).flat().filter(Boolean);
};

const ProgramReview = () => {
  const { programId } = useParams();
  const [program, setProgram] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [academicPlan, setAcademicPlan] = useState(null);
  const [academicPlanLoading, setAcademicPlanLoading] = useState(false);
  const [academicPlanError, setAcademicPlanError] = useState('');
  const [selectedSemesterNumber, setSelectedSemesterNumber] = useState(null);
  const [showSemesterManager, setShowSemesterManager] = useState(false);
  const [manageSemesterId, setManageSemesterId] = useState('');
  const [assessmentDraftByRow, setAssessmentDraftByRow] = useState({});
  const [assessmentSavingByRow, setAssessmentSavingByRow] = useState({});
  const [assessmentErrorByRow, setAssessmentErrorByRow] = useState({});
  const [assessmentNoticeByRow, setAssessmentNoticeByRow] = useState({});

  const pLabel = getPeriodLabel(academicPlan?.program?.periodType || program?.periodType || 'semester');
  const pLabelLower = pLabel.toLowerCase();

  const coordinatorMap = useMemo(() => {
    const map = new Map();
    teachers.forEach((teacher) => {
      if (teacher?._id) {
        map.set(String(teacher._id), teacher);
      }
    });
    return map;
  }, [teachers]);

  const coordinatorDisplay = useMemo(() => {
    const raw =
      typeof program?.programCoordinator === 'object'
        ? program?.programCoordinator?._id
        : program?.programCoordinator;
    const coordinatorId = raw ? String(raw) : '';
    if (!coordinatorId) return '-';
    const teacher = coordinatorMap.get(coordinatorId);
    if (!teacher) return coordinatorId;
    return `${teacher.name || 'Unknown'} (${teacher.email || 'no-email'})`;
  }, [program, coordinatorMap]);

  const fetchProgram = async () => {
    if (!programId) {
      setError('Program ID missing in URL.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getProgramById(programId);
      setProgram(data);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load program details';
      setError(message);
      console.error('Error fetching program details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const fetchProgramAcademicPlan = useCallback(async () => {
    if (!programId) return;
    try {
      setAcademicPlanLoading(true);
      setAcademicPlanError('');
      const data = await getAcademicPlan(programId);
      setAcademicPlan(data || null);
    } catch (err) {
      setAcademicPlan(null);
      setAcademicPlanError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load academic table.'
      );
    } finally {
      setAcademicPlanLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchProgramAcademicPlan();
  }, [fetchProgramAcademicPlan]);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const data = await getTeachers();
        setTeachers(data.users || data.teachers || []);
      } catch (err) {
        console.error('Error fetching teachers:', err);
        setTeachers([]);
      }
    };
    fetchTeachers();
  }, []);

  const semesterTableData = useMemo(() => {
    const semesters = Array.isArray(academicPlan?.semesters) ? academicPlan.semesters : [];
    return semesters
      .map((semester, semesterIndex) => {
        const semNumber = Number(semester?.semNumber) || semesterIndex + 1;
        const semesterIds = Array.isArray(semester?.semesterIds)
          ? semester.semesterIds.filter(Boolean).map((id) => String(id))
          : [];
        const primarySemesterId = semester?.primarySemesterId
          ? String(semester.primarySemesterId)
          : semesterIds[0] || '';
        const rows = flattenSemesterCourses(semester?.courses).map((course, rowIndex) => {
          const assessment = course?.assessmentPlan || {};
          const ca = toNumberOrNull(
            assessment?.ca ?? assessment?.continuousAssessment ?? assessment?.continuous_assessment
          );
          const midTerm = toNumberOrNull(
            assessment?.midTerm ?? assessment?.midTermExam ?? assessment?.mid_term
          );
          const endTerm = toNumberOrNull(
            assessment?.endTerm ?? assessment?.endTermExam ?? assessment?.end_term
          );
          const totalFromAssessment = toNumberOrNull(assessment?.total);
          const total =
            totalFromAssessment !== null
              ? totalFromAssessment
              : ca !== null && midTerm !== null && endTerm !== null
                ? ca + midTerm + endTerm
                : null;
          const credits =
            toNumberOrNull(course?.credits) ??
            toNumberOrNull(course?.creditPoints?.totalCredits) ??
            ((toNumberOrNull(course?.creditPoints?.lecture) || 0) +
              (toNumberOrNull(course?.creditPoints?.tutorial) || 0) +
              (toNumberOrNull(course?.creditPoints?.practical) || 0));

          return {
            key: `${course?._id || course?.courseId || course?.courseCode || 'course'}-${rowIndex}`,
            courseId: course?._id || course?.courseId ? String(course?._id || course?.courseId) : '',
            serial: rowIndex + 1,
            title: course?.title || '-',
            courseCode: course?.courseCode || '-',
            ca,
            midTerm,
            endTerm,
            total,
            credits: Number.isFinite(credits) ? credits : 0,
          };
        });

        const courseCredits = rows.reduce((sum, row) => sum + (Number(row.credits) || 0), 0);
        const semesterCredit = courseCredits
          || toNumberOrNull(semester?.calculatedCredits)
          || toNumberOrNull(semester?.totalCredits)
          || 0;
        return {
          semNumber,
          label: semester?.name || `${getPeriodLabel(academicPlan?.program?.periodType || 'semester')} ${semNumber}`,
          semesterIds,
          primarySemesterId,
          semesterCredit,
          rows,
        };
      })
      .sort((left, right) => left.semNumber - right.semNumber);
  }, [academicPlan]);

  useEffect(() => {
    if (!semesterTableData.length) {
      setSelectedSemesterNumber(null);
      return;
    }
    setSelectedSemesterNumber((previous) => {
      if (previous && semesterTableData.some((semester) => semester.semNumber === previous)) {
        return previous;
      }
      return semesterTableData[0].semNumber;
    });
  }, [semesterTableData]);

  const selectedSemester = useMemo(
    () =>
      semesterTableData.find((semester) => semester.semNumber === selectedSemesterNumber) ||
      semesterTableData[0] ||
      null,
    [semesterTableData, selectedSemesterNumber]
  );

  const getAssessmentRowKey = useCallback(
    (row) => row?.courseId || row?.key || '',
    []
  );

  useEffect(() => {
    if (!selectedSemester) {
      setAssessmentDraftByRow({});
      setAssessmentSavingByRow({});
      setAssessmentErrorByRow({});
      setAssessmentNoticeByRow({});
      return;
    }

    const nextDraft = {};
    selectedSemester.rows.forEach((row) => {
      const rowKey = getAssessmentRowKey(row);
      if (!rowKey) return;
      nextDraft[rowKey] = {
        ca: toAssessmentInputValue(row.ca),
        midTerm: toAssessmentInputValue(row.midTerm),
        endTerm: toAssessmentInputValue(row.endTerm),
      };
    });

    setAssessmentDraftByRow(nextDraft);
    setAssessmentSavingByRow({});
    setAssessmentErrorByRow({});
    setAssessmentNoticeByRow({});
  }, [selectedSemester, getAssessmentRowKey]);

  const handleAssessmentInputChange = (row, field, value) => {
    const rowKey = getAssessmentRowKey(row);
    if (!rowKey) return;
    if (!/^\d*$/.test(value)) return;

    setAssessmentDraftByRow((prev) => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] || {}),
        [field]: value,
      },
    }));
    setAssessmentErrorByRow((prev) => ({ ...prev, [rowKey]: '' }));
    setAssessmentNoticeByRow((prev) => ({ ...prev, [rowKey]: '' }));
  };

  const getRowDraftValues = (row) => {
    const rowKey = getAssessmentRowKey(row);
    const draft = assessmentDraftByRow[rowKey] || {};
    const ca = draft.ca ?? toAssessmentInputValue(row.ca);
    const midTerm = draft.midTerm ?? toAssessmentInputValue(row.midTerm);
    const endTerm = draft.endTerm ?? toAssessmentInputValue(row.endTerm);
    return { rowKey, ca, midTerm, endTerm };
  };

  const parseAssessmentValue = (raw, label) => {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) return { error: `${label} is required.` };
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
      return { error: `${label} must be a non-negative integer.` };
    }
    if (parsed > 100) {
      return { error: `${label} must be 100 or less.` };
    }
    return { value: parsed };
  };

  const handleSaveAssessmentRow = async (row) => {
    const { rowKey, ca, midTerm, endTerm } = getRowDraftValues(row);
    if (!rowKey || !row?.courseId) return;

    const caParsed = parseAssessmentValue(ca, 'CA');
    if (caParsed.error) {
      setAssessmentErrorByRow((prev) => ({ ...prev, [rowKey]: caParsed.error }));
      return;
    }
    const midParsed = parseAssessmentValue(midTerm, 'Mid Term');
    if (midParsed.error) {
      setAssessmentErrorByRow((prev) => ({ ...prev, [rowKey]: midParsed.error }));
      return;
    }
    const endParsed = parseAssessmentValue(endTerm, 'End Term');
    if (endParsed.error) {
      setAssessmentErrorByRow((prev) => ({ ...prev, [rowKey]: endParsed.error }));
      return;
    }

    const total = caParsed.value + midParsed.value + endParsed.value;
    if (total !== 100) {
      setAssessmentErrorByRow((prev) => ({
        ...prev,
        [rowKey]: `Total must be 100 (current ${total}).`,
      }));
      return;
    }

    setAssessmentSavingByRow((prev) => ({ ...prev, [rowKey]: true }));
    setAssessmentErrorByRow((prev) => ({ ...prev, [rowKey]: '' }));
    setAssessmentNoticeByRow((prev) => ({ ...prev, [rowKey]: '' }));

    try {
      await updateCourseAssessmentPlan(row.courseId, {
        continuousAssessment: caParsed.value,
        midTermExam: midParsed.value,
        endTermExam: endParsed.value,
      });

      setAssessmentNoticeByRow((prev) => ({
        ...prev,
        [rowKey]: 'Saved',
      }));
      await fetchProgramAcademicPlan();
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save assessment plan.';
      setAssessmentErrorByRow((prev) => ({ ...prev, [rowKey]: message }));
    } finally {
      setAssessmentSavingByRow((prev) => ({ ...prev, [rowKey]: false }));
    }
  };

  useEffect(() => {
    if (!selectedSemester) {
      setManageSemesterId('');
      return;
    }
    const firstSemesterId = selectedSemester.primarySemesterId || selectedSemester.semesterIds?.[0] || '';
    setManageSemesterId((previous) => {
      if (
        previous &&
        Array.isArray(selectedSemester.semesterIds) &&
        selectedSemester.semesterIds.includes(previous)
      ) {
        return previous;
      }
      return firstSemesterId;
    });
  }, [selectedSemester]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Program Details</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !program) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/programs" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Programs
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-6 h-6 text-blue-600 mr-2" />
            Program Details
          </h1>
          <p className="text-gray-600 mt-1">Program details overview</p>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium text-gray-900">Program Name:</span> {program?.name || '-'}</div>
            <div><span className="font-medium text-gray-900">Program Code:</span> {program?.code || '-'}</div>
            <div><span className="font-medium text-gray-900">School:</span> {program?.school || '-'}</div>
            <div><span className="font-medium text-gray-900">Stream:</span> {program?.stream || '-'}</div>
            <div><span className="font-medium text-gray-900">Mode of Delivery:</span> {getModeOfDeliveryLabel(program?.modeOfDelivery)}</div>
            <div><span className="font-medium text-gray-900">Period Type:</span> {program?.periodType || '-'}</div>
            <div>
              <span className="font-medium text-gray-900">Total {getPeriodLabel(program?.periodType || 'semester')}s:</span>{' '}
              {program?.totalSemesters ?? '-'}
            </div>
            <div><span className="font-medium text-gray-900">Total Credits:</span> {program?.totalCredits ?? '-'}</div>
            <div><span className="font-medium text-gray-900">Program Coordinator:</span> {coordinatorDisplay}</div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-900">Description:</span> {program?.description || '-'}
            </div>
          </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Program {pLabel} Table</h2>
          <p className="text-sm text-gray-600 mt-1">
            Click a {pLabelLower} to review the table and open {pLabelLower} course management.
          </p>
        </div>

        {academicPlanLoading ? (
          <div className="rounded border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
            Loading {pLabelLower} table...
          </div>
        ) : academicPlanError ? (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {academicPlanError}
          </div>
        ) : semesterTableData.length === 0 ? (
          <div className="rounded border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
            No {pLabelLower}s found for this program.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {semesterTableData.map((semester) => (
                <button
                  key={`semester-tab-${semester.semNumber}`}
                  type="button"
                  onClick={() => setSelectedSemesterNumber(semester.semNumber)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    selectedSemester?.semNumber === semester.semNumber
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pLabel} {semester.semNumber}
                </button>
              ))}
            </div>

            {selectedSemester && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-3">
                  <div className="text-sm font-semibold text-gray-900">
                    {pLabel} {selectedSemester.semNumber}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {pLabel} Credit: {selectedSemester.semesterCredit}
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-3 border-b border-gray-200 px-4 py-3 bg-white">
                  {Array.isArray(selectedSemester.semesterIds) &&
                    selectedSemester.semesterIds.length > 1 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {pLabel} Record
                        </label>
                        <select
                          value={manageSemesterId}
                          onChange={(event) => setManageSemesterId(event.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          {selectedSemester.semesterIds.map((semesterId, index) => (
                            <option key={`${semesterId}-${index}`} value={semesterId}>
                              {pLabel} {selectedSemester.semNumber} - Instance {index + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  <button
                    type="button"
                    onClick={() => setShowSemesterManager(true)}
                    disabled={!manageSemesterId}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm ${
                      manageSemesterId
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Manage {pLabel} Courses
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-white border-b border-gray-200 text-gray-700">
                        <th rowSpan={2} className="px-3 py-2 text-left">Sl.No</th>
                        <th rowSpan={2} className="px-3 py-2 text-left">Course Name</th>
                        <th rowSpan={2} className="px-3 py-2 text-left">Course Code</th>
                        <th colSpan={4} className="px-3 py-2 text-center">Assessment Plan</th>
                        <th rowSpan={2} className="px-3 py-2 text-center">Action</th>
                      </tr>
                      <tr className="bg-white border-b border-gray-200 text-gray-600">
                        <th className="px-3 py-2 text-center">CA</th>
                        <th className="px-3 py-2 text-center">Mid Exam</th>
                        <th className="px-3 py-2 text-center">End Exam</th>
                        <th className="px-3 py-2 text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedSemester.rows.map((row) => {
                        const { rowKey, ca, midTerm, endTerm } = getRowDraftValues(row);
                        const caValue = Number(ca || 0);
                        const midValue = Number(midTerm || 0);
                        const endValue = Number(endTerm || 0);
                        const totalValue = caValue + midValue + endValue;
                        const rowError = assessmentErrorByRow[rowKey];
                        const rowNotice = assessmentNoticeByRow[rowKey];
                        const rowSaving = Boolean(assessmentSavingByRow[rowKey]);

                        return (
                          <tr key={row.key} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-700">{row.serial}</td>
                            <td className="px-3 py-2 text-gray-900">{row.title}</td>
                            <td className="px-3 py-2 font-mono text-gray-700">{row.courseCode}</td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={ca}
                                onChange={(event) =>
                                  handleAssessmentInputChange(row, 'ca', event.target.value)
                                }
                                className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={midTerm}
                                onChange={(event) =>
                                  handleAssessmentInputChange(row, 'midTerm', event.target.value)
                                }
                                className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={endTerm}
                                onChange={(event) =>
                                  handleAssessmentInputChange(row, 'endTerm', event.target.value)
                                }
                                className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 text-center font-semibold text-gray-900">
                              {Number.isFinite(totalValue) ? totalValue : '-'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveAssessmentRow(row)}
                                  disabled={rowSaving || !row.courseId}
                                  className={`rounded px-2 py-1 text-xs font-medium ${
                                    rowSaving || !row.courseId
                                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                                >
                                  {rowSaving ? 'Saving...' : 'Save'}
                                </button>
                                {rowError ? (
                                  <span className="max-w-[180px] text-[11px] text-red-600">
                                    {rowError}
                                  </span>
                                ) : null}
                                {rowNotice ? (
                                  <span className="text-[11px] text-emerald-700">{rowNotice}</span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {selectedSemester.rows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                            No courses available for this {pLabelLower}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showSemesterManager && selectedSemester && manageSemesterId && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">
                Manage {pLabel} {selectedSemester.semNumber} Courses
              </h3>
              <button
                type="button"
                onClick={() => setShowSemesterManager(false)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SemesterCourseTable
                semesterId={manageSemesterId}
                semesterData={{
                  _id: manageSemesterId,
                  semNumber: selectedSemester.semNumber,
                  name: `${getPeriodLabel(academicPlan?.program?.periodType || program?.periodType || 'semester')} ${selectedSemester.semNumber}`,
                  totalCredits: selectedSemester.semesterCredit,
                }}
                periodTotalCredits={selectedSemester.semesterCredit}
                programId={programId}
                periodType={academicPlan?.program?.periodType || program?.periodType || 'semester'}
                onAddSemester={() => setShowSemesterManager(false)}
                onUpdate={fetchProgramAcademicPlan}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramReview;
