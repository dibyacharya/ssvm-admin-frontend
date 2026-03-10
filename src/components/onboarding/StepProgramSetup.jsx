import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ChevronRight,
  Building2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
// Note: Loader2 still used in existing-program flow
import {
  getProgramsDropdown,
  getProgramById,
} from "../../services/program.service";
import {
  getSemesters,
} from "../../services/semester.services";
import { getTeachers } from "../../services/user.service";
import { getPeriodLabel } from "../../utils/periodLabel";
import {
  MODE_OF_DELIVERY,
  MODE_OF_DELIVERY_OPTIONS,
  normalizeModeOfDeliveryValue,
} from "../../constants/modeOfDelivery";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const emptyForm = {
  name: "",
  code: "",
  school: "",
  stream: "",
  modeOfDelivery: MODE_OF_DELIVERY.REGULAR,
  description: "",
  periodType: "semester",
  totalSemesters: "",
  totalCredits: "",
  programCoordinator: "",
};

const toProgramForm = (program) => {
  if (!program) return emptyForm;
  return {
    name: program.name || "",
    code: program.code || "",
    school: program.school || "",
    stream: program.stream || "",
    modeOfDelivery:
      normalizeModeOfDeliveryValue(program.modeOfDelivery) ||
      MODE_OF_DELIVERY.REGULAR,
    description: program.description || "",
    periodType: program.periodType || "semester",
    totalSemesters:
      program.totalSemesters !== undefined && program.totalSemesters !== null
        ? String(program.totalSemesters)
        : "",
    totalCredits:
      program.totalCredits !== undefined && program.totalCredits !== null
        ? String(program.totalCredits)
        : "",
    programCoordinator:
      program.programCoordinator?._id || program.programCoordinator || "",
  };
};

const isTempId = (id) => {
  if (!id) return true;
  const str = String(id);
  return str.startsWith("temp_") || str.startsWith("draft_");
};

/* ── Semester slot generator ── */
const buildSemesterSlots = (periodType, count, totalCredits, existing = []) => {
  if (count <= 0) return [];
  const label = getPeriodLabel(periodType);
  const total = Number(totalCredits) || 0;
  const base = total > 0 ? Math.floor(total / count) : 0;
  const remainder = total > 0 ? total - base * count : 0;

  const slots = [];
  for (let i = 0; i < count; i++) {
    const prev = existing[i];
    const autoCredits = base + (i < remainder ? 1 : 0);
    slots.push({
      tempId: prev?.tempId || prev?._id || `temp_${Date.now()}_${i}`,
      _id: prev?.tempId || prev?._id || `temp_${Date.now()}_${i}`,
      name: prev?.name || `${label} ${i + 1}`,
      semNumber: i + 1,
      totalCredits: autoCredits,
    });
  }
  return slots;
};

const StepProgramSetup = ({ state, dispatch, goNext, isEditMode = false }) => {
  const [mode, setMode] = useState(isEditMode ? "create" : (state.programMode || "create"));
  const [formData, setFormData] = useState(() =>
    toProgramForm(state.programData)
  );
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState(
    state.programId || ""
  );
  const [teachers, setTeachers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  /* ── Semester slots (local draft) ── */
  const [semesterSlots, setSemesterSlots] = useState(() =>
    state.semesters.length > 0 ? [...state.semesters] : []
  );
  const prevCountRef = useRef(formData.totalSemesters);
  const prevCreditsRef = useRef(formData.totalCredits);
  const prevPeriodRef = useRef(formData.periodType);

  const periodLabel = getPeriodLabel(formData.periodType);
  const totalSemCount = Number(formData.totalSemesters) || 0;
  const totalCredits = Number(formData.totalCredits) || 0;
  const assignedCredits = semesterSlots.reduce(
    (sum, s) => sum + (Number(s.totalCredits) || 0),
    0
  );
  const creditOverflow = totalCredits > 0 && assignedCredits > totalCredits;

  /* ── Load dropdowns ── */
  useEffect(() => {
    const loadDropdowns = async () => {
      setLoadingPrograms(true);
      try {
        const [programData, teacherData] = await Promise.all([
          getProgramsDropdown(),
          getTeachers(),
        ]);
        setPrograms(programData || []);
        setTeachers(teacherData.users || teacherData.teachers || []);
      } catch (err) {
        console.error("Error loading dropdowns:", err);
      } finally {
        setLoadingPrograms(false);
      }
    };
    loadDropdowns();
  }, []);

  /* ── Sync form from wizard state when editing ── */
  useEffect(() => {
    if (state.programData && mode === "create") {
      setFormData(toProgramForm(state.programData));
    }
  }, [state.programData, mode]);

  useEffect(() => {
    if (state.programId) {
      setSelectedProgramId(state.programId);
    }
  }, [state.programId]);

  /* ── Sync semesters from wizard state after HYDRATE in edit mode ── */
  useEffect(() => {
    if (!isEditMode) return;
    if (state.semesters.length > 0) {
      setSemesterSlots([...state.semesters]);
      // Keep refs in sync so auto-redistribution effects don't fire
      prevCountRef.current = formData.totalSemesters;
      prevCreditsRef.current = formData.totalCredits;
      prevPeriodRef.current = formData.periodType;
    }
  }, [isEditMode, state.semesters]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Regenerate slots when totalSemesters changes ── */
  useEffect(() => {
    if (mode !== "create" || isEditMode) return;
    const count = Number(formData.totalSemesters) || 0;
    if (prevCountRef.current === formData.totalSemesters) return;
    prevCountRef.current = formData.totalSemesters;

    if (count <= 0) {
      setSemesterSlots([]);
      return;
    }

    const total = Number(formData.totalCredits) || 0;
    setSemesterSlots((prev) =>
      buildSemesterSlots(formData.periodType, count, total, prev)
    );
  }, [formData.totalSemesters, formData.periodType, formData.totalCredits, mode, isEditMode]);

  /* ── Redistribute credits when totalCredits changes ── */
  useEffect(() => {
    if (mode !== "create" || isEditMode) return;
    if (prevCreditsRef.current === formData.totalCredits) return;
    prevCreditsRef.current = formData.totalCredits;

    const count = semesterSlots.length;
    const total = Number(formData.totalCredits) || 0;
    if (count <= 0) return;

    const base = total > 0 ? Math.floor(total / count) : 0;
    const remainder = total > 0 ? total - base * count : 0;
    setSemesterSlots((prev) =>
      prev.map((slot, i) => ({
        ...slot,
        totalCredits: base + (i < remainder ? 1 : 0),
      }))
    );
  }, [formData.totalCredits, mode, semesterSlots.length, isEditMode]);

  /* ── Update slot names when periodType changes ── */
  useEffect(() => {
    if (mode !== "create" || isEditMode) return;
    if (prevPeriodRef.current === formData.periodType) return;
    prevPeriodRef.current = formData.periodType;

    const label = getPeriodLabel(formData.periodType);
    setSemesterSlots((prev) =>
      prev.map((slot, i) => ({ ...slot, name: `${label} ${i + 1}` }))
    );
  }, [formData.periodType, mode, isEditMode]);

  const selectedProgram = useMemo(
    () => programs.find((p) => p._id === selectedProgramId),
    [programs, selectedProgramId]
  );

  /* ── Handlers ── */
  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    dispatch({ type: "SET_PROGRAM_MODE", mode: nextMode });
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSlotCreditChange = (index, value) => {
    setSemesterSlots((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        totalCredits: value === "" ? 0 : Number(value) || 0,
      };
      return next;
    });
  };

  const handleSlotNameChange = (index, value) => {
    setSemesterSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name: value };
      return next;
    });
  };

  const handleRedistributeCredits = () => {
    const count = semesterSlots.length;
    if (count <= 0 || totalCredits <= 0) return;
    const base = Math.floor(totalCredits / count);
    const remainder = totalCredits - base * count;
    setSemesterSlots((prev) =>
      prev.map((slot, i) => ({
        ...slot,
        totalCredits: base + (i < remainder ? 1 : 0),
      }))
    );
  };

  /* ── Build program payload from form data ── */
  const buildProgramPayload = () => {
    const payload = {
      name: formData.name,
      code: formData.code,
      school: formData.school || undefined,
      stream: (formData.stream || "").trim() || undefined,
      modeOfDelivery:
        normalizeModeOfDeliveryValue(formData.modeOfDelivery) ||
        MODE_OF_DELIVERY.REGULAR,
      description: formData.description || undefined,
      periodType: formData.periodType || "semester",
      totalSemesters: Number(formData.totalSemesters) || semesterSlots.length,
      totalCredits: Number(formData.totalCredits) || 0,
    };
    if (formData.programCoordinator) {
      payload.programCoordinator = formData.programCoordinator;
    }
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });
    return payload;
  };

  /* ── Draft-only: save to local state and continue ── */
  const handleCreateAndContinue = () => {
    if (!formData.name || !formData.code || !formData.totalSemesters) {
      setError(`Name, Code, and Total ${periodLabel}s are required.`);
      return;
    }
    if (totalSemCount > 0 && semesterSlots.length === 0) {
      setError(`Please configure ${periodLabel.toLowerCase()} slots.`);
      return;
    }
    if (creditOverflow) {
      setError(
        `Total assigned credits (${assignedCredits}) exceed program total (${totalCredits}).`
      );
      return;
    }
    setError(null);

    // Save everything to local wizard state — NO API calls
    const programPayload = buildProgramPayload();
    const draftProgramId = isEditMode
      ? state.programId
      : state.programId || `draft_${Date.now()}`;

    dispatch({
      type: "SET_PROGRAM",
      programId: draftProgramId,
      programData: { ...programPayload, _id: draftProgramId },
      programMode: isEditMode ? "existing" : "create",
    });
    dispatch({ type: "SET_SEMESTERS", semesters: semesterSlots });
    dispatch({ type: "MARK_COMPLETE", step: 1 });
    goNext();
  };

  /* ── Existing program: fetch details (read-only API) ── */
  const handleSelectAndContinue = async () => {
    if (!selectedProgramId) {
      setError("Please select a program.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await getProgramById(selectedProgramId);
      const program = data.program || data;

      dispatch({
        type: "SET_PROGRAM",
        programId: program._id,
        programData: program,
        programMode: "existing",
      });

      // Load existing semesters for this program
      try {
        const semData = await getSemesters({ program: selectedProgramId });
        const existingSems = semData?.semesters || semData || [];
        if (Array.isArray(existingSems) && existingSems.length > 0) {
          dispatch({ type: "SET_SEMESTERS", semesters: existingSems });
        } else {
          // Generate draft semesters from program config
          const slots = buildSemesterSlots(
            program.periodType || "semester",
            program.totalSemesters || 0,
            program.totalCredits || 0
          );
          dispatch({ type: "SET_SEMESTERS", semesters: slots });
        }
      } catch {
        const slots = buildSemesterSlots(
          program.periodType || "semester",
          program.totalSemesters || 0,
          program.totalCredits || 0
        );
        dispatch({ type: "SET_SEMESTERS", semesters: slots });
      }

      dispatch({ type: "MARK_COMPLETE", step: 1 });
      goNext();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to load program."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition";
  const labelClass =
    "block text-xs uppercase tracking-widest text-gray-500 font-medium mb-1.5";

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {isEditMode ? "Edit Program" : "Program Setup"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode
            ? "Modify program details and period structure."
            : "Create a new program or choose an existing one to continue."}
        </p>
      </div>

      <hr className="my-6 border-gray-200" />

      {/* Mode toggle — hidden in edit mode */}
      {!isEditMode && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => handleModeChange("create")}
            className={`
              relative p-5 rounded-xl border-2 text-left transition-all
              ${
                mode === "create"
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }
            `}
          >
            <Plus
              className={`w-5 h-5 mb-2 ${
                mode === "create" ? "text-blue-600" : "text-gray-400"
              }`}
            />
            <div
              className={`text-sm font-semibold ${
                mode === "create" ? "text-blue-900" : "text-gray-700"
              }`}
            >
              Create New Program
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Start from scratch</div>
          </button>
          <button
            onClick={() => handleModeChange("existing")}
            className={`
              relative p-5 rounded-xl border-2 text-left transition-all
              ${
                mode === "existing"
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }
            `}
          >
            <Building2
              className={`w-5 h-5 mb-2 ${
                mode === "existing" ? "text-blue-600" : "text-gray-400"
              }`}
            />
            <div
              className={`text-sm font-semibold ${
                mode === "existing" ? "text-blue-900" : "text-gray-700"
              }`}
            >
              Use Existing Program
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Select from your programs
            </div>
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ════════════════ CREATE / EDIT MODE ════════════════ */}
      {(mode === "create" || isEditMode) && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >
          {/* Program Name & Code */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Program Name *</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="e.g. B.Tech Computer Science"
              />
            </div>
            <div>
              <label className={labelClass}>Program Code *</label>
              <input
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="e.g. BTCS"
              />
            </div>
          </motion.div>

          {/* School & Stream */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>School</label>
              <input
                name="school"
                value={formData.school}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="e.g. School of Computer Engineering"
              />
            </div>
            <div>
              <label className={labelClass}>Stream</label>
              <input
                name="stream"
                value={formData.stream}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="e.g. Engineering"
              />
            </div>
          </motion.div>

          {/* Mode of Delivery & Period Type */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Mode of Delivery</label>
              <select
                name="modeOfDelivery"
                value={formData.modeOfDelivery}
                onChange={handleInputChange}
                className={inputClass}
              >
                {MODE_OF_DELIVERY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Period Type</label>
              <select
                name="periodType"
                value={formData.periodType}
                onChange={handleInputChange}
                className={inputClass}
              >
                <option value="semester">Semester</option>
                <option value="term">Term</option>
                <option value="month">Month</option>
                <option value="week">Week</option>
              </select>
            </div>
          </motion.div>

          {/* Total Periods & Total Credits */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Total {periodLabel}s *
              </label>
              <input
                name="totalSemesters"
                type="number"
                min="1"
                value={formData.totalSemesters}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="e.g. 8"
              />
            </div>
            <div>
              <label className={labelClass}>Total Credits</label>
              <input
                name="totalCredits"
                type="number"
                min="0"
                value={formData.totalCredits}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="e.g. 160"
              />
            </div>
          </motion.div>

          {/* Program Coordinator */}
          <motion.div variants={fadeUp}>
            <label className={labelClass}>Program Coordinator</label>
            <select
              name="programCoordinator"
              value={formData.programCoordinator}
              onChange={handleInputChange}
              className={inputClass}
            >
              <option value="">Select coordinator (optional)</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </motion.div>

          {/* Description */}
          <motion.div variants={fadeUp}>
            <label className={labelClass}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className={inputClass}
              placeholder="Brief program description..."
            />
          </motion.div>

          {/* ════════ Semester / Period Slots ════════ */}
          <AnimatePresence>
            {totalSemCount > 0 && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                exit="hidden"
              >
                <div className="border-t border-gray-200 pt-6 mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {periodLabel} Distribution
                    </h2>
                    {totalCredits > 0 && semesterSlots.length > 0 && (
                      <button
                        type="button"
                        onClick={handleRedistributeCredits}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Redistribute equally
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {totalCredits > 0 ? (
                      <>
                        Distribute{" "}
                        <span className="font-medium text-gray-700">
                          {totalCredits}
                        </span>{" "}
                        credits across{" "}
                        <span className="font-medium text-gray-700">
                          {totalSemCount}
                        </span>{" "}
                        {periodLabel.toLowerCase()}s.
                        <span
                          className={`ml-2 ${
                            creditOverflow
                              ? "text-red-500 font-medium"
                              : "text-gray-400"
                          }`}
                        >
                          (Assigned: {assignedCredits}/{totalCredits})
                        </span>
                      </>
                    ) : (
                      <>
                        Configure {totalSemCount} {periodLabel.toLowerCase()}s
                        below.
                      </>
                    )}
                  </p>

                  {/* Credit progress bar */}
                  {totalCredits > 0 && (
                    <div className="mb-5">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            creditOverflow ? "bg-red-500" : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (assignedCredits / totalCredits) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Slot rows */}
                  <div className="space-y-2">
                    {semesterSlots.map((slot, index) => (
                      <motion.div
                        key={slot.tempId || slot._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5"
                      >
                        <span className="text-xs text-gray-400 font-mono w-6 text-right">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <input
                            value={slot.name}
                            onChange={(e) =>
                              handleSlotNameChange(index, e.target.value)
                            }
                            className="w-full border-0 p-0 text-sm font-medium text-gray-900 focus:ring-0 outline-none bg-transparent"
                            placeholder={`${periodLabel} ${index + 1}`}
                          />
                        </div>
                        <div className="flex items-center gap-2 w-36 flex-shrink-0">
                          <input
                            type="number"
                            min="0"
                            value={slot.totalCredits || ""}
                            onChange={(e) =>
                              handleSlotCreditChange(index, e.target.value)
                            }
                            className="w-20 border border-gray-300 rounded-md px-3 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="0"
                          />
                          <span className="text-xs text-gray-500">credits</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {creditOverflow && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      Total assigned credits ({assignedCredits}) exceed program
                      total ({totalCredits}).
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Continue button */}
          <motion.div variants={fadeUp} className="pt-4">
            <button
              onClick={handleCreateAndContinue}
              disabled={creditOverflow}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* ════════════════ EXISTING MODE ════════════════ */}
      {mode === "existing" && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >
          <motion.div variants={fadeUp}>
            <label className={labelClass}>Select Program</label>
            {loadingPrograms ? (
              <div className="flex items-center text-sm text-gray-500 py-3">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading
                programs...
              </div>
            ) : (
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className={inputClass}
              >
                <option value="">Choose a program...</option>
                {programs.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            )}
          </motion.div>

          {selectedProgram && (
            <motion.div
              variants={fadeUp}
              className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-2"
            >
              <div className="text-sm font-semibold text-gray-900">
                {selectedProgram.name}
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Code: {selectedProgram.code}</div>
                {selectedProgram.school && (
                  <div>School: {selectedProgram.school}</div>
                )}
                {selectedProgram.periodType && (
                  <div>Period: {selectedProgram.periodType}</div>
                )}
                {selectedProgram.totalSemesters && (
                  <div>
                    Total {getPeriodLabel(selectedProgram.periodType)}s:{" "}
                    {selectedProgram.totalSemesters}
                  </div>
                )}
                {selectedProgram.totalCredits && (
                  <div>Total Credits: {selectedProgram.totalCredits}</div>
                )}
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp} className="pt-4">
            <button
              onClick={handleSelectAndContinue}
              disabled={submitting || !selectedProgramId}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Continue with Program
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default StepProgramSetup;
