import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PencilLine,
  RotateCcw,
} from "lucide-react";
import { getPeriodLabel } from "../../utils/periodLabel";
import { getModeOfDeliveryLabel } from "../../constants/modeOfDelivery";
import { safeCredits } from "../../utils/nullSafety";
import { updateProgram } from "../../services/program.service";

const normalizeCourses = (courses) => {
  if (Array.isArray(courses)) return courses.filter(Boolean);
  if (courses && typeof courses === "object") {
    return Object.values(courses)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(Boolean);
  }
  return [];
};

const formatDate = (value) => {
  if (!value) return "-";
  if (typeof value === "string") return value.split("T")[0];
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return "-";
};

const readTeachers = (course) => {
  const assigned = Array.isArray(course?.assignedTeachers)
    ? course.assignedTeachers
    : [];
  if (assigned.length > 0) {
    return assigned
      .map((teacher) => {
        const name = teacher?.name || teacher?.email || "";
        const role = teacher?.roleLabel ? ` (${teacher.roleLabel})` : "";
        return name ? `${name}${role}` : "";
      })
      .filter(Boolean);
  }
  if (Array.isArray(course?.teachers)) {
    return course.teachers
      .map((teacher) => {
        if (!teacher) return "";
        if (typeof teacher === "string") return teacher;
        return teacher.name || teacher.email || "";
      })
      .filter(Boolean);
  }
  return [];
};

const StepReviewComplete = ({ state, dispatch, goBack }) => {
  const { programData, semesters, coursesBySemester, finalSubmitted } =
    state;
  const periodLabel = getPeriodLabel(programData?.periodType);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const reviewData = useMemo(() => {
    const semesterSummaries = semesters.map((semester) => {
      const courseList = normalizeCourses(coursesBySemester[semester._id] || []);
      const totalCredits = courseList.reduce(
        (sum, course) => sum + safeCredits(course?.creditPoints),
        0
      );
      return {
        semester,
        courses: courseList,
        totalCredits,
      };
    });

    const totalCourses = semesterSummaries.reduce(
      (sum, item) => sum + item.courses.length,
      0
    );
    const totalCredits = semesterSummaries.reduce(
      (sum, item) => sum + item.totalCredits,
      0
    );

    return {
      semesterSummaries,
      totalCourses,
      totalCredits,
    };
  }, [semesters, coursesBySemester]);

  const blockingIssues = [];
  if (!state.programId) blockingIssues.push("Program has not been selected.");

  const warnings = [];
  if (!programData?.name || !programData?.code) {
    warnings.push("Program name/code is incomplete.");
  }
  if (semesters.length === 0) {
    warnings.push(`No ${periodLabel.toLowerCase()}s added yet.`);
  }
  if (reviewData.totalCourses === 0) {
    warnings.push("No courses assigned yet.");
  }

  const jumpToEditStep = (step) => {
    dispatch({ type: "SET_RETURN_TO_REVIEW", value: true });
    dispatch({ type: "SET_FINAL_SUBMITTED", value: false });
    dispatch({ type: "SET_STEP", step });
  };

  const handleFinalSubmit = async () => {
    if (blockingIssues.length > 0 || !state.programId) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      // Final commit signal: mark onboarding confirmation on the selected program.
      await updateProgram(state.programId, {
        isActive: programData?.isActive !== false,
      });
      dispatch({ type: "MARK_COMPLETE", step: 4 });
      dispatch({ type: "SET_FINAL_SUBMITTED", value: true });
    } catch (err) {
      setSubmitError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Final submit failed. Please retry."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (finalSubmitted) {
    return (
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"
        >
          <CheckCircle className="w-10 h-10 text-green-500" />
        </motion.div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Program Onboarded Successfully
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Your onboarding data has been finalized.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/programs"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Go to Program Management
            <ChevronRight className="w-4 h-4 ml-2" />
          </Link>
          <button
            onClick={() => dispatch({ type: "RESET" })}
            className="inline-flex items-center px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Onboard Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Review</h1>
      <p className="mt-1 text-sm text-gray-500">
        Review all details before final submit.
      </p>

      <hr className="my-6 border-gray-200" />

      {(blockingIssues.length > 0 || warnings.length > 0 || submitError) && (
        <div className="mb-6 space-y-3">
          {blockingIssues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              <div className="font-medium mb-1">Action required</div>
              <ul className="list-disc pl-5 space-y-1">
                {blockingIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
              <div className="font-medium mb-1">Warnings</div>
              <ul className="list-disc pl-5 space-y-1">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {submitError}
            </div>
          )}
        </div>
      )}

      <div className="space-y-5">
        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Program</h2>
            <button
              onClick={() => jumpToEditStep(1)}
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
            >
              <PencilLine className="w-3.5 h-3.5 mr-1" />
              Edit
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Name:</span> {programData?.name || "-"}</div>
            <div><span className="text-gray-500">Code:</span> {programData?.code || "-"}</div>
            <div><span className="text-gray-500">School:</span> {programData?.school || "-"}</div>
            <div><span className="text-gray-500">Stream:</span> {programData?.stream || "-"}</div>
            <div>
              <span className="text-gray-500">Mode:</span>{" "}
              {getModeOfDeliveryLabel(programData?.modeOfDelivery)}
            </div>
            <div>
              <span className="text-gray-500">Period Type:</span> {periodLabel}
            </div>
            <div>
              <span className="text-gray-500">Total {periodLabel}s:</span>{" "}
              {programData?.totalSemesters ?? "-"}
            </div>
            <div>
              <span className="text-gray-500">Total Credits:</span>{" "}
              {programData?.totalCredits ?? "-"}
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">{periodLabel}s</h2>
            <button
              onClick={() => jumpToEditStep(2)}
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
            >
              <PencilLine className="w-3.5 h-3.5 mr-1" />
              Edit
            </button>
          </div>
          {reviewData.semesterSummaries.length === 0 ? (
            <div className="text-sm text-gray-500">No {periodLabel.toLowerCase()}s added.</div>
          ) : (
            <div className="space-y-3">
              {reviewData.semesterSummaries.map(({ semester, totalCredits }) => (
                <div
                  key={semester._id}
                  className="border border-gray-100 rounded-lg px-4 py-3 text-sm"
                >
                  <div className="font-medium text-gray-900">{semester.name}</div>
                  <div className="text-gray-500 mt-1">
                    {formatDate(semester.startDate)} → {formatDate(semester.endDate)}
                    {semester.totalCredits !== undefined && semester.totalCredits !== null && (
                      <span className="ml-2">
                        | planned: {semester.totalCredits} credits
                      </span>
                    )}
                    <span className="ml-2">| assigned: {totalCredits} credits</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Courses</h2>
            <button
              onClick={() => jumpToEditStep(3)}
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
            >
              <PencilLine className="w-3.5 h-3.5 mr-1" />
              Edit
            </button>
          </div>

          {reviewData.totalCourses === 0 ? (
            <div className="text-sm text-gray-500">No courses assigned.</div>
          ) : (
            <div className="space-y-4">
              {reviewData.semesterSummaries.map(({ semester, courses }) => (
                <div key={semester._id}>
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
                    {semester.name}
                  </div>
                  <div className="space-y-2">
                    {courses.map((course) => {
                      const credits = safeCredits(course?.creditPoints);
                      const teachers = readTeachers(course);
                      return (
                        <div
                          key={`${semester._id}-${course?._id || course?.courseCode || Math.random()}`}
                          className="border border-gray-100 rounded-lg px-3 py-2 text-sm"
                        >
                          <div className="font-medium text-gray-900">
                            {course?.courseCode || "-"} — {course?.title || "-"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {course?.courseCategory || "COURSE"}
                            {course?.slotIndex ? ` | slot ${course.slotIndex}` : ""}
                            {credits > 0 ? ` | credits ${credits}` : ""}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Teachers: {teachers.length > 0 ? teachers.join(", ") : "Unassigned"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="flex items-center justify-between pt-8">
        <button
          onClick={goBack}
          className="inline-flex items-center px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <button
          onClick={handleFinalSubmit}
          disabled={submitting || blockingIssues.length > 0}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Final Submit
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};

export default StepReviewComplete;
