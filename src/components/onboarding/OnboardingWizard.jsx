import React, { useReducer, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import WizardStepper from './WizardStepper';
import StepProgramSetup from './StepProgramSetup';
import StepBatchSetup from './StepBatchSetup';
import StepSemesterSetup from './StepSemesterSetup';
import StepCourseAssignment from './StepCourseAssignment';
import StepReviewComplete from './StepReviewComplete';
import { getPeriodLabel } from '../../utils/periodLabel';
import { getProgramById } from '../../services/program.service';
import { getBatchById } from '../../services/batch.service';

const MAX_STEP = 5;
const WIZARD_STORAGE_KEY = 'programWizardState';

const toIdString = (value) => (value == null ? '' : String(value));
const getSemesterId = (semester) =>
  toIdString(semester?._id || semester?.id || semester?.tempId || '');

const normalizeSemesters = (semesters) =>
  (Array.isArray(semesters) ? semesters : [])
    .map((semester) =>
      semester && typeof semester === 'object'
        ? { ...semester, _id: getSemesterId(semester) || semester?._id }
        : semester
    )
    .filter(Boolean);

const normalizeCoursesBySemester = (coursesBySemester) => {
  if (!coursesBySemester || typeof coursesBySemester !== 'object' || Array.isArray(coursesBySemester)) {
    return {};
  }
  const normalized = {};
  Object.entries(coursesBySemester).forEach(([semesterId, courses]) => {
    const key = toIdString(semesterId);
    if (!key) return;
    normalized[key] = Array.isArray(courses) ? courses : [];
  });
  return normalized;
};

const normalizeCompletedSteps = (completedSteps) => {
  const list = Array.isArray(completedSteps)
    ? completedSteps
    : completedSteps instanceof Set
      ? Array.from(completedSteps)
      : [];

  return new Set(
    list
      .map((step) => Number(step))
      .filter((step) => Number.isInteger(step) && step >= 1 && step <= MAX_STEP)
  );
};

const clampStep = (step) => {
  const parsed = Number(step);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(MAX_STEP, Math.max(1, Math.trunc(parsed)));
};

const hasMappedCourses = (wizardState) => {
  if (wizardState?.completedSteps?.has?.(4)) {
    return true;
  }
  return Object.values(wizardState?.coursesBySemester || {}).some(
    (courses) => Array.isArray(courses) && courses.length > 0
  );
};

const canNavigateToStep = (targetStep, wizardState) => {
  const nextStep = clampStep(targetStep);
  const hasProgram = Boolean(toIdString(wizardState?.programId));
  const hasBatch = Boolean(toIdString(wizardState?.batchId));
  const hasSemesters = Array.isArray(wizardState?.semesters) && wizardState.semesters.length > 0;
  const hasCourses = hasMappedCourses(wizardState);

  if (nextStep >= 2 && !hasProgram) {
    return { allowed: false, message: 'Please complete Program setup' };
  }
  if (nextStep >= 3 && !hasBatch) {
    return { allowed: false, message: 'Please complete Batch setup' };
  }
  if (nextStep >= 4 && !hasSemesters) {
    return { allowed: false, message: 'Please add and save at least one period/semester' };
  }
  if (nextStep >= 5 && !hasCourses) {
    return { allowed: false, message: 'Please complete Courses mapping' };
  }

  return { allowed: true, message: '' };
};

const getLastValidStep = (wizardState) => {
  for (let step = MAX_STEP; step >= 1; step -= 1) {
    if (canNavigateToStep(step, wizardState).allowed) {
      return step;
    }
  }
  return 1;
};

const toHydratedState = (rawState, initialState) => {
  const base = rawState && typeof rawState === 'object' ? rawState : {};
  return {
    ...initialState,
    ...base,
    currentStep: clampStep(base.currentStep ?? initialState.currentStep),
    direction: 1,
    programMode: base.programMode === 'existing' ? 'existing' : (base.programMode || initialState.programMode),
    programId: toIdString(base.programId) || null,
    batchId: toIdString(base.batchId) || null,
    semesters: normalizeSemesters(base.semesters),
    coursesBySemester: normalizeCoursesBySemester(base.coursesBySemester),
    completedSteps: normalizeCompletedSteps(base.completedSteps),
    returnToReview: Boolean(base.returnToReview),
    finalSubmitted: Boolean(base.finalSubmitted),
  };
};

const buildPersistableState = (wizardState) => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  currentStep: clampStep(wizardState.currentStep),
  programMode: wizardState.programMode || 'create',
  programId: toIdString(wizardState.programId) || null,
  programData: wizardState.programData || null,
  batchId: toIdString(wizardState.batchId) || null,
  batchData: wizardState.batchData || null,
  semesters: normalizeSemesters(wizardState.semesters),
  coursesBySemester: normalizeCoursesBySemester(wizardState.coursesBySemester),
  completedSteps: Array.from(normalizeCompletedSteps(wizardState.completedSteps)),
  returnToReview: Boolean(wizardState.returnToReview),
  finalSubmitted: Boolean(wizardState.finalSubmitted),
});

const readWizardStateFromUrl = (search) => {
  const params = new URLSearchParams(search || '');
  const hasKnownParams = ['step', 'programId', 'batchId', 'mode'].some((key) => params.has(key));
  if (!hasKnownParams) return null;

  const parsed = {};
  if (params.has('step')) parsed.currentStep = clampStep(params.get('step'));
  if (params.has('programId')) parsed.programId = toIdString(params.get('programId')) || null;
  if (params.has('batchId')) parsed.batchId = toIdString(params.get('batchId')) || null;
  if (params.has('mode')) parsed.programMode = params.get('mode') === 'existing' ? 'existing' : 'create';

  return parsed;
};

const writeWizardStateToUrl = ({ state, location, navigate, clear = false }) => {
  const params = new URLSearchParams(location.search || '');

  if (clear) {
    params.delete('step');
    params.delete('programId');
    params.delete('batchId');
    params.delete('mode');
  } else {
    params.set('step', String(clampStep(state.currentStep)));
    if (toIdString(state.programId)) params.set('programId', toIdString(state.programId));
    else params.delete('programId');

    if (toIdString(state.batchId)) params.set('batchId', toIdString(state.batchId));
    else params.delete('batchId');

    params.set('mode', state.programMode === 'existing' ? 'existing' : 'create');
  }

  const nextSearch = params.toString();
  const currentSearch = String(location.search || '').replace(/^\?/, '');
  if (nextSearch === currentSearch) return;

  navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
};

const readWizardStateFromStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const writeWizardStateToStorage = (state) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore write failures (private mode/quota).
  }
};

const clearWizardStateFromStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
  } catch {
    // Ignore clear failures.
  }
};

const initialState = {
  currentStep: 1,
  direction: 1,
  programMode: 'create',
  programId: null,
  programData: null,
  batchId: null,
  batchData: null,
  semesters: [],
  coursesBySemester: {},
  completedSteps: new Set(),
  returnToReview: false,
  finalSubmitted: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE': {
      if (!action.state || typeof action.state !== 'object') return state;
      const hydrated = toHydratedState(action.state, initialState);
      return {
        ...state,
        ...hydrated,
        direction: 1,
      };
    }
    case 'SET_STEP':
      return {
        ...state,
        direction: action.step > state.currentStep ? 1 : -1,
        currentStep: clampStep(action.step),
      };
    case 'SET_PROGRAM_MODE':
      return {
        ...state,
        programMode: action.mode === 'existing' ? 'existing' : 'create',
      };
    case 'SET_PROGRAM': {
      const nextProgramId = action.programId;
      const programChanged =
        state.programId && nextProgramId && state.programId !== nextProgramId;

      if (programChanged) {
        return {
          ...state,
          programId: nextProgramId,
          programData: action.programData,
          programMode: action.programMode || state.programMode,
          batchId: null,
          batchData: null,
          semesters: [],
          coursesBySemester: {},
          returnToReview: false,
          finalSubmitted: false,
          completedSteps: new Set([1]),
        };
      }

      return {
        ...state,
        programId: nextProgramId,
        programData: action.programData,
        programMode: action.programMode || state.programMode,
        finalSubmitted: false,
        completedSteps: new Set([...state.completedSteps, 1]),
      };
    }
    case 'SET_BATCH':
      return {
        ...state,
        batchId: action.batchId,
        batchData: action.batchData,
        semesters: [],
        coursesBySemester: {},
        returnToReview: false,
        finalSubmitted: false,
        completedSteps: new Set([1, 2]),
      };
    case 'ADD_SEMESTER':
      return {
        ...state,
        semesters: [
          ...state.semesters,
          action.semester && typeof action.semester === 'object'
            ? { ...action.semester, _id: getSemesterId(action.semester) || action.semester?._id }
            : action.semester,
        ],
        finalSubmitted: false,
      };
    case 'UPDATE_SEMESTER': {
      const targetId = getSemesterId(action.semester);
      const updated = state.semesters.map((semester) => {
        const currentId = getSemesterId(semester);
        if (currentId && targetId && currentId === targetId) {
          return action.semester && typeof action.semester === 'object'
            ? { ...action.semester, _id: targetId || action.semester?._id }
            : action.semester;
        }
        return semester;
      });
      return { ...state, semesters: updated, finalSubmitted: false };
    }
    case 'REMOVE_SEMESTER': {
      const targetId = toIdString(action.semesterId);
      const filtered = state.semesters.filter((semester) => {
        const currentId = getSemesterId(semester);
        return currentId !== targetId;
      });
      const newCourses = { ...state.coursesBySemester };
      delete newCourses[targetId];
      return {
        ...state,
        semesters: filtered,
        coursesBySemester: newCourses,
        finalSubmitted: false,
      };
    }
    case 'ADD_COURSE': {
      const semesterId = action.semesterId;
      const existing = state.coursesBySemester[semesterId] || [];
      return {
        ...state,
        coursesBySemester: {
          ...state.coursesBySemester,
          [semesterId]: [...existing, action.course],
        },
        finalSubmitted: false,
      };
    }
    case 'REMOVE_COURSE': {
      const semesterId = action.semesterId;
      const courses = (state.coursesBySemester[semesterId] || []).filter(
        (course) => course._id !== action.courseId
      );
      return {
        ...state,
        coursesBySemester: { ...state.coursesBySemester, [semesterId]: courses },
        finalSubmitted: false,
      };
    }
    case 'SET_SEMESTERS':
      return {
        ...state,
        semesters: normalizeSemesters(action.semesters),
        finalSubmitted: false,
      };
    case 'SET_COURSES_FOR_SEMESTER':
      return {
        ...state,
        coursesBySemester: {
          ...state.coursesBySemester,
          [action.semesterId]: action.courses,
        },
        finalSubmitted: false,
      };
    case 'MARK_COMPLETE':
      return {
        ...state,
        completedSteps: new Set([...state.completedSteps, action.step]),
      };
    case 'SET_RETURN_TO_REVIEW':
      return {
        ...state,
        returnToReview: Boolean(action.value),
      };
    case 'SET_FINAL_SUBMITTED':
      return {
        ...state,
        finalSubmitted: Boolean(action.value),
      };
    case 'RESET':
      return { ...initialState, completedSteps: new Set() };
    default:
      return state;
  }
}

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState(null);

  const showNotice = useCallback((message, tone = 'warning') => {
    if (!message) return;
    setNotice({
      id: Date.now(),
      tone,
      message,
    });
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => {
      setNotice((current) => (current?.id === notice.id ? null : current));
    }, 4200);
    return () => clearTimeout(timer);
  }, [notice]);

  const validatePersistedState = useCallback(async (candidateState) => {
    let nextState = toHydratedState(candidateState, initialState);
    const notices = [];

    const resetFromProgram = () => {
      nextState = {
        ...nextState,
        programMode: nextState.programMode || 'create',
        programId: null,
        programData: null,
        batchId: null,
        batchData: null,
        semesters: [],
        coursesBySemester: {},
        completedSteps: new Set(),
        returnToReview: false,
        finalSubmitted: false,
        currentStep: 1,
      };
    };

    const resetFromBatch = () => {
      nextState = {
        ...nextState,
        batchId: null,
        batchData: null,
        semesters: [],
        coursesBySemester: {},
        completedSteps: new Set([...nextState.completedSteps].filter((step) => step <= 1)),
        returnToReview: false,
        finalSubmitted: false,
      };
    };

    const persistedProgramId = toIdString(nextState.programId);
    if (persistedProgramId) {
      try {
        const response = await getProgramById(persistedProgramId);
        const program = response?.program || response;
        if (!toIdString(program?._id)) {
          throw new Error('Program not found');
        }
        nextState.programId = toIdString(program._id);
        nextState.programData = program;
        nextState.completedSteps.add(1);
      } catch {
        resetFromProgram();
        notices.push('Saved program was not found. Wizard moved to Step 1.');
      }
    }

    const persistedBatchId = toIdString(nextState.batchId);
    if (persistedBatchId) {
      if (!toIdString(nextState.programId)) {
        resetFromBatch();
      } else {
        try {
          const response = await getBatchById(persistedBatchId);
          const batch = response?.batch || response;
          const resolvedBatchId = toIdString(batch?._id);
          if (!resolvedBatchId) {
            throw new Error('Batch not found');
          }

          const batchProgramId = toIdString(batch?.program?._id || batch?.program);
          if (batchProgramId && batchProgramId !== toIdString(nextState.programId)) {
            resetFromBatch();
            notices.push('Saved batch does not belong to selected program. Please select a batch again.');
          } else {
            nextState.batchId = resolvedBatchId;
            nextState.batchData = batch;
            nextState.completedSteps.add(2);
          }
        } catch {
          resetFromBatch();
          notices.push('Saved batch was not found. Please select a batch again.');
        }
      }
    }

    if (!toIdString(nextState.programId)) {
      resetFromProgram();
    } else if (!toIdString(nextState.batchId)) {
      nextState = {
        ...nextState,
        semesters: [],
        coursesBySemester: {},
        completedSteps: new Set([...nextState.completedSteps].filter((step) => step <= 2)),
        returnToReview: false,
        finalSubmitted: false,
      };
    }

    const maxValidStep = getLastValidStep(nextState);
    const requestedStep = clampStep(nextState.currentStep);
    if (requestedStep > maxValidStep) {
      nextState.currentStep = maxValidStep;
      notices.push(`Moved to Step ${maxValidStep} because required previous data is missing.`);
    } else {
      nextState.currentStep = requestedStep;
    }

    return {
      nextState,
      notice: notices[0] || '',
    };
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateState = async () => {
      const storageState = readWizardStateFromStorage();
      const urlState = readWizardStateFromUrl(location.search);
      const candidateRaw = urlState ? { ...(storageState || {}), ...urlState } : storageState;

      const { nextState, notice: hydrateNotice } = await validatePersistedState(candidateRaw);
      if (!active) return;

      dispatch({ type: 'HYDRATE', state: nextState });
      if (hydrateNotice) {
        showNotice(hydrateNotice, 'warning');
      }
      setHydrated(true);
    };

    hydrateState();

    return () => {
      active = false;
    };
  }, []);

  const isResetState = useMemo(() => {
    return (
      state.currentStep === 1 &&
      !toIdString(state.programId) &&
      !toIdString(state.batchId) &&
      state.semesters.length === 0 &&
      Object.keys(state.coursesBySemester || {}).length === 0 &&
      state.completedSteps.size === 0 &&
      !state.returnToReview &&
      !state.finalSubmitted
    );
  }, [
    state.currentStep,
    state.programId,
    state.batchId,
    state.semesters,
    state.coursesBySemester,
    state.completedSteps,
    state.returnToReview,
    state.finalSubmitted,
  ]);

  useEffect(() => {
    if (!hydrated) return;

    if (isResetState) {
      clearWizardStateFromStorage();
      writeWizardStateToUrl({ location, navigate, clear: true });
      return;
    }

    const persistableState = buildPersistableState(state);
    writeWizardStateToStorage(persistableState);
    writeWizardStateToUrl({ state: persistableState, location, navigate });
  }, [hydrated, isResetState, state, location, navigate]);

  const goNext = useCallback(() => {
    if (state.currentStep < MAX_STEP) {
      if (state.returnToReview) {
        dispatch({ type: 'SET_RETURN_TO_REVIEW', value: false });
        dispatch({ type: 'SET_STEP', step: MAX_STEP });
        return;
      }
      dispatch({ type: 'SET_STEP', step: state.currentStep + 1 });
    }
  }, [state.currentStep, state.returnToReview]);

  const goBack = useCallback(() => {
    if (state.returnToReview && state.currentStep === 1) {
      dispatch({ type: 'SET_RETURN_TO_REVIEW', value: false });
      dispatch({ type: 'SET_STEP', step: MAX_STEP });
      return;
    }
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_STEP', step: state.currentStep - 1 });
    }
  }, [state.currentStep, state.returnToReview]);

  const handleStepClick = useCallback(
    (step) => {
      if (!hydrated) return;
      const targetStep = clampStep(step);
      const gate = canNavigateToStep(targetStep, state);
      if (!gate.allowed) {
        showNotice(`${gate.message} before going to Step ${targetStep}.`, 'warning');
        return;
      }
      if (targetStep === state.currentStep) return;

      dispatch({ type: 'SET_RETURN_TO_REVIEW', value: false });
      dispatch({ type: 'SET_STEP', step: targetStep });
    },
    [hydrated, state, showNotice]
  );

  const renderStep = () => {
    const common = { state, dispatch, goNext, goBack };
    switch (state.currentStep) {
      case 1:
        return <StepProgramSetup {...common} />;
      case 2:
        return <StepBatchSetup {...common} />;
      case 3:
        return <StepSemesterSetup {...common} />;
      case 4:
        return <StepCourseAssignment {...common} />;
      case 5:
        return <StepReviewComplete {...common} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full -m-6 bg-gray-50">
      <WizardStepper
        currentStep={state.currentStep}
        completedSteps={state.completedSteps}
        periodLabel={getPeriodLabel(state.programData?.periodType)}
        onStepClick={handleStepClick}
      />

      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed right-6 top-24 z-20 max-w-md rounded-lg border px-4 py-3 shadow-sm ${
              notice.tone === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{notice.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait" custom={state.direction}>
          <motion.div
            key={state.currentStep}
            custom={state.direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingWizard;
