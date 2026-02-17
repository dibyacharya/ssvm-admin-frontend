import React, { useReducer, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import WizardStepper from './WizardStepper';
import StepProgramSetup from './StepProgramSetup';
import StepBatchSetup from './StepBatchSetup';
import StepSemesterSetup from './StepSemesterSetup';
import StepCourseAssignment from './StepCourseAssignment';
import StepReviewComplete from './StepReviewComplete';
import { getPeriodLabel } from '../../utils/periodLabel';

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
  const toIdString = (value) => (value == null ? '' : String(value));
  const getSemesterId = (semester) =>
    toIdString(semester?._id || semester?.id || semester?.tempId || '');

  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        direction: action.step > state.currentStep ? 1 : -1,
        currentStep: action.step,
      };
    case 'SET_PROGRAM':
      {
        const nextProgramId = action.programId;
        const programChanged =
          state.programId && nextProgramId && state.programId !== nextProgramId;

        // Switching programs must clear all downstream state to prevent cross-program leaks.
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
      const updated = state.semesters.map((s) => {
        const currentId = getSemesterId(s);
        if (currentId && targetId && currentId === targetId) {
          return action.semester && typeof action.semester === 'object'
            ? { ...action.semester, _id: targetId || action.semester?._id }
            : action.semester;
        }
        return s;
      });
      return { ...state, semesters: updated, finalSubmitted: false };
    }
    case 'REMOVE_SEMESTER': {
      const targetId = toIdString(action.semesterId);
      const filtered = state.semesters.filter((s) => {
        const currentId = getSemesterId(s);
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
      const semId = action.semesterId;
      const existing = state.coursesBySemester[semId] || [];
      return {
        ...state,
        coursesBySemester: {
          ...state.coursesBySemester,
          [semId]: [...existing, action.course],
        },
        finalSubmitted: false,
      };
    }
    case 'REMOVE_COURSE': {
      const sid = action.semesterId;
      const courses = (state.coursesBySemester[sid] || []).filter(
        c => c._id !== action.courseId
      );
      return {
        ...state,
        coursesBySemester: { ...state.coursesBySemester, [sid]: courses },
        finalSubmitted: false,
      };
    }
    case 'SET_SEMESTERS':
      return {
        ...state,
        semesters: (Array.isArray(action.semesters) ? action.semesters : []).map((semester) =>
          semester && typeof semester === 'object'
            ? { ...semester, _id: getSemesterId(semester) || semester?._id }
            : semester
        ),
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
  const [state, dispatch] = useReducer(reducer, initialState);

  const goNext = useCallback(() => {
    if (state.currentStep < 5) {
      if (state.returnToReview) {
        dispatch({ type: 'SET_RETURN_TO_REVIEW', value: false });
        dispatch({ type: 'SET_STEP', step: 5 });
        return;
      }
      dispatch({ type: 'SET_STEP', step: state.currentStep + 1 });
    }
  }, [state.currentStep, state.returnToReview]);

  const goBack = useCallback(() => {
    if (state.returnToReview && state.currentStep === 1) {
      dispatch({ type: 'SET_RETURN_TO_REVIEW', value: false });
      dispatch({ type: 'SET_STEP', step: 5 });
      return;
    }
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_STEP', step: state.currentStep - 1 });
    }
  }, [state.currentStep, state.returnToReview]);

  const renderStep = () => {
    const common = { state, dispatch, goNext, goBack };
    switch (state.currentStep) {
      case 1: return <StepProgramSetup {...common} />;
      case 2: return <StepBatchSetup {...common} />;
      case 3: return <StepSemesterSetup {...common} />;
      case 4: return <StepCourseAssignment {...common} />;
      case 5: return <StepReviewComplete {...common} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-full -m-6 bg-gray-50">
      <WizardStepper
        currentStep={state.currentStep}
        completedSteps={state.completedSteps}
        periodLabel={getPeriodLabel(state.programData?.periodType)}
      />
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
