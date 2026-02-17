import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, ChevronRight, Building2, Loader2 } from "lucide-react";
import {
  createProgram,
  getProgramsDropdown,
  getProgramById,
  updateProgram,
} from "../../services/program.service";
import { getTeachers } from "../../services/user.service";
import { getPeriodLabel } from "../../utils/periodLabel";

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
  modeOfDelivery: "regular",
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
    modeOfDelivery: program.modeOfDelivery || "regular",
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

const StepProgramSetup = ({ state, dispatch, goNext }) => {
  const [mode, setMode] = useState(state.programMode || "create");
  const [formData, setFormData] = useState(() => toProgramForm(state.programData));
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState(state.programId || "");
  const [teachers, setTeachers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const isEditingCreatedProgram =
    mode === "create" && Boolean(state.programId) && state.programMode === "create";

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

  const selectedProgram = useMemo(
    () => programs.find((p) => p._id === selectedProgramId),
    [programs, selectedProgramId]
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOrUpdateAndContinue = async () => {
    const periodLabel = getPeriodLabel(formData.periodType);
    if (!formData.name || !formData.code || !formData.totalSemesters) {
      setError(`Name, Code, and Total ${periodLabel}s are required.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...formData };
      if (payload.totalSemesters)
        payload.totalSemesters = Number(payload.totalSemesters);
      if (payload.totalCredits) payload.totalCredits = Number(payload.totalCredits);
      if (!payload.programCoordinator) delete payload.programCoordinator;
      if (typeof payload.stream === "string") payload.stream = payload.stream.trim();
      if (!payload.stream) delete payload.stream;

      let data;
      if (isEditingCreatedProgram) {
        data = await updateProgram(state.programId, payload);
      } else {
        data = await createProgram(payload);
      }

      const program = data.program || data;
      dispatch({
        type: "SET_PROGRAM",
        programId: program._id,
        programData: program,
        programMode: "create",
      });
      goNext();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          `Failed to ${isEditingCreatedProgram ? "update" : "create"} program.`
      );
    } finally {
      setSubmitting(false);
    }
  };

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
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
        Program Setup
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Create a new program or choose an existing one to continue.
      </p>

      <hr className="my-6 border-gray-200" />

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => {
            setMode("create");
            setError(null);
          }}
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
          onClick={() => {
            setMode("existing");
            setError(null);
          }}
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {mode === "create" && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
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

          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Mode of Delivery</label>
              <select
                name="modeOfDelivery"
                value={formData.modeOfDelivery}
                onChange={handleInputChange}
                className={inputClass}
              >
                <option value="regular">Regular</option>
                <option value="online">Online</option>
                <option value="wilp">WILP</option>
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

          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Total {getPeriodLabel(formData.periodType)}s *
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

          <motion.div variants={fadeUp} className="pt-4">
            <button
              onClick={handleCreateOrUpdateAndContinue}
              disabled={submitting}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isEditingCreatedProgram
                ? "Save Program & Continue"
                : "Create Program & Continue"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </motion.div>
        </motion.div>
      )}

      {mode === "existing" && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
          <motion.div variants={fadeUp}>
            <label className={labelClass}>Select Program</label>
            {loadingPrograms ? (
              <div className="flex items-center text-sm text-gray-500 py-3">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading programs...
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
                {selectedProgram.school && <div>School: {selectedProgram.school}</div>}
                {selectedProgram.periodType && <div>Period: {selectedProgram.periodType}</div>}
                {selectedProgram.totalSemesters && (
                  <div>
                    Total {getPeriodLabel(selectedProgram.periodType)}s:{" "}
                    {selectedProgram.totalSemesters}
                  </div>
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
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
