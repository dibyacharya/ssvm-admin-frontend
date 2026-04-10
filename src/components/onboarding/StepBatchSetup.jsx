import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  GraduationCap,
  Plus,
  Layers,
} from "lucide-react";
import {
  createBatch,
  updateBatch,
  getBatchesByProgram,
  getBatchById,
} from "../../services/batch.service";
import { calculateBatchEndDate, formatMonthYear } from "../../utils/dateCalculator";
import { getPeriodLabel } from "../../utils/periodLabel";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const toInputDate = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.split("T")[0];
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return "";
};

const toBatchForm = (batch) => {
  if (!batch) {
    return {
      year: new Date().getFullYear().toString(),
      startDate: "",
      name: "",
      expectedEndDate: "",
      maxStrength: "",
    };
  }
  return {
    year:
      batch.year !== undefined && batch.year !== null
        ? String(batch.year)
        : new Date().getFullYear().toString(),
    startDate: toInputDate(batch.startDate),
    name: batch.name || "",
    expectedEndDate: toInputDate(batch.expectedEndDate),
    maxStrength:
      batch.maxStrength !== undefined && batch.maxStrength !== null
        ? String(batch.maxStrength)
        : "",
  };
};

const StepBatchSetup = ({ state, dispatch, goNext, goBack }) => {
  const { programData, programId } = state;
  const [mode, setMode] = useState(state.batchId ? "create" : "create");
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(state.batchId || "");
  const [formData, setFormData] = useState(() => toBatchForm(state.batchData));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEditingCurrentBatch =
    mode === "create" && Boolean(state.batchId) && Boolean(state.batchData);

  useEffect(() => {
    if (!programId) return;
    const loadBatches = async () => {
      setLoadingBatches(true);
      try {
        const data = await getBatchesByProgram(programId);
        const list = data.batches || data || [];
        setBatches(list);
      } catch (err) {
        console.error("Error loading batches:", err);
        setBatches([]);
      } finally {
        setLoadingBatches(false);
      }
    };
    loadBatches();
  }, [programId]);

  useEffect(() => {
    if (state.batchData && mode === "create") {
      setFormData(toBatchForm(state.batchData));
    }
  }, [state.batchData, mode]);

  useEffect(() => {
    if (state.batchId) {
      setSelectedBatchId(state.batchId);
    }
  }, [state.batchId]);

  useEffect(() => {
    if (!formData.startDate) return;
    setFormData((prev) => {
      const next = { ...prev };
      const autoName = formatMonthYear(formData.startDate);
      if (!isEditingCurrentBatch && autoName) {
        next.name = autoName;
      }
      if (programData) {
        const endDate = calculateBatchEndDate(
          formData.startDate,
          programData.periodType,
          programData.totalSemesters
        );
        if (endDate) {
          next.expectedEndDate = endDate;
        }
      }
      return next;
    });
  }, [formData.startDate, programData, isEditingCurrentBatch]);

  const selectedBatch = useMemo(
    () => batches.find((b) => b._id === selectedBatchId),
    [batches, selectedBatchId]
  );
  const hasBatches = batches.length > 0;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.year || !formData.startDate) {
      setError("Year and Start Date are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        program: programId,
        year: Number(formData.year),
        name: formData.name,
        startDate: formData.startDate,
        expectedEndDate: formData.expectedEndDate,
      };
      if (formData.maxStrength) payload.maxStrength = Number(formData.maxStrength);

      const data = isEditingCurrentBatch
        ? await updateBatch(state.batchId, payload)
        : await createBatch(payload);

      const batch = data.batch || data;
      dispatch({ type: "SET_BATCH", batchId: batch._id, batchData: batch });
      goNext();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to save batch.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAndContinue = async () => {
    if (!selectedBatchId) {
      setError("Please select a batch.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await getBatchById(selectedBatchId);
      const batch = data.batch || data;
      dispatch({ type: "SET_BATCH", batchId: batch._id, batchData: batch });
      goNext();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to load batch.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition";
  const labelClass =
    "block text-xs uppercase tracking-widest text-gray-500 font-medium mb-1.5";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-[#1E293B]">
        Batch Setup
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Create a new batch or choose an existing one for this program.
      </p>

      {programData && (
        <div className="mt-4 flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
          <GraduationCap className="w-5 h-5 text-purple-600 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-purple-900">{programData.name}</span>
            <span className="text-purple-600 ml-2">({programData.code})</span>
            {programData.totalSemesters && (
              <span className="text-purple-500 ml-2">
                &middot; {programData.totalSemesters}{" "}
                {getPeriodLabel(programData.periodType).toLowerCase()}s
              </span>
            )}
          </div>
        </div>
      )}

      <hr className="my-6 border-gray-200" />

      {hasBatches && (
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
                  ? "border-purple-600 bg-purple-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }
            `}
          >
            <Plus
              className={`w-5 h-5 mb-2 ${
                mode === "create" ? "text-purple-600" : "text-gray-400"
              }`}
            />
            <div
              className={`text-sm font-semibold ${
                mode === "create" ? "text-purple-900" : "text-gray-700"
              }`}
            >
              Create New Batch
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
                  ? "border-purple-600 bg-purple-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }
            `}
          >
            <Layers
              className={`w-5 h-5 mb-2 ${
                mode === "existing" ? "text-purple-600" : "text-gray-400"
              }`}
            />
            <div
              className={`text-sm font-semibold ${
                mode === "existing" ? "text-purple-900" : "text-gray-700"
              }`}
            >
              Use Existing Batch
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Select from program batches
            </div>
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {mode === "create" && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Year *</label>
              <input
                name="year"
                type="number"
                value={formData.year}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Start Date *</label>
              <input
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Batch Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="Auto-filled from start date"
              />
              <span className="text-xs text-gray-400 mt-1 block">
                Auto-generated from start date
              </span>
            </div>
            <div>
              <label className={labelClass}>Expected End Date</label>
              <input
                name="expectedEndDate"
                type="date"
                value={formData.expectedEndDate}
                onChange={handleInputChange}
                className={inputClass}
              />
              <span className="text-xs text-gray-400 mt-1 block">
                Auto-computed from program duration
              </span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <label className={labelClass}>Max Strength</label>
            <input
              name="maxStrength"
              type="number"
              min="0"
              value={formData.maxStrength}
              onChange={handleInputChange}
              className={inputClass}
              placeholder="e.g. 60"
            />
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center justify-between pt-4">
            <button
              onClick={goBack}
              className="inline-flex items-center px-5 py-3 text-sm font-medium text-gray-600 hover:text-[#1E293B] transition"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isEditingCurrentBatch ? "Save Batch & Continue" : "Create Batch & Continue"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </motion.div>
        </motion.div>
      )}

      {mode === "existing" && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
          <motion.div variants={fadeUp}>
            <label className={labelClass}>Select Batch</label>
            {loadingBatches ? (
              <div className="flex items-center text-sm text-gray-500 py-3">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading batches...
              </div>
            ) : (
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className={inputClass}
              >
                <option value="">Choose a batch...</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} — {b.year} ({b.status})
                  </option>
                ))}
              </select>
            )}
          </motion.div>

          {selectedBatch && (
            <motion.div
              variants={fadeUp}
              className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-2"
            >
              <div className="text-sm font-semibold text-[#1E293B]">
                {selectedBatch.name}
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Year: {selectedBatch.year}</div>
                {selectedBatch.startDate && (
                  <div>Start: {new Date(selectedBatch.startDate).toLocaleDateString()}</div>
                )}
                {selectedBatch.expectedEndDate && (
                  <div>
                    End: {new Date(selectedBatch.expectedEndDate).toLocaleDateString()}
                  </div>
                )}
                <div>
                  Status: <span className="capitalize">{selectedBatch.status}</span>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp} className="flex items-center justify-between pt-4">
            <button
              onClick={goBack}
              className="inline-flex items-center px-5 py-3 text-sm font-medium text-gray-600 hover:text-[#1E293B] transition"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <button
              onClick={handleSelectAndContinue}
              disabled={submitting || !selectedBatchId}
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Continue with Batch
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default StepBatchSetup;
