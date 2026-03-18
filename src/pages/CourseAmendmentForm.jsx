import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  createAmendment,
  getAmendmentById,
  updateAmendment,
  submitForApproval,
} from '../services/courseAmendment.service';
import { getAllPrograms } from '../services/program.service';
import { getAllCourses } from '../services/courses.service';
import { getBatchesByProgram } from '../services/batch.service';

const CHANGE_TYPES = [
  { value: 'ADD_COURSE', label: 'Add Course' },
  { value: 'REMOVE_COURSE', label: 'Remove Course' },
  { value: 'REPLACE_COURSE', label: 'Replace Course' },
];

const emptyChange = () => ({
  _key: Date.now() + Math.random(),
  type: 'ADD_COURSE',
  semesterNumber: 1,
  courseId: '',
  removedCourseId: '',
});

const CourseAmendmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    program: '',
    title: '',
    reason: '',
    scope: 'CURRENT_AND_FUTURE',
    currentBatchId: '',
    changes: [emptyChange()],
  });

  const [selectedProgram, setSelectedProgram] = useState(null);

  // Load programs and courses
  useEffect(() => {
    Promise.all([
      getAllPrograms().then((res) => res.programs || res || []),
      getAllCourses().then((res) => res.courses || res || []),
    ])
      .then(([progs, crses]) => {
        setPrograms(progs);
        setCourses(crses);
      })
      .catch(() => {});
  }, []);

  // Load batches when program changes
  useEffect(() => {
    if (!form.program) {
      setBatches([]);
      return;
    }
    const prog = programs.find((p) => p._id === form.program);
    setSelectedProgram(prog || null);
    getBatchesByProgram(form.program)
      .then((res) => setBatches(res.batches || res || []))
      .catch(() => setBatches([]));
  }, [form.program, programs]);

  // Load existing amendment data in edit mode
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getAmendmentById(id)
      .then((res) => {
        const amd = res.amendment;
        setForm({
          program: amd.program?._id || amd.program || '',
          title: amd.title || '',
          reason: amd.reason || '',
          scope: amd.scope || 'CURRENT_AND_FUTURE',
          currentBatchId: amd.currentBatchId?._id || amd.currentBatchId || '',
          changes: (amd.changes || []).map((c) => ({
            _key: c._id || Date.now() + Math.random(),
            type: c.type,
            semesterNumber: c.semesterNumber,
            courseId: c.courseId?._id || c.courseId || '',
            removedCourseId: c.removedCourseId?._id || c.removedCourseId || '',
          })),
        });
      })
      .catch((err) =>
        setError(err?.response?.data?.error || 'Failed to load amendment')
      )
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.changes];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, changes: updated };
    });
  };

  const addChange = () => {
    setForm((prev) => ({
      ...prev,
      changes: [...prev.changes, emptyChange()],
    }));
  };

  const removeChange = (index) => {
    setForm((prev) => ({
      ...prev,
      changes: prev.changes.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    if (!form.program) return 'Please select a program.';
    if (!form.title.trim()) return 'Title is required.';
    if (!form.scope) return 'Please select a scope.';
    if (form.scope === 'CURRENT_AND_FUTURE' && !form.currentBatchId)
      return 'Please select the current batch.';
    if (form.changes.length === 0) return 'At least one change is required.';
    for (let i = 0; i < form.changes.length; i++) {
      const c = form.changes[i];
      if (!c.semesterNumber || c.semesterNumber < 1)
        return `Change #${i + 1}: Invalid semester number.`;
      if (
        (c.type === 'ADD_COURSE' || c.type === 'REPLACE_COURSE') &&
        !c.courseId
      )
        return `Change #${i + 1}: Please select a course to add.`;
      if (
        (c.type === 'REMOVE_COURSE' || c.type === 'REPLACE_COURSE') &&
        !c.removedCourseId
      )
        return `Change #${i + 1}: Please select a course to remove.`;
    }
    return null;
  };

  const handleSaveDraft = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');
      const payload = {
        program: form.program,
        title: form.title.trim(),
        reason: form.reason.trim(),
        scope: form.scope,
        currentBatchId:
          form.scope === 'CURRENT_AND_FUTURE' ? form.currentBatchId : undefined,
        changes: form.changes.map((c) => ({
          type: c.type,
          semesterNumber: Number(c.semesterNumber),
          courseId: c.courseId || undefined,
          removedCourseId: c.removedCourseId || undefined,
        })),
      };

      if (isEdit) {
        await updateAmendment(id, payload);
        setSuccessMsg('Amendment updated successfully.');
      } else {
        const res = await createAmendment(payload);
        setSuccessMsg('Amendment created as draft.');
        // Navigate to edit mode for the newly created amendment
        navigate(`/program-amendments/${res.amendment._id}/edit`, {
          replace: true,
        });
      }
    } catch (err) {
      setError(
        err?.response?.data?.error || err.message || 'Failed to save amendment'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    try {
      setSaving(true);
      setError('');

      // Save first (create or update)
      let amendmentId = id;
      const payload = {
        program: form.program,
        title: form.title.trim(),
        reason: form.reason.trim(),
        scope: form.scope,
        currentBatchId:
          form.scope === 'CURRENT_AND_FUTURE' ? form.currentBatchId : undefined,
        changes: form.changes.map((c) => ({
          type: c.type,
          semesterNumber: Number(c.semesterNumber),
          courseId: c.courseId || undefined,
          removedCourseId: c.removedCourseId || undefined,
        })),
      };

      if (isEdit) {
        await updateAmendment(id, payload);
      } else {
        const res = await createAmendment(payload);
        amendmentId = res.amendment._id;
      }

      // Now submit for approval
      await submitForApproval(amendmentId);
      setSuccessMsg('Amendment submitted for approval!');
      setTimeout(() => navigate(`/program-amendments/${amendmentId}`), 800);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          'Failed to submit amendment'
      );
    } finally {
      setSaving(false);
    }
  };

  const maxSemesters = selectedProgram?.totalSemesters || 12;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/program-amendments')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Amendment' : 'New Program Amendment'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Define course changes for program batches
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Program */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Program *
          </label>
          <select
            value={form.program}
            onChange={(e) => setField('program', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Program</option>
            {programs.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} {p.code ? `(${p.code})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="e.g., Semester 4 AI Course Addition"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason
          </label>
          <textarea
            value={form.reason}
            onChange={(e) => setField('reason', e.target.value)}
            rows={3}
            placeholder="Why is this amendment being made?"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Scope */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scope *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="CURRENT_AND_FUTURE"
                checked={form.scope === 'CURRENT_AND_FUTURE'}
                onChange={(e) => setField('scope', e.target.value)}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">
                Current Batch + Future Batches
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="FUTURE_ONLY"
                checked={form.scope === 'FUTURE_ONLY'}
                onChange={(e) => setField('scope', e.target.value)}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">Future Batches Only</span>
            </label>
          </div>
        </div>

        {/* Current Batch selector */}
        {form.scope === 'CURRENT_AND_FUTURE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Batch *
            </label>
            <select
              value={form.currentBatchId}
              onChange={(e) => setField('currentBatchId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Batch</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name || `Batch ${b.year}`} — {b.status || 'N/A'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Changes */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Course Changes
          </h2>
          <button
            onClick={addChange}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Change
          </button>
        </div>

        {form.changes.map((change, idx) => (
          <div
            key={change._key}
            className="border border-gray-200 rounded-lg p-4 space-y-3 relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                Change #{idx + 1}
              </span>
              {form.changes.length > 1 && (
                <button
                  onClick={() => removeChange(idx)}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Type
                </label>
                <select
                  value={change.type}
                  onChange={(e) => updateChange(idx, 'type', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CHANGE_TYPES.map((ct) => (
                    <option key={ct.value} value={ct.value}>
                      {ct.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester Number */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Semester #
                </label>
                <select
                  value={change.semesterNumber}
                  onChange={(e) =>
                    updateChange(idx, 'semesterNumber', Number(e.target.value))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: maxSemesters }, (_, i) => i + 1).map(
                    (n) => (
                      <option key={n} value={n}>
                        Semester {n}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Spacer for alignment */}
              <div />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Course to Remove */}
              {(change.type === 'REMOVE_COURSE' ||
                change.type === 'REPLACE_COURSE') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Course to Remove
                  </label>
                  <select
                    value={change.removedCourseId}
                    onChange={(e) =>
                      updateChange(idx, 'removedCourseId', e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select course to remove</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.courseCode ? `${c.courseCode} — ` : ''}
                        {c.title} ({c.credits || 0} cr)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Course to Add */}
              {(change.type === 'ADD_COURSE' ||
                change.type === 'REPLACE_COURSE') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Course to Add
                  </label>
                  <select
                    value={change.courseId}
                    onChange={(e) =>
                      updateChange(idx, 'courseId', e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select course to add</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.courseCode ? `${c.courseCode} — ` : ''}
                        {c.title} ({c.credits || 0} cr)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          onClick={() => navigate('/program-amendments')}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Draft
        </button>
        <button
          onClick={handleSubmitForApproval}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Submit for Approval
        </button>
      </div>
    </div>
  );
};

export default CourseAmendmentForm;
