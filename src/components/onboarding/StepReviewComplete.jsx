import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  ChevronLeft,
  PencilLine,
  RotateCcw,
  Check,
  Loader2,
} from "lucide-react";
import { createProgram, updateProgram, updateSemesterCourseAssignment } from "../../services/program.service";
import { createSemester } from "../../services/semester.services";
import { createCourse, lookupCourseByCode, updateCourse } from "../../services/courses.service";
import { getPeriodLabel } from "../../utils/periodLabel";
import { getModeOfDeliveryLabel } from "../../constants/modeOfDelivery";

const toNum = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fb;
};

/* ── Helpers for new course structure format ── */
const isStructureFormat = (data) =>
  data && typeof data === "object" && !Array.isArray(data) && data.structure;

const countCoursesInData = (data) => {
  if (isStructureFormat(data)) {
    const compFilled = (data.compulsorySlots || []).filter((s) => s.course).length;
    const elecCourses = (data.electiveBlocks || []).reduce(
      (s, b) => s + (b.options || []).length,
      0
    );
    return compFilled + elecCourses;
  }
  if (Array.isArray(data)) return data.length;
  return 0;
};

const getCompulsoryCourses = (data) => {
  if (isStructureFormat(data)) {
    return (data.compulsorySlots || [])
      .filter((s) => s.course)
      .map((s) => {
        const c = s.course;
        return {
          code: c.courseCode || c.code || "-",
          title: c.title || c.name || "-",
          lecture: toNum(c.lecture ?? c.creditPoints?.lecture),
          tutorial: toNum(c.tutorial ?? c.creditPoints?.tutorial),
          practical: toNum(c.practical ?? c.creditPoints?.practical),
          credits: toNum(c.credits ?? c.totalCredits ?? c.creditPoints?.total),
          type: "Compulsory",
        };
      });
  }
  if (Array.isArray(data)) {
    return data.map((c) => ({
      code: c.courseCode || c.code || "-",
      title: c.title || c.name || "-",
      lecture: toNum(c.lecture ?? c.creditPoints?.lecture),
      tutorial: toNum(c.tutorial ?? c.creditPoints?.tutorial),
      practical: toNum(c.practical ?? c.creditPoints?.practical),
      credits: toNum(c.credits ?? c.totalCredits ?? c.creditPoints?.total),
      type: "Compulsory",
    }));
  }
  return [];
};

const getElectiveBlockSummary = (data) => {
  if (!isStructureFormat(data)) return [];
  return (data.electiveBlocks || [])
    .filter((b) => (b.options || []).length > 0)
    .map((b, i) => ({
      index: i + 1,
      rule: b.rule || "ANY_ONE",
      pickN: b.pickN || 1,
      count: (b.options || []).length,
      courses: (b.options || []).map((c) => ({
        code: c.courseCode || c.code || "-",
        title: c.title || c.name || "-",
        lecture: toNum(c.lecture ?? c.creditPoints?.lecture),
        tutorial: toNum(c.tutorial ?? c.creditPoints?.tutorial),
        practical: toNum(c.practical ?? c.creditPoints?.practical),
        credits: toNum(c.credits ?? c.totalCredits ?? c.creditPoints?.total),
        type: `Elective ${i + 1}`,
      })),
    }));
};

const StepReviewComplete = ({
  state,
  dispatch,
  goBack,
  isEditMode = false,
  editProgramId = null,
}) => {
  const { programData, programId: stateProgramId, semesters, finalSubmitted, coursesBySemester } = state;
  // In edit mode, always prefer editProgramId from URL over state.programId
  const programId = editProgramId || stateProgramId;
  const periodLabel = getPeriodLabel(programData?.periodType);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState("");
  const [error, setError] = useState(null);

  const totalCredits = semesters.reduce(
    (sum, sem) => sum + (Number(sem.totalCredits) || 0),
    0
  );

  const totalCourses = Object.values(coursesBySemester || {}).reduce(
    (sum, data) => sum + countCoursesInData(data),
    0
  );

  const configuredSemesters = Object.entries(coursesBySemester || {}).filter(
    ([, data]) => countCoursesInData(data) > 0
  ).length;

  const jumpToEditStep = () => {
    dispatch({ type: "SET_RETURN_TO_REVIEW", value: true });
    dispatch({ type: "SET_FINAL_SUBMITTED", value: false });
    dispatch({ type: "SET_STEP", step: 1 });
  };

  const jumpToCourseStep = () => {
    dispatch({ type: "SET_RETURN_TO_REVIEW", value: true });
    dispatch({ type: "SET_FINAL_SUBMITTED", value: false });
    dispatch({ type: "SET_STEP", step: 2 });
  };

  /* ── Bulk create/update everything on Complete Setup ── */
  const handleComplete = async () => {
    const isExisting = state.programMode === "existing" || isEditMode;
    setSubmitting(true);
    setError(null);
    console.log("[wizard][handleComplete] START", {
      isExisting,
      programId,
      semesterCount: semesters.length,
      coursesBySemesterKeys: Object.keys(coursesBySemester || {}),
      coursesBySemester,
    });
    setSubmitProgress(isExisting ? "Updating program..." : "Creating program...");
    try {
      // 1. Create or update program
      const programPayload = {
        name: programData.name,
        code: programData.code,
        school: programData.school || undefined,
        stream: programData.stream || undefined,
        modeOfDelivery: programData.modeOfDelivery || "REGULAR",
        description: programData.description || undefined,
        periodType: programData.periodType || "semester",
        totalSemesters: Number(programData.totalSemesters) || semesters.length,
        totalCredits: Number(programData.totalCredits) || 0,
        isActive: true,
      };
      if (programData.programCoordinator) {
        programPayload.programCoordinator = programData.programCoordinator;
      }
      Object.keys(programPayload).forEach((key) => {
        if (programPayload[key] === undefined) delete programPayload[key];
      });

      let createdProgram;
      let realProgramId;
      let createdSemesters;

      const isTempId = (id) => !id || String(id).startsWith("draft_") || String(id).startsWith("temp_");
      const hasRealProgramId = programId && !isTempId(programId);

      if (hasRealProgramId) {
        // Program already exists (edit mode OR draft-saved in create mode) — update it
        const res = await updateProgram(programId, programPayload);
        createdProgram = res.program || res;
        realProgramId = createdProgram._id || programId;

        // Check semesters: reuse existing, create only temp ones
        createdSemesters = [];
        for (let i = 0; i < semesters.length; i++) {
          const slot = semesters[i];
          const slotId = slot._id || slot.tempId || slot.id;
          if (isTempId(slotId)) {
            // Create new semester
            setSubmitProgress(`Creating ${periodLabel.toLowerCase()} ${i + 1}...`);
            const semPayload = {
              name: slot.name || `${periodLabel} ${i + 1}`,
              semNumber: slot.semNumber || i + 1,
              program: realProgramId,
            };
            if (slot.totalCredits) {
              semPayload.totalCredits = Number(slot.totalCredits);
            }
            const semRes = await createSemester(semPayload);
            createdSemesters.push(semRes?.semester || semRes);
          } else {
            // Semester already exists — keep it
            createdSemesters.push(slot);
          }
        }
      } else {
        // Create mode: create new program and semesters
        const res = await createProgram(programPayload);
        createdProgram = res.program || res;
        realProgramId = createdProgram._id;

        // 2. Create semesters
        setSubmitProgress(`Creating ${periodLabel.toLowerCase()}s...`);
        createdSemesters = [];
        for (let i = 0; i < semesters.length; i++) {
          const slot = semesters[i];
          const semPayload = {
            name: slot.name || `${periodLabel} ${i + 1}`,
            semNumber: slot.semNumber || i + 1,
            program: realProgramId,
          };
          if (slot.totalCredits) {
            semPayload.totalCredits = Number(slot.totalCredits);
          }
          const semRes = await createSemester(semPayload);
          createdSemesters.push(semRes?.semester || semRes);
        }
      }

      // 3. Build semester ID map (temp → real)
      const semIdMap = {};
      semesters.forEach((oldSem, i) => {
        const oldId = oldSem._id || oldSem.tempId || oldSem.id;
        const newId = createdSemesters[i]?._id;
        if (oldId && newId) semIdMap[String(oldId)] = newId;
      });

      // 4. Assign courses to semesters
      const courseEntries = Object.entries(coursesBySemester || {}).filter(
        ([, data]) => countCoursesInData(data) > 0
      );

      const courseAssignmentErrors = [];
      console.log("[wizard][handleComplete] courseEntries count:", courseEntries.length, courseEntries.map(([id]) => id));

      if (courseEntries.length > 0) {
        setSubmitProgress("Assigning courses...");

        for (const [oldSemId, data] of courseEntries) {
          const realSemId = semIdMap[oldSemId] || oldSemId;
          const sem = semesters.find(
            (ss) => String(ss._id || ss.tempId || ss.id) === oldSemId
          );

          try {
            if (isStructureFormat(data)) {
              // ── New structure format ──
              const s = data.structure;

              // Create any draft courses first
              const draftIdMap = {};
              const allCoursesUsed = [
                ...(data.compulsorySlots || []).filter((sl) => sl.course?.isDraft).map((sl) => sl.course),
                ...(data.electiveBlocks || []).flatMap((b) =>
                  (b.options || []).filter((c) => c.isDraft)
                ),
              ];
              // Deduplicate by draft ID
              const uniqueDrafts = [];
              const seenDraftIds = new Set();
              for (const dc of allCoursesUsed) {
                if (!seenDraftIds.has(dc._id)) {
                  seenDraftIds.add(dc._id);
                  uniqueDrafts.push(dc);
                }
              }

              for (const dc of uniqueDrafts) {
                try {
                  setSubmitProgress(`Creating course ${dc.courseCode}...`);
                  const courseRes = await createCourse({
                    courseCode: dc.courseCode,
                    title: dc.title,
                    creditPoints: {
                      lecture: dc.lecture || 0,
                      tutorial: dc.tutorial || 0,
                      practical: dc.practical || 0,
                    },
                  });
                  const created = courseRes.course || courseRes;
                  if (created?._id) draftIdMap[dc._id] = created._id;
                } catch (err) {
                  const msg = err?.response?.data?.error || err?.message || "Unknown error";
                  // If course already exists, look it up by code and use existing ID
                  if (msg.toLowerCase().includes("already exists")) {
                    try {
                      const existing = await lookupCourseByCode(dc.courseCode);
                      const existingCourse = existing?.course || existing;
                      if (existingCourse?._id) {
                        draftIdMap[dc._id] = existingCourse._id;
                        console.log(`[wizard][handleComplete] draft course ${dc.courseCode} already exists, using ID: ${existingCourse._id}`);
                        continue;
                      }
                    } catch (lookupErr) {
                      // Lookup failed — fall through to error
                    }
                  }
                  courseAssignmentErrors.push(`Failed to create draft course ${dc.courseCode}: ${msg}`);
                }
              }

              // Update credit values for existing (non-draft) courses that may have been edited
              const allEditedCourses = [
                ...(data.compulsorySlots || [])
                  .filter((sl) => sl.course && !sl.course.isDraft)
                  .map((sl) => sl.course),
                ...(data.electiveBlocks || [])
                  .flatMap((b) => (b.options || []).filter((c) => !c.isDraft)),
              ];
              for (const course of allEditedCourses) {
                const courseCode = course.courseCode || course.code;
                if (!courseCode) continue;
                const lecture = Number(course.lecture ?? course.creditPoints?.lecture ?? 0);
                const tutorial = Number(course.tutorial ?? course.creditPoints?.tutorial ?? 0);
                const practical = Number(course.practical ?? course.creditPoints?.practical ?? 0);
                try {
                  await updateCourse(courseCode, {
                    courseCode,
                    title: course.title || course.name,
                    creditPoints: { lecture, tutorial, practical },
                  });
                } catch (err) {
                  console.log(`[wizard][handleComplete] failed to update course ${courseCode} credits:`, err?.message);
                }
              }

              const resolveId = (id) => draftIdMap[id] || id;

              // Build compulsory course IDs
              const compulsoryCourseIds = (data.compulsorySlots || [])
                .filter((sl) => sl.course)
                .map((sl) => resolveId(sl.course._id || sl.course.id))
                .filter(Boolean);

              // Build elective baskets
              const baskets = (data.electiveBlocks || []).map((block, idx) => ({
                basketId: `basket_${idx}`,
                rule: block.rule || "ANY_ONE",
                pickN: block.pickN || 1,
                options: (block.options || [])
                  .map((c) => resolveId(c._id || c.id))
                  .filter(Boolean),
              }));

              const caPayload = {
                compulsory_count: toNum(s.compulsory_count),
                elective_slot_count: toNum(s.elective_slot_count),
                compulsory_credit_target: toNum(s.compulsory_credit_target),
                elective_credit_target: toNum(s.elective_credit_target),
                credit_target_total: toNum(sem?.totalCredits),
                enforce_credit_target: false, // never block save on credit mismatch
                finalizeStructure: true,
                compulsoryCourseIds,
                electiveConfig: { mode: "BASKET", baskets, tracks: [] },
              };
              console.log("[wizard][handleComplete] saving course assignment", {
                semName: sem?.name,
                realProgramId,
                realSemId,
                payload: caPayload,
                compulsoryCourseIds,
                slotData: data.compulsorySlots,
              });
              setSubmitProgress(`Assigning courses to ${sem?.name || oldSemId}...`);
              const caRes = await updateSemesterCourseAssignment(realProgramId, realSemId, caPayload);
              console.log("[wizard][handleComplete] save response", { semName: sem?.name, caRes });
            } else if (Array.isArray(data) && data.length > 0) {
              // ── Legacy array format ──
              const courseIds = data.map((c) => c._id || c.id).filter(Boolean);
              if (courseIds.length > 0) {
                await updateSemesterCourseAssignment(realProgramId, realSemId, {
                  compulsory_count: courseIds.length,
                  elective_slot_count: 0,
                  compulsory_credit_target: 0,
                  elective_credit_target: 0,
                  credit_target_total: 0,
                  enforce_credit_target: false,
                  finalizeStructure: false,
                  compulsoryCourseIds: courseIds,
                  electiveConfig: { mode: "BASKET", baskets: [], tracks: [] },
                });
              }
            }
          } catch (err) {
            const semName = sem?.name || `Semester (${realSemId})`;
            const details = err?.response?.data?.details;
            const detailMsg = Array.isArray(details) ? details.map((d) => d.message).join("; ") : "";
            const msg = detailMsg || err?.response?.data?.error || err?.message || "Unknown error";
            console.error("[wizard][handleComplete] course assignment FAILED", {
              semName,
              realSemId,
              status: err?.response?.status,
              responseData: err?.response?.data,
              msg,
            });
            courseAssignmentErrors.push(`${semName}: ${msg}`);
          }
        }
      }

      // If there were course assignment errors, show them and DON'T mark as complete
      if (courseAssignmentErrors.length > 0) {
        console.error("[wizard][handleComplete] course assignment errors:", courseAssignmentErrors);
        setError(
          `${isExisting ? "Program metadata updated" : "Program created"}, but course assignment save failed:\n${courseAssignmentErrors.join("\n")}\n\nPlease go back to Step 2, click "Save Draft" to save courses first, then try again.`
        );
        // Update program/semester state but do NOT mark as final submitted
        dispatch({
          type: "SET_PROGRAM",
          programId: realProgramId,
          programData: createdProgram,
          programMode: isExisting ? "existing" : "create",
        });
        dispatch({ type: "SET_SEMESTERS", semesters: createdSemesters });
        return; // Don't show success screen
      }

      // 5. Update wizard state with real IDs
      dispatch({
        type: "SET_PROGRAM",
        programId: realProgramId,
        programData: createdProgram,
        programMode: isExisting ? "existing" : "create",
      });
      dispatch({ type: "SET_SEMESTERS", semesters: createdSemesters });
      dispatch({ type: "MARK_COMPLETE", step: 3 });
      dispatch({ type: "SET_FINAL_SUBMITTED", value: true });
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (isExisting ? "Failed to update program. Please retry." : "Failed to create program. Please retry.")
      );
    } finally {
      setSubmitting(false);
      setSubmitProgress("");
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
          {isEditMode
            ? "Program Updated Successfully"
            : "Program Setup Complete"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {isEditMode
            ? "Your program changes have been saved."
            : `Your program, ${periodLabel.toLowerCase()} structure, and courses have been configured.`}
        </p>

        {error && (
          <div className="mt-4 mx-auto max-w-lg bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 text-left whitespace-pre-line">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/programs"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Go to Program Management
          </Link>
          {!isEditMode && (
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="inline-flex items-center px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Create Another
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
        Review & Complete
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Review your program setup before creating.
      </p>

      <hr className="my-6 border-gray-200" />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Program Details */}
        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Program Details
            </h2>
            <button
              onClick={jumpToEditStep}
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
            >
              <PencilLine className="w-3.5 h-3.5 mr-1" />
              Edit
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>{" "}
              {programData?.name || "-"}
            </div>
            <div>
              <span className="text-gray-500">Code:</span>{" "}
              {programData?.code || "-"}
            </div>
            <div>
              <span className="text-gray-500">School:</span>{" "}
              {programData?.school || "-"}
            </div>
            <div>
              <span className="text-gray-500">Stream:</span>{" "}
              {programData?.stream || "-"}
            </div>
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

        {/* Period Structure */}
        {semesters.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {periodLabel} Structure ({semesters.length})
              </h2>
              <button
                onClick={jumpToEditStep}
                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
              >
                <PencilLine className="w-3.5 h-3.5 mr-1" />
                Edit
              </button>
            </div>
            <div className="space-y-2">
              {semesters.map((semester, index) => (
                <div
                  key={semester._id || semester.tempId || index}
                  className="border border-gray-100 rounded-lg px-4 py-3 text-sm flex items-center justify-between"
                >
                  <div className="font-medium text-gray-900">
                    {semester.name}
                  </div>
                  <div className="text-gray-500">
                    {semester.totalCredits
                      ? `${semester.totalCredits} credits`
                      : "No credits set"}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-3 pt-3 text-sm text-gray-500 flex justify-between">
              <span>Total assigned credits</span>
              <span className="font-medium text-gray-700">
                {totalCredits} / {programData?.totalCredits ?? "-"}
              </span>
            </div>
          </section>
        )}

        {/* Course Assignment Summary */}
        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Course Assignment
            </h2>
            <button
              onClick={jumpToCourseStep}
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
            >
              <PencilLine className="w-3.5 h-3.5 mr-1" />
              Edit
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {totalCourses > 0 ? (
              <div>
                <span>
                  <span className="font-medium text-gray-900">{totalCourses}</span>{" "}
                  course{totalCourses !== 1 ? "s" : ""} assigned across{" "}
                  {configuredSemesters} {periodLabel.toLowerCase()}
                  {configuredSemesters !== 1 ? "s" : ""}.
                </span>
                {/* Per-semester breakdown */}
                <div className="mt-3 space-y-4">
                  {semesters.map((sem) => {
                    const semId = sem._id || sem.tempId || sem.id;
                    const data = coursesBySemester[semId];
                    if (!data || countCoursesInData(data) === 0) return null;

                    const compCourses = getCompulsoryCourses(data);
                    const elecBlocks = getElectiveBlockSummary(data);
                    const structData = isStructureFormat(data) ? data.structure : null;
                    const allCourses = [
                      ...compCourses,
                      ...elecBlocks.flatMap((eb) => eb.courses),
                    ];
                    const assignedCredits = allCourses.reduce((s, c) => s + c.credits, 0);
                    const targetCredits = toNum(sem.totalCredits);

                    return (
                      <div key={semId} className="border border-gray-100 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                          <div className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                            {sem.name}
                            <span className={`text-[11px] font-medium ${assignedCredits >= targetCredits && targetCredits > 0 ? "text-green-600" : "text-amber-600"}`}>
                              ({assignedCredits}/{targetCredits} credits)
                            </span>
                          </div>
                          {structData && (
                            <div className="text-[11px] text-gray-400">
                              Compulsory: {toNum(structData.compulsory_count)} slots, {toNum(structData.compulsory_credit_target)} cr
                              {toNum(structData.elective_slot_count) > 0 && (
                                <span> | Elective: {toNum(structData.elective_slot_count)} blocks, {toNum(structData.elective_credit_target)} cr</span>
                              )}
                            </div>
                          )}
                        </div>
                        {allCourses.length > 0 && (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-100 text-gray-500">
                                <th className="text-left px-3 py-1.5 font-medium">#</th>
                                <th className="text-left px-3 py-1.5 font-medium">Code</th>
                                <th className="text-left px-3 py-1.5 font-medium">Course Title</th>
                                <th className="text-center px-2 py-1.5 font-medium">L</th>
                                <th className="text-center px-2 py-1.5 font-medium">T</th>
                                <th className="text-center px-2 py-1.5 font-medium">P</th>
                                <th className="text-center px-2 py-1.5 font-medium">Cr</th>
                                <th className="text-left px-3 py-1.5 font-medium">Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allCourses.map((course, ci) => (
                                <tr key={ci} className="border-b border-gray-50 hover:bg-gray-50/50">
                                  <td className="px-3 py-1.5 text-gray-400">{ci + 1}</td>
                                  <td className="px-3 py-1.5 font-medium text-gray-700">{course.code}</td>
                                  <td className="px-3 py-1.5 text-gray-600">{course.title}</td>
                                  <td className="text-center px-2 py-1.5 text-gray-500">{course.lecture}</td>
                                  <td className="text-center px-2 py-1.5 text-gray-500">{course.tutorial}</td>
                                  <td className="text-center px-2 py-1.5 text-gray-500">{course.practical}</td>
                                  <td className="text-center px-2 py-1.5 font-medium text-gray-700">{course.credits}</td>
                                  <td className="px-3 py-1.5">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      course.type === "Compulsory"
                                        ? "bg-blue-50 text-blue-600"
                                        : "bg-purple-50 text-purple-600"
                                    }`}>
                                      {course.type}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {elecBlocks.length > 0 && (
                          <div className="px-3 py-1.5 bg-gray-50/50 border-t border-gray-100">
                            {elecBlocks.map((eb) => (
                              <div key={eb.index} className="text-[11px] text-gray-400">
                                Elective {eb.index}: {eb.count} option{eb.count !== 1 ? "s" : ""} ({eb.rule}{eb.rule === "ANY_N" ? `, pick ${eb.pickN}` : ""})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <span className="text-gray-400">
                No courses assigned yet. You can add them later from the program detail page.
              </span>
            )}
          </div>
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
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleComplete}
            disabled={submitting}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            {submitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Program" : "Complete Setup")}
          </button>
          {submitting && submitProgress && (
            <div className="text-[11px] text-gray-400">{submitProgress}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepReviewComplete;
