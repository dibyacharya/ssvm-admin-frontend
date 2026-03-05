import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import { getCoursesForSemester } from '../../services/courses.service';
import { getSemesterCourseAssignment } from '../../services/program.service';
import SemesterCourseTable from '../academic/SemesterCourseTable';
import { getPeriodLabel } from '../../utils/periodLabel';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const StepCourseAssignment = ({ state, dispatch, goNext, goBack }) => {
  const { semesters, coursesBySemester, programId, programData } = state;
  const periodType = programData?.periodType || 'semester';
  const periodLabel = getPeriodLabel(periodType);
  const toIdString = (value) => (value == null ? '' : String(value));
  const getSemesterId = (semester) => toIdString(semester?._id || semester?.id || '');
  const semesterIdKey = semesters.map((semester) => getSemesterId(semester)).filter(Boolean).join('|');
  const coursesKey = Object.keys(coursesBySemester || {}).sort().join('|');
  const [activeTab, setActiveTab] = useState(getSemesterId(semesters[0]) || '');
  const [error, setError] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentStatusError, setAssignmentStatusError] = useState(null);
  const [assignmentStatusBySemester, setAssignmentStatusBySemester] = useState({});
  const [assignmentStatusRefreshNonce, setAssignmentStatusRefreshNonce] = useState(0);

  // Load existing courses for semesters that don't have courses in state yet
  useEffect(() => {
    const semestersToLoad = semesters.filter((sem) => {
      const semId = getSemesterId(sem);
      return semId && !coursesBySemester[semId];
    });
    if (semestersToLoad.length === 0) return;
    let cancelled = false;
    const load = async () => {
      setLoadingCourses(true);
      try {
        const results = await Promise.all(
          semestersToLoad.map((sem) => getCoursesForSemester(getSemesterId(sem)))
        );
        if (cancelled) return;
        semestersToLoad.forEach((sem, i) => {
          const semId = getSemesterId(sem);
          if (!semId) return;
          const courses = results[i]?.courses || results[i] || [];
          dispatch({ type: 'SET_COURSES_FOR_SEMESTER', semesterId: semId, courses });
        });
      } catch (err) {
        if (!cancelled) setError('Failed to load existing courses.');
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [semesterIdKey, coursesKey]);

  // Ensure active tab stays valid when semesters list changes (prevents cross-program/batch leaks).
  useEffect(() => {
    if (!semesters.length) {
      if (activeTab) setActiveTab('');
      return;
    }
    const exists = semesters.some((sem) => getSemesterId(sem) === toIdString(activeTab));
    if (!exists) {
      setActiveTab(getSemesterId(semesters[0]));
    }
  }, [semesterIdKey, activeTab]);

  // Load course-assignment completeness for all semesters to gate "Continue".
  useEffect(() => {
    if (!programId || semesters.length === 0) {
      setAssignmentStatusBySemester({});
      return;
    }

    let cancelled = false;
    const semIds = semesters.map((sem) => getSemesterId(sem)).filter(Boolean);
    const load = async () => {
      setLoadingAssignments(true);
      setAssignmentStatusError(null);
      try {
        const results = await Promise.all(
          semIds.map(async (semesterId) => {
            try {
              const response = await getSemesterCourseAssignment(programId, semesterId);
              return { semesterId, response };
            } catch (err) {
              return { semesterId, error: err };
            }
          })
        );
        if (cancelled) return;
        const next = {};
        results.forEach(({ semesterId, response, error: requestError }) => {
          if (requestError) {
            next[semesterId] = {
              ok: false,
              source: '',
              incomplete: true,
              reasons: [],
              error:
                requestError?.response?.data?.error ||
                requestError?.message ||
                'Failed to load course assignment',
            };
            return;
          }

          const reasons = Array.isArray(response?.incompleteReasons)
            ? response.incompleteReasons
            : [];
          next[semesterId] = {
            ok: true,
            source: response?.source || '',
            incomplete: Boolean(response?.incomplete),
            reasons,
          };
        });
        setAssignmentStatusBySemester(next);
      } catch (err) {
        if (!cancelled) setAssignmentStatusError('Failed to load course assignment status.');
      } finally {
        if (!cancelled) setLoadingAssignments(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [programId, semesterIdKey, assignmentStatusRefreshNonce]);

  const activeSemester = semesters.find((s) => getSemesterId(s) === toIdString(activeTab));

  const handleContinue = () => {
    dispatch({ type: 'MARK_COMPLETE', step: 3 });
    goNext();
  };

  const totalCourses = Object.values(coursesBySemester).reduce((sum, arr) => sum + arr.length, 0);

  const firstBlockingSemester = semesters.find((semester) => {
    const status = assignmentStatusBySemester[semester._id];
    if (!status || !status.ok) return true;
    if (!status.source || status.source === 'empty') return true; // structure must be saved at least once
    return status.incomplete;
  });

  const canContinue =
    semesters.length > 0 &&
    !loadingAssignments &&
    !firstBlockingSemester;

  if (semesters.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Course Assignment</h1>
        <hr className="my-6 border-gray-200" />
        <div className="text-center py-12">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-6">
            No {periodLabel.toLowerCase()}s have been created yet. You can go back to add {periodLabel.toLowerCase()}s, or skip this step.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={goBack} className="inline-flex items-center px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <button onClick={handleContinue} className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              Skip & Continue <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Course Assignment</h1>
      <p className="mt-1 text-sm text-gray-500">
        Add courses to each {periodLabel.toLowerCase()}.{' '}
        <span className="font-medium text-gray-700">
          {totalCourses} course{totalCourses !== 1 ? 's' : ''} added.
        </span>
      </p>

      <hr className="my-6 border-gray-200" />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {loadingCourses && (
        <div className="flex items-center justify-center py-6 mb-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-gray-500">Loading existing courses…</span>
        </div>
      )}

      {(assignmentStatusError || Object.values(assignmentStatusBySemester).some((status) => status?.error)) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-700">
          {assignmentStatusError || 'Some course assignments could not be loaded.'}
        </div>
      )}

      {/* Period tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {semesters.map((sem) => {
          const semId = getSemesterId(sem);
          const count = semId ? (coursesBySemester[semId] || []).length : 0;
          const isActive = toIdString(activeTab) === semId;
          return (
            <button
              key={semId || sem.name}
              onClick={() => { if (semId) setActiveTab(semId); setError(null); }}
              className={`
                flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }
              `}
            >
              {sem.name}
              <span className={`ml-1.5 text-xs ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Courses for active tab */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <SemesterCourseTable
            semesterId={activeTab}
            semesterData={activeSemester}
            periodTotalCredits={activeSemester?.totalCredits ?? null}
            programId={programId}
            initialStructure={programData?.academicPlanStructure}
            periodType={periodType}
            hideCoursePool
            onAddSemester={goBack}
            onUpdate={async () => {
              try {
                const data = await getCoursesForSemester(activeTab);
                const list = data?.courses || data || [];
                dispatch({ type: 'SET_COURSES_FOR_SEMESTER', semesterId: activeTab, courses: list });
              } catch (err) {
                setError('Failed to refresh courses.');
              } finally {
                setAssignmentStatusRefreshNonce((value) => value + 1);
              }
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-8">
        <button
          onClick={goBack}
          className="inline-flex items-center px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-2" />
          </button>
          {!canContinue && semesters.length > 0 && (
            <div className="text-[11px] text-gray-500">
              Complete course assignment for all {periodLabel.toLowerCase()}s (save structure + resolve incomplete warnings).
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepCourseAssignment;
