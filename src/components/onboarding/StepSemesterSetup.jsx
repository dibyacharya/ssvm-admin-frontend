import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Plus, Trash2, Loader2, AlertTriangle, Edit3, X } from 'lucide-react';
import { createSemester, deleteSemester, updateSemester } from '../../services/semester.services';
import { calculateEndDate } from '../../utils/dateCalculator';
import { getPeriodLabel } from '../../utils/periodLabel';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const StepSemesterSetup = ({ state, dispatch, goNext, goBack }) => {
  const { programData, programId, semesters } = state;
  const periodType = programData?.periodType || 'semester';
  const periodLabel = getPeriodLabel(periodType);
  const totalExpected = programData?.totalSemesters || 0;
  const programTotalCredits = programData?.totalCredits ? Number(programData.totalCredits) : 0;

  // Sum of credits already assigned to existing semesters
  const assignedCredits = semesters.reduce((sum, sem) => sum + (Number(sem.totalCredits) || 0), 0);
  const remainingCredits = programTotalCredits > 0 ? programTotalCredits - assignedCredits : null;

  const getSmartDefaults = () => {
    const nextNumber = semesters.length + 1;
    let startDate = '';
    if (semesters.length > 0) {
      const lastSem = semesters[semesters.length - 1];
      startDate = lastSem.endDate || '';
    }
    const endDate = startDate ? (calculateEndDate(startDate, periodType) || '') : '';
    return {
      name: `${periodLabel} ${nextNumber}`,
      semNumber: nextNumber,
      startDate,
      endDate,
      midTermExamDate: '',
      endTermExamDate: '',
      totalCredits: '',
    };
  };

  const [formData, setFormData] = useState(getSmartDefaults);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [editingSemesterId, setEditingSemesterId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    midTermExamDate: '',
    endTermExamDate: '',
    totalCredits: '',
  });
  const [error, setError] = useState(null);
  const [loadingSemesters, setLoadingSemesters] = useState(false);

  const toIdString = (value) => (value == null ? '' : String(value));
  const getSemesterId = (semester) => toIdString(semester?._id || semester?.id || '');

  // Update form defaults after semesters are loaded from API
  useEffect(() => {
    if (semesters.length === 0) return;
    const nextNumber = semesters.length + 1;
    const lastSem = semesters[semesters.length - 1];
    let startDate = lastSem.endDate || '';
    if (startDate) startDate = startDate.split('T')[0];
    const endDate = startDate ? (calculateEndDate(startDate, periodType) || '') : '';
    setFormData({
      name: `${periodLabel} ${nextNumber}`,
      semNumber: nextNumber,
      startDate,
      endDate,
      midTermExamDate: '',
      endTermExamDate: '',
      totalCredits: '',
    });
  }, [semesters.length]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'startDate' && value) {
        updated.endDate = calculateEndDate(value, periodType) || '';
      }
      return updated;
    });
  };

  const handleAddSemester = async () => {
    if (!formData.name || !formData.startDate) {
      setError('Name and Start Date are required.');
      return;
    }
    // Check if adding this semester's credits would exceed program total
    const newCredits = Number(formData.totalCredits) || 0;
    if (programTotalCredits > 0 && newCredits > 0 && (assignedCredits + newCredits) > programTotalCredits) {
      setError(`Adding ${newCredits} credits would exceed the program total of ${programTotalCredits} credits (currently assigned: ${assignedCredits}).`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        program: programId,
        name: formData.name,
        semNumber: Number(formData.semNumber) || semesters.length + 1,
        startDate: formData.startDate,
        endDate: formData.endDate,
      };
      if (formData.midTermExamDate) payload.midTermExamDate = formData.midTermExamDate;
      if (formData.endTermExamDate) payload.endTermExamDate = formData.endTermExamDate;
      if (formData.totalCredits) payload.totalCredits = Number(formData.totalCredits);

      const data = await createSemester(payload);
      const semester = data.semester || data;
      dispatch({ type: 'ADD_SEMESTER', semester });

      // Reset form with next smart defaults
      const nextNum = semesters.length + 2;
      const nextStart = semester.endDate
        ? (typeof semester.endDate === 'string' ? semester.endDate.split('T')[0] : semester.endDate)
        : '';
      const nextEnd = nextStart ? (calculateEndDate(nextStart, periodType) || '') : '';
      setFormData({
        name: `${periodLabel} ${nextNum}`,
        semNumber: nextNum,
        startDate: nextStart,
        endDate: nextEnd,
        midTermExamDate: '',
        endTermExamDate: '',
        totalCredits: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create semester.');
    } finally {
      setSubmitting(false);
    }
  };

	  const handleDeleteSemester = async (semId) => {
	    const normalizedId = getSemesterId({ _id: semId }) || toIdString(semId);
	    if (!normalizedId) return;
	    setDeleting(semId);
	    try {
	      await deleteSemester(normalizedId);
	      dispatch({ type: 'REMOVE_SEMESTER', semesterId: normalizedId });
	    } catch (err) {
	      const msg =
	        err?.response?.data?.error ||
	        err?.response?.data?.message ||
	        'Failed to delete semester.';
	      setError(msg);
	    } finally {
	      setDeleting(null);
	    }
	  };

  const openEditModal = (semester) => {
    const semId = getSemesterId(semester);
    if (!semId) return;
    setEditError(null);
    setEditingSemesterId(semId);

    const startDate =
      typeof semester?.startDate === 'string'
        ? semester.startDate.split('T')[0]
        : semester?.startDate
        ? String(semester.startDate)
        : '';
    const endDate =
      typeof semester?.endDate === 'string'
        ? semester.endDate.split('T')[0]
        : semester?.endDate
        ? String(semester.endDate)
        : '';

    setEditFormData({
      name: semester?.name || '',
      startDate,
      endDate,
      midTermExamDate:
        typeof semester?.midTermExamDate === 'string'
          ? semester.midTermExamDate.split('T')[0]
          : '',
      endTermExamDate:
        typeof semester?.endTermExamDate === 'string'
          ? semester.endTermExamDate.split('T')[0]
          : '',
      totalCredits:
        semester?.totalCredits !== undefined && semester?.totalCredits !== null
          ? String(semester.totalCredits)
          : '',
    });
    setEditOpen(true);
  };

  const closeEditModal = () => {
    if (editSubmitting) return;
    setEditOpen(false);
    setEditingSemesterId(null);
    setEditError(null);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'startDate' && value) {
        updated.endDate = calculateEndDate(value, periodType) || '';
      }
      return updated;
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSemesterId) return;
    if (!editFormData.name || !editFormData.startDate) {
      setEditError('Name and Start Date are required.');
      return;
    }

    const nextCredits = editFormData.totalCredits === '' ? null : Number(editFormData.totalCredits);
    if (nextCredits !== null && (!Number.isFinite(nextCredits) || nextCredits < 0)) {
      setEditError('Total Credits must be a number >= 0.');
      return;
    }

    const newCredits = nextCredits || 0;
    const existing = semesters.find((s) => getSemesterId(s) === editingSemesterId);
    const oldCredits = Number(existing?.totalCredits) || 0;
    if (
      programTotalCredits > 0 &&
      newCredits > 0 &&
      (assignedCredits - oldCredits + newCredits) > programTotalCredits
    ) {
      setEditError(
        `Setting ${newCredits} credits would exceed the program total of ${programTotalCredits} credits (other ${periodLabel.toLowerCase()}s: ${assignedCredits - oldCredits}).`
      );
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    try {
      const payload = {
        name: editFormData.name,
        startDate: editFormData.startDate,
        endDate: editFormData.endDate,
      };
      if (editFormData.midTermExamDate) payload.midTermExamDate = editFormData.midTermExamDate;
      if (editFormData.endTermExamDate) payload.endTermExamDate = editFormData.endTermExamDate;
      if (nextCredits !== null) payload.totalCredits = nextCredits;

      const data = await updateSemester(editingSemesterId, payload);
      const updated = data?.semester || data;
      dispatch({ type: 'UPDATE_SEMESTER', semester: updated });
      setEditOpen(false);
      setEditingSemesterId(null);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to update semester.';
      setEditError(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleContinue = () => {
    dispatch({ type: 'MARK_COMPLETE', step: 2 });
    goNext();
  };

  const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition';
  const labelClass = 'block text-xs uppercase tracking-widest text-gray-500 font-medium mb-1.5';

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{periodLabel} Setup</h1>
      <p className="mt-1 text-sm text-gray-500">
        Add {periodLabel.toLowerCase()}s for this program.
        {totalExpected > 0 && (
          <span className="ml-1 font-medium text-gray-700">
            {semesters.length} of {totalExpected} created
          </span>
        )}
      </p>

      <hr className="my-6 border-gray-200" />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {loadingSemesters && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-gray-500">Loading existing {periodLabel.toLowerCase()}s…</span>
        </div>
      )}

      {/* Progress bar */}
      {totalExpected > 0 && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((semesters.length / totalExpected) * 100, 100)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      )}

      {/* Credit tracking */}
      {programTotalCredits > 0 && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">
              Program Credits: <span className="font-semibold text-gray-900">{programTotalCredits}</span>
            </span>
            <span className="text-gray-600">
              Assigned: <span className={`font-semibold ${assignedCredits > programTotalCredits ? 'text-red-600' : 'text-gray-900'}`}>{assignedCredits}</span>
              {remainingCredits !== null && (
                <span className="ml-2 text-gray-400">
                  ({remainingCredits >= 0 ? `${remainingCredits} remaining` : `${Math.abs(remainingCredits)} over`})
                </span>
              )}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${assignedCredits > programTotalCredits ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, (assignedCredits / programTotalCredits) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Created semesters list */}
      <AnimatePresence>
        {semesters.map((sem) => (
          <motion.div
            key={getSemesterId(sem) || sem.name}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3"
          >
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="text-sm">
                <span className="font-medium text-gray-900">{sem.name}</span>
                <span className="text-gray-400 mx-2">&middot;</span>
                <span className="text-gray-500">
                  {sem.startDate?.split('T')[0]} &rarr; {sem.endDate?.split('T')[0]}
                </span>
                {sem.totalCredits != null && sem.totalCredits > 0 && (
                  <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{sem.totalCredits} cr</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(sem)}
                  disabled={Boolean(deleting) || editSubmitting}
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition disabled:opacity-50"
                  title={`Edit ${periodLabel}`}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteSemester(getSemesterId(sem))}
                  disabled={deleting === getSemesterId(sem)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition disabled:opacity-50"
                  title={`Delete ${periodLabel}`}
                >
                  {deleting === getSemesterId(sem)
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  Edit {periodLabel}
                </div>
                <div className="text-xs text-gray-500">
                  Update name and total credits. Changes apply immediately to Course Assignment total credit.
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded p-1 text-gray-400 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Name *</label>
                  <input
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Start Date *</label>
                  <input
                    name="startDate"
                    type="date"
                    value={editFormData.startDate}
                    onChange={handleEditInputChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>End Date</label>
                  <input
                    name="endDate"
                    type="date"
                    value={editFormData.endDate}
                    onChange={handleEditInputChange}
                    className={inputClass}
                  />
                  <span className="text-xs text-gray-400 mt-1 block">Auto-computed</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Mid Exam Date</label>
                  <input
                    name="midTermExamDate"
                    type="date"
                    value={editFormData.midTermExamDate}
                    onChange={handleEditInputChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>End Exam Date</label>
                  <input
                    name="endTermExamDate"
                    type="date"
                    value={editFormData.endTermExamDate}
                    onChange={handleEditInputChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Total Credits</label>
                  <input
                    name="totalCredits"
                    type="number"
                    min="0"
                    value={editFormData.totalCredits}
                    onChange={handleEditInputChange}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={editSubmitting}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editSubmitting}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {editSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline add form */}
      <div className="bg-gray-50 border border-gray-200 border-dashed rounded-lg p-5 mt-4 space-y-4">
        <div className="text-xs uppercase tracking-widest text-gray-500 font-medium flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          Add {periodLabel}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input name="name" value={formData.name} onChange={handleInputChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{periodLabel} Number</label>
            <input name="semNumber" type="number" min="1" value={formData.semNumber} onChange={handleInputChange} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start Date *</label>
            <input name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>End Date</label>
            <input name="endDate" type="date" value={formData.endDate} onChange={handleInputChange} className={inputClass} />
            <span className="text-xs text-gray-400 mt-1 block">Auto-computed</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Mid Exam Date</label>
            <input name="midTermExamDate" type="date" value={formData.midTermExamDate} onChange={handleInputChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>End Exam Date</label>
            <input name="endTermExamDate" type="date" value={formData.endTermExamDate} onChange={handleInputChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Total Credits</label>
            <input
              name="totalCredits"
              type="number"
              min="0"
              max={remainingCredits != null && remainingCredits > 0 ? remainingCredits : undefined}
              value={formData.totalCredits}
              onChange={handleInputChange}
              className={inputClass}
              placeholder={remainingCredits != null && remainingCredits > 0 ? `max ${remainingCredits}` : ''}
            />
            {remainingCredits != null && remainingCredits > 0 && formData.totalCredits === '' && (
              <span className="text-xs text-gray-400 mt-1 block">{remainingCredits} credits remaining in program</span>
            )}
            {formData.totalCredits && Number(formData.totalCredits) > 0 && remainingCredits != null && Number(formData.totalCredits) > remainingCredits && (
              <span className="text-xs text-red-500 mt-1 block">Exceeds remaining program credits ({remainingCredits})</span>
            )}
          </div>
        </div>

        <button
          onClick={handleAddSemester}
          disabled={submitting}
          className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Add {periodLabel}
        </button>
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

        <div className="flex items-center gap-3">
          {semesters.length === 0 && (
            <span className="flex items-center text-xs text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              No {periodLabel.toLowerCase()}s yet
            </span>
          )}
          <button
            onClick={handleContinue}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepSemesterSetup;
