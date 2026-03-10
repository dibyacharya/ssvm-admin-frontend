import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  GraduationCap,
  Loader2,
  Check,
  CheckCircle,
  Calendar,
  RotateCcw,
  PencilLine,
} from "lucide-react";
import { getProgramsDropdown, getProgramById } from "../services/program.service";
import { getSemesters, updateSemester } from "../services/semester.services";
import { createBatch, getBatchById, updateBatch } from "../services/batch.service";
import {
  calculateEndDate,
  calculateBatchEndDate,
  formatMonthYear,
} from "../utils/dateCalculator";
import { getPeriodLabel } from "../utils/periodLabel";

const MAX_STEP = 3;

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

const BatchOnboarding = () => {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const isEditMode = Boolean(batchId);

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Program state
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [programSemesters, setProgramSemesters] = useState([]);

  // Batch form (Step 1)
  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    name: "",
    startDate: "",
    expectedEndDate: "",
    maxStrength: "",
  });

  // Semester date slots (Step 2)
  const [semesterDates, setSemesterDates] = useState([]);
  const [activeSemIndex, setActiveSemIndex] = useState(null);

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState("");
  const [completed, setCompleted] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);

  const periodLabel = selectedProgram
    ? getPeriodLabel(selectedProgram.periodType)
    : "Semester";

  // ── Load programs dropdown ──
  useEffect(() => {
    const load = async () => {
      setLoadingPrograms(true);
      try {
        const data = await getProgramsDropdown();
        setPrograms(data || []);
      } catch (err) {
        console.error("Error loading programs:", err);
      } finally {
        setLoadingPrograms(false);
      }
    };
    load();
  }, []);

  // ── Load existing batch data for edit mode ──
  useEffect(() => {
    if (!isEditMode || !batchId) return;
    const loadBatchData = async () => {
      setLoadingBatch(true);
      setError(null);
      try {
        const data = await getBatchById(batchId);
        const batch = data?.batch || data;

        // Load program first
        const progId = batch?.program?._id || batch?.program;
        if (progId) {
          await handleProgramSelect(progId);
        }

        // Set form data from existing batch
        setFormData({
          year: batch?.year?.toString() || new Date().getFullYear().toString(),
          name: batch?.name || "",
          startDate: batch?.startDate ? batch.startDate.split("T")[0] : "",
          expectedEndDate: batch?.expectedEndDate
            ? batch.expectedEndDate.split("T")[0]
            : "",
          maxStrength: batch?.maxStrength?.toString() || "",
        });
      } catch (err) {
        setError("Failed to load batch details for editing.");
        console.error("Error loading batch:", err);
      } finally {
        setLoadingBatch(false);
      }
    };
    loadBatchData();
  }, [batchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── When program is selected, load its details and semesters ──
  const handleProgramSelect = async (programId) => {
    setSelectedProgramId(programId);
    setError(null);
    setSemesterDates([]);

    if (!programId) {
      setSelectedProgram(null);
      setProgramSemesters([]);
      return;
    }

    try {
      const data = await getProgramById(programId);
      const program = data?.program || data;
      setSelectedProgram(program);

      try {
        const semData = await getSemesters({ program: programId });
        const sems = semData?.semesters || semData || [];
        setProgramSemesters(Array.isArray(sems) ? sems : []);
      } catch {
        setProgramSemesters([]);
      }
    } catch {
      setError("Failed to load program details.");
      setSelectedProgram(null);
      setProgramSemesters([]);
    }
  };

  // ── Auto-compute batch name + end date when start date changes (create mode only) ──
  useEffect(() => {
    if (isEditMode) return;
    if (!formData.startDate || !selectedProgram) return;
    const updates = {};

    const autoName = formatMonthYear(formData.startDate);
    if (autoName) updates.name = autoName;

    if (selectedProgram.periodType && selectedProgram.totalSemesters) {
      const endDate = calculateBatchEndDate(
        formData.startDate,
        selectedProgram.periodType,
        selectedProgram.totalSemesters
      );
      if (endDate) updates.expectedEndDate = endDate;
    }

    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }));
    }
  }, [formData.startDate, selectedProgram, isEditMode]);

  // ── Auto-generate semester date slots ──
  useEffect(() => {
    if (!formData.startDate || !selectedProgram) {
      if (!isEditMode) setSemesterDates([]);
      return;
    }

    const totalPeriods =
      selectedProgram.totalSemesters || programSemesters.length || 0;
    if (totalPeriods <= 0) return;

    const label = getPeriodLabel(selectedProgram.periodType);
    const slots = [];
    let currentStart = formData.startDate;

    for (let i = 0; i < totalPeriods; i++) {
      const existingSem = programSemesters[i];

      // In edit mode, prefer actual semester dates from API
      const semStart =
        isEditMode && existingSem?.startDate
          ? existingSem.startDate.split("T")[0]
          : currentStart;
      const semEnd =
        isEditMode && existingSem?.endDate
          ? existingSem.endDate.split("T")[0]
          : calculateEndDate(currentStart, selectedProgram.periodType) || "";

      slots.push({
        _id: existingSem?._id || null,
        name: existingSem?.name || `${label} ${i + 1}`,
        semNumber: existingSem?.semNumber || i + 1,
        startDate: semStart,
        endDate: semEnd,
        midExamStartDate:
          isEditMode && existingSem?.midExamStartDate
            ? existingSem.midExamStartDate.split("T")[0]
            : "",
        midExamEndDate:
          isEditMode && existingSem?.midExamEndDate
            ? existingSem.midExamEndDate.split("T")[0]
            : "",
        endExamStartDate:
          isEditMode && existingSem?.endExamStartDate
            ? existingSem.endExamStartDate.split("T")[0]
            : "",
        endExamEndDate:
          isEditMode && existingSem?.endExamEndDate
            ? existingSem.endExamEndDate.split("T")[0]
            : "",
      });

      currentStart =
        isEditMode && existingSem?.endDate
          ? existingSem.endDate.split("T")[0]
          : semEnd || currentStart;
    }

    setSemesterDates(slots);
  }, [formData.startDate, selectedProgram, programSemesters, isEditMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSemesterDateChange = (index, field, value) => {
    setSemesterDates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const goNext = () => {
    if (currentStep < MAX_STEP) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const canContinueStep1 = Boolean(
    selectedProgramId && formData.startDate && formData.year
  );

  // ── Submit: create or update ──
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSubmitProgress(isEditMode ? "Updating batch..." : "Creating batch...");

    try {
      if (isEditMode) {
        const updatePayload = {
          name:
            formData.name || formatMonthYear(formData.startDate) || "Batch",
          startDate: formData.startDate,
          maxStrength: formData.maxStrength ? Number(formData.maxStrength) : 0,
        };
        if (formData.expectedEndDate)
          updatePayload.expectedEndDate = formData.expectedEndDate;
        await updateBatch(batchId, updatePayload);
      } else {
        const batchPayload = {
          program: selectedProgramId,
          year: Number(formData.year) || new Date().getFullYear(),
          name:
            formData.name ||
            formatMonthYear(formData.startDate) ||
            "New Batch",
          startDate: formData.startDate,
        };
        if (formData.expectedEndDate)
          batchPayload.expectedEndDate = formData.expectedEndDate;
        if (formData.maxStrength)
          batchPayload.maxStrength = Number(formData.maxStrength);

        await createBatch(batchPayload);
      }

      // Update semester dates
      setSubmitProgress(`Updating ${periodLabel.toLowerCase()} schedule...`);
      for (const slot of semesterDates) {
        if (slot._id && slot.startDate) {
          try {
            const payload = { startDate: slot.startDate };
            if (slot.endDate) payload.endDate = slot.endDate;
            if (slot.midExamStartDate) payload.midExamStartDate = slot.midExamStartDate;
            if (slot.midExamEndDate) payload.midExamEndDate = slot.midExamEndDate;
            if (slot.endExamStartDate) payload.endExamStartDate = slot.endExamStartDate;
            if (slot.endExamEndDate) payload.endExamEndDate = slot.endExamEndDate;
            await updateSemester(slot._id, payload);
          } catch {
            // Non-critical — batch is still saved
          }
        }
      }

      setCompleted(true);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          (isEditMode
            ? "Failed to update batch. Please retry."
            : "Failed to create batch. Please retry.")
      );
    } finally {
      setSubmitting(false);
      setSubmitProgress("");
    }
  };

  const resetWizard = () => {
    if (isEditMode) {
      navigate("/batches");
      return;
    }
    setCompleted(false);
    setCurrentStep(1);
    setDirection(-1);
    setSelectedProgramId("");
    setSelectedProgram(null);
    setProgramSemesters([]);
    setSemesterDates([]);
    setActiveSemIndex(null);
    setFormData({
      year: new Date().getFullYear().toString(),
      name: "",
      startDate: "",
      expectedEndDate: "",
      maxStrength: "",
    });
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition";
  const labelClass =
    "block text-xs uppercase tracking-widest text-gray-500 font-medium mb-1.5";

  // ══════════ STEPPER ══════════
  const renderStepper = () => {
    const steps = [
      { number: 1, label: "BATCH" },
      { number: 2, label: "SCHEDULE" },
      { number: 3, label: "REVIEW" },
    ];

    return (
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 py-6">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCurrent = currentStep === step.number;
              const isPast = step.number < currentStep;
              const isCompleted = isPast || completed;

              return (
                <React.Fragment key={step.number}>
                  <button
                    type="button"
                    onClick={() => {
                      if (step.number < currentStep) {
                        setDirection(-1);
                        setCurrentStep(step.number);
                      }
                    }}
                    className="flex flex-col items-center cursor-pointer focus:outline-none"
                  >
                    <motion.div
                      className={`
                        w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold
                        transition-colors duration-300
                        ${
                          isCompleted || isPast
                            ? "bg-blue-600 text-white"
                            : isCurrent
                              ? "bg-blue-600 text-white ring-4 ring-blue-100"
                              : "bg-gray-200 text-gray-500"
                        }
                      `}
                      animate={{ scale: isCurrent ? 1.15 : 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      {isCompleted || isPast ? (
                        <Check className="w-4 h-4" strokeWidth={3} />
                      ) : (
                        step.number
                      )}
                    </motion.div>
                    <span
                      className={`
                        mt-2 text-[10px] uppercase tracking-widest font-medium
                        ${isCurrent ? "text-blue-600" : isPast || isCompleted ? "text-gray-500" : "text-gray-400"}
                      `}
                    >
                      {step.label}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-3 h-0.5 bg-gray-200 rounded-full relative -mt-5">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-blue-600 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{
                          width: step.number < currentStep ? "100%" : "0%",
                        }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ══════════ STEP 1: BATCH SETUP ══════════
  const renderStep1 = () => {
    if (loadingBatch) {
      return (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading batch details...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {isEditMode ? "Edit Batch" : "Batch Setup"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEditMode
              ? "Modify the batch details below."
              : "Select a program and configure the batch details."}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Program Selection */}
          <div>
            <label className={labelClass}>Program *</label>
            {loadingPrograms ? (
              <div className="flex items-center text-sm text-gray-500 py-3">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading
                programs...
              </div>
            ) : isEditMode ? (
              <input
                type="text"
                value={
                  selectedProgram
                    ? `${selectedProgram.name} (${selectedProgram.code})`
                    : "Loading..."
                }
                disabled
                className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
              />
            ) : (
              <select
                value={selectedProgramId}
                onChange={(e) => handleProgramSelect(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a program...</option>
                {programs.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Program Info Banner */}
          {selectedProgram && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  {selectedProgram.name}
                </span>
                {selectedProgram.code && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {selectedProgram.code}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-blue-800">
                <div>
                  Period Type:{" "}
                  <span className="font-medium">{periodLabel}</span>
                </div>
                <div>
                  Total {periodLabel}s:{" "}
                  <span className="font-medium">
                    {selectedProgram.totalSemesters ?? "-"}
                  </span>
                </div>
                <div>
                  Total Credits:{" "}
                  <span className="font-medium">
                    {selectedProgram.totalCredits ?? "-"}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Batch Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Year *</label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                disabled={isEditMode}
                min="2000"
                max="2100"
                className={`${inputClass} ${isEditMode ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className={labelClass}>Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Batch Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={isEditMode ? "" : "Auto-filled from start date"}
                className={inputClass}
              />
              {!isEditMode && (
                <span className="text-xs text-gray-400 mt-1 block">
                  Auto-computed from start date
                </span>
              )}
            </div>
            <div>
              <label className={labelClass}>Expected End Date</label>
              <input
                type="date"
                name="expectedEndDate"
                value={formData.expectedEndDate}
                onChange={handleInputChange}
                className={inputClass}
              />
              {!isEditMode && (
                <span className="text-xs text-gray-400 mt-1 block">
                  Auto-computed from program duration
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Max Strength</label>
              <input
                type="number"
                name="maxStrength"
                value={formData.maxStrength}
                onChange={handleInputChange}
                min="0"
                placeholder="0 = unlimited"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-end pt-8">
          <button
            onClick={goNext}
            disabled={!canContinueStep1}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    );
  };

  // ══════════ STEP 2: SEMESTER / TERM SCHEDULE ══════════
  const renderStep2 = () => (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {periodLabel} Schedule
        </h1>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Click each {periodLabel.toLowerCase()} to set its start and end dates.
        Dates are auto-generated and editable.
      </p>

      <hr className="my-6 border-gray-200" />

      {semesterDates.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            No {periodLabel.toLowerCase()}s found. Go back and select a program
            with a start date.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {semesterDates.map((slot, index) => {
            const isActive = activeSemIndex === index;
            return (
              <motion.div
                key={slot._id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`
                  border rounded-lg transition-all cursor-pointer
                  ${
                    isActive
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }
                `}
              >
                {/* Clickable header row */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveSemIndex(isActive ? null : index)
                  }
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-mono w-6 text-right">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {slot.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {slot.startDate
                      ? new Date(slot.startDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "No start"}{" "}
                    →{" "}
                    {slot.endDate
                      ? new Date(slot.endDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "No end"}
                  </div>
                </button>

                {/* Expanded date editors */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-blue-100">
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-1 block">
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={slot.startDate || ""}
                              onChange={(e) =>
                                handleSemesterDateChange(
                                  index,
                                  "startDate",
                                  e.target.value
                                )
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-1 block">
                              End Date
                            </label>
                            <input
                              type="date"
                              value={slot.endDate || ""}
                              onChange={(e) =>
                                handleSemesterDateChange(
                                  index,
                                  "endDate",
                                  e.target.value
                                )
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                          </div>
                        </div>
                        {/* Mid Exam Dates */}
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-1 block">
                              Mid Exam Start
                            </label>
                            <input
                              type="date"
                              value={slot.midExamStartDate || ""}
                              onChange={(e) =>
                                handleSemesterDateChange(
                                  index,
                                  "midExamStartDate",
                                  e.target.value
                                )
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-1 block">
                              Mid Exam End
                            </label>
                            <input
                              type="date"
                              value={slot.midExamEndDate || ""}
                              onChange={(e) =>
                                handleSemesterDateChange(
                                  index,
                                  "midExamEndDate",
                                  e.target.value
                                )
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                          </div>
                        </div>
                        {/* End Exam Dates */}
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-1 block">
                              End Exam Start
                            </label>
                            <input
                              type="date"
                              value={slot.endExamStartDate || ""}
                              onChange={(e) =>
                                handleSemesterDateChange(
                                  index,
                                  "endExamStartDate",
                                  e.target.value
                                )
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-1 block">
                              End Exam End
                            </label>
                            <input
                              type="date"
                              value={slot.endExamEndDate || ""}
                              onChange={(e) =>
                                handleSemesterDateChange(
                                  index,
                                  "endExamEndDate",
                                  e.target.value
                                )
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-8">
        <button
          onClick={goBack}
          className="inline-flex items-center px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <button
          onClick={goNext}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );

  // ══════════ STEP 3: REVIEW & CREATE / UPDATE ══════════
  const renderStep3 = () => {
    if (completed) {
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
              ? "Batch Updated Successfully"
              : "Batch Created Successfully"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isEditMode
              ? `Your batch has been updated with the configured ${periodLabel.toLowerCase()} schedule.`
              : `Your batch has been created with the configured ${periodLabel.toLowerCase()} schedule.`}
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/batches")}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Go to Batch Management
            </button>
            {!isEditMode && (
              <button
                onClick={resetWizard}
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
          {isEditMode ? "Review & Update" : "Review & Create"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode
            ? "Review all details before updating the batch."
            : "Review all details before creating the batch."}
        </p>

        <hr className="my-6 border-gray-200" />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Program Info */}
          <section className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Program</h2>
              {!isEditMode && (
                <button
                  onClick={() => {
                    setDirection(-1);
                    setCurrentStep(1);
                  }}
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
                >
                  <PencilLine className="w-3.5 h-3.5 mr-1" />
                  Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>{" "}
                {selectedProgram?.name || "-"}
              </div>
              <div>
                <span className="text-gray-500">Code:</span>{" "}
                {selectedProgram?.code || "-"}
              </div>
              <div>
                <span className="text-gray-500">Period Type:</span>{" "}
                {periodLabel}
              </div>
              <div>
                <span className="text-gray-500">Total {periodLabel}s:</span>{" "}
                {selectedProgram?.totalSemesters ?? "-"}
              </div>
            </div>
          </section>

          {/* Batch Details */}
          <section className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Batch Details
              </h2>
              <button
                onClick={() => {
                  setDirection(-1);
                  setCurrentStep(1);
                }}
                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
              >
                <PencilLine className="w-3.5 h-3.5 mr-1" />
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Batch Name:</span>{" "}
                {formData.name || "-"}
              </div>
              <div>
                <span className="text-gray-500">Year:</span>{" "}
                {formData.year || "-"}
              </div>
              <div>
                <span className="text-gray-500">Start Date:</span>{" "}
                {formData.startDate
                  ? new Date(formData.startDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "-"}
              </div>
              <div>
                <span className="text-gray-500">End Date:</span>{" "}
                {formData.expectedEndDate
                  ? new Date(formData.expectedEndDate).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )
                  : "-"}
              </div>
              {formData.maxStrength && (
                <div>
                  <span className="text-gray-500">Max Strength:</span>{" "}
                  {formData.maxStrength}
                </div>
              )}
            </div>
          </section>

          {/* Semester Schedule */}
          {semesterDates.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  {periodLabel} Schedule ({semesterDates.length})
                </h2>
                <button
                  onClick={() => {
                    setDirection(-1);
                    setCurrentStep(2);
                  }}
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
                >
                  <PencilLine className="w-3.5 h-3.5 mr-1" />
                  Edit
                </button>
              </div>
              <div className="space-y-2">
                {semesterDates.map((slot, index) => {
                  const fmtDate = (d) =>
                    d
                      ? new Date(d).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : null;
                  const hasExamDates =
                    slot.midExamStartDate ||
                    slot.midExamEndDate ||
                    slot.endExamStartDate ||
                    slot.endExamEndDate;
                  return (
                    <div
                      key={slot._id || index}
                      className="border border-gray-100 rounded-lg px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900">{slot.name}</div>
                        <div className="text-gray-500 text-xs">
                          {fmtDate(slot.startDate) || "—"} →{" "}
                          {fmtDate(slot.endDate) || "—"}
                        </div>
                      </div>
                      {hasExamDates && (
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                          {(slot.midExamStartDate || slot.midExamEndDate) && (
                            <span>
                              Mid Exam: {fmtDate(slot.midExamStartDate) || "—"} → {fmtDate(slot.midExamEndDate) || "—"}
                            </span>
                          )}
                          {(slot.endExamStartDate || slot.endExamEndDate) && (
                            <span>
                              End Exam: {fmtDate(slot.endExamStartDate) || "—"} → {fmtDate(slot.endExamEndDate) || "—"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

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
              onClick={handleSubmit}
              disabled={submitting}
              className={`inline-flex items-center px-6 py-3 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 ${
                isEditMode
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Layers className="w-4 h-4 mr-2" />
              )}
              {submitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                  ? "Update Batch"
                  : "Create Batch"}
            </button>
            {submitting && submitProgress && (
              <div className="text-[11px] text-gray-400">{submitProgress}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full -m-6 bg-gray-50">
      <div className="px-6 pt-6">
        <Link to="/batches" className="flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Batches
        </Link>
      </div>

      {renderStepper()}

      <div className="max-w-3xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BatchOnboarding;
