import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Users, Search, X, ChevronDown, ChevronUp, Clock,
  CheckCircle2, AlertTriangle, FileText, Send, Eye,
  Loader2, UserCheck, UserX, RefreshCw, Trash2, Target,
} from 'lucide-react';
import {
  getAllAssignments, createAssignment, updateAssignment,
  deleteAssignment, finalizeAssignment,
} from '../services/qpAssignment.service';
import { getAllPaperFormats } from '../services/examPaperFormat.service';
import { getAllCourses } from '../services/courses.service';
import { getAllSemester } from '../services/semester.services';
import { getTeachers } from '../services/user.service';

const STATUS_COLORS = {
  setup: 'bg-gray-100 text-gray-700',
  preparation: 'bg-blue-100 text-blue-700',
  review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  finalized: 'bg-emerald-100 text-emerald-800',
};

const STATUS_ICONS = {
  setup: Clock,
  preparation: FileText,
  review: Eye,
  approved: CheckCircle2,
  rejected: AlertTriangle,
  finalized: Target,
};

const QuestionPaperAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [paperFormats, setPaperFormats] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [form, setForm] = useState({
    course: '',
    semester: '',
    examType: 'mid_term',
    paperFormat: '',
    preparer: '',
    setters: [],
    preparationDeadline: '',
    reviewer: '',
    reviewDeadline: '',
    requiredQuestionCount: 1,
    notes: '',
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [asnRes, courseRes, semRes, fmtRes, teachRes] = await Promise.all([
        getAllAssignments(),
        getAllCourses(),
        getAllSemester(),
        getAllPaperFormats(),
        getTeachers({ limit: 500 }),
      ]);
      setAssignments(asnRes.assignments || []);
      setCourses(courseRes.courses || courseRes || []);
      setSemesters(semRes.semesters || semRes || []);
      setPaperFormats(fmtRes.formats || []);
      setTeachers(teachRes.users || teachRes.teachers || teachRes || []);
    } catch (err) {
      showToast('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateModal = () => {
    setForm({
      course: '', semester: '', examType: 'mid_term', paperFormat: '',
      preparer: '', setters: [], preparationDeadline: '', reviewer: '', reviewDeadline: '',
      requiredQuestionCount: 1, notes: '',
    });
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!form.course || !form.paperFormat || (form.setters.length === 0 && !form.preparer) || !form.reviewer) {
      showToast('error', 'Please fill all required fields');
      return;
    }
    if (form.preparer === form.reviewer) {
      showToast('error', 'Preparer and reviewer must be different');
      return;
    }
    setSaving(true);
    try {
      await createAssignment(form);
      showToast('success', 'Assignment created');
      setShowModal(false);
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      await deleteAssignment(id);
      showToast('success', 'Assignment deleted');
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleFinalize = async (id) => {
    if (!window.confirm('Finalize this assignment? This will randomly select questions from the approved pool.')) return;
    try {
      await finalizeAssignment(id);
      showToast('success', 'Assignment finalized');
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to finalize');
    }
  };

  // When course changes, auto-populate paper format options
  const coursePaperFormats = paperFormats.filter(
    (pf) => (pf.course?._id || pf.course) === form.course && pf.isActive !== false
  );

  const handleFormatSelect = (formatId) => {
    const fmt = paperFormats.find((f) => f._id === formatId);
    setForm((p) => ({
      ...p,
      paperFormat: formatId,
      requiredQuestionCount: fmt?.totalQuestions || fmt?.sections?.reduce((s, sec) => s + (sec.numberOfQuestions || 0), 0) || 0,
    }));
  };

  const filteredAssignments = assignments.filter((a) => {
    if (filterStatus && a.overallStatus !== filterStatus) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        a.course?.name?.toLowerCase().includes(s) ||
        a.course?.code?.toLowerCase().includes(s) ||
        a.preparer?.name?.toLowerCase().includes(s) ||
        a.reviewer?.name?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Paper Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">Assign faculty for question paper preparation and review</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Assignment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by course or faculty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {Object.keys(STATUS_COLORS).map((status) => {
          const count = assignments.filter((a) => a.overallStatus === status).length;
          const Icon = STATUS_ICONS[status];
          return (
            <div
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                filterStatus === status ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-600 capitalize">{status}</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Assignment List */}
      {filteredAssignments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No assignments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((asn) => {
            const StatusIcon = STATUS_ICONS[asn.overallStatus] || Clock;
            return (
              <div key={asn._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === asn._id ? null : asn._id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${STATUS_COLORS[asn.overallStatus]}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {asn.course?.code} - {asn.course?.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {asn.examType === 'mid_term' ? 'Mid Term' : 'End Term'} | Required: {asn.requiredQuestionCount} | Target: {asn.targetQuestionCount} (3x) | Submitted: {asn.submittedQuestionCount || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[asn.overallStatus]}`}>
                      {asn.overallStatus}
                    </span>
                    {expandedId === asn._id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {expandedId === asn._id && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Preparer Info */}
                      <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-1">
                          <UserCheck className="w-4 h-4" /> Preparer
                        </h4>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-500">Name:</span> <span className="font-medium">{asn.preparer?.name || '-'}</span></p>
                          <p><span className="text-gray-500">Email:</span> {asn.preparer?.email || '-'}</p>
                          <p><span className="text-gray-500">Deadline:</span> {formatDate(asn.preparationDeadline)}</p>
                          <p><span className="text-gray-500">Status:</span>{' '}
                            <span className="capitalize font-medium">{asn.preparationStatus || '-'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Reviewer Info */}
                      <div className="bg-purple-50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-1">
                          <Eye className="w-4 h-4" /> Reviewer
                        </h4>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-500">Name:</span> <span className="font-medium">{asn.reviewer?.name || '-'}</span></p>
                          <p><span className="text-gray-500">Email:</span> {asn.reviewer?.email || '-'}</p>
                          <p><span className="text-gray-500">Deadline:</span> {formatDate(asn.reviewDeadline)}</p>
                          <p><span className="text-gray-500">Status:</span>{' '}
                            <span className="capitalize font-medium">{asn.reviewStatus || 'pending'}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Question Counts */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Question Progress</h4>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-gray-500">Required:</span>{' '}
                          <span className="font-bold text-gray-900">{asn.requiredQuestionCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Target (3x):</span>{' '}
                          <span className="font-bold text-blue-700">{asn.targetQuestionCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Submitted:</span>{' '}
                          <span className="font-bold text-purple-700">{asn.submittedQuestionCount || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Approved:</span>{' '}
                          <span className="font-bold text-green-700">{asn.approvedQuestions?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Selected:</span>{' '}
                          <span className="font-bold text-emerald-700">{asn.selectedQuestions?.length || 0}</span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((asn.submittedQuestionCount || 0) / (asn.targetQuestionCount || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {asn.notes && (
                      <div className="text-sm text-gray-600">
                        <strong>Notes:</strong> {asn.notes}
                      </div>
                    )}

                    {asn.reviewComments && (
                      <div className="text-sm text-purple-700 bg-purple-50 rounded-lg p-2">
                        <strong>Review Comments:</strong> {asn.reviewComments}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {asn.overallStatus === 'approved' && (
                        <button
                          onClick={() => handleFinalize(asn._id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                          <Target className="w-3.5 h-3.5" /> Finalize
                        </button>
                      )}
                      {!['finalized'].includes(asn.overallStatus) && (
                        <button
                          onClick={() => handleDelete(asn._id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 mb-10">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Create QP Assignment</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Course *</label>
                  <select
                    value={form.course}
                    onChange={(e) => setForm((p) => ({ ...p, course: e.target.value, paperFormat: '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select course</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Exam Type *</label>
                  <select
                    value={form.examType}
                    onChange={(e) => setForm((p) => ({ ...p, examType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="mid_term">Mid</option>
                    <option value="re_mid">ReMid</option>
                    <option value="end_term">End</option>
                    <option value="back">Back</option>
                    <option value="supplementary">Supplementary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Question Paper Format *</label>
                  <select
                    value={form.paperFormat}
                    onChange={(e) => handleFormatSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select format</option>
                    {coursePaperFormats.map((f) => (
                      <option key={f._id} value={f._id}>{f.title} ({f.totalMarks} marks)</option>
                    ))}
                  </select>
                  {form.course && coursePaperFormats.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No paper formats found for this course</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">No. of Sets</label>
                  <input
                    type="number"
                    min={1}
                    value={form.requiredQuestionCount}
                    onChange={(e) => setForm((p) => ({ ...p, requiredQuestionCount: Math.max(1, Number(e.target.value)) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Question Paper Setter & Reviewer</h3>
                <div className="space-y-4">
                  {/* Multiple Setter selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Question Paper Setter (Faculty) *</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.setters.map((setterId) => {
                        const teacher = teachers.find(t => t._id === setterId);
                        return teacher ? (
                          <span key={setterId} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs">
                            {teacher.name}
                            <button
                              type="button"
                              onClick={() => setForm(p => ({ ...p, setters: p.setters.filter(id => id !== setterId), preparer: p.setters.filter(id => id !== setterId)[0] || '' }))}
                              className="hover:text-blue-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !form.setters.includes(e.target.value)) {
                          setForm(p => ({
                            ...p,
                            setters: [...p.setters, e.target.value],
                            preparer: p.setters.length === 0 ? e.target.value : p.preparer,
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Add setter...</option>
                      {teachers.filter(t => !form.setters.includes(t._id)).map((t) => (
                        <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Question Paper Setting Deadline</label>
                      <input
                        type="date"
                        value={form.preparationDeadline}
                        onChange={(e) => setForm((p) => ({ ...p, preparationDeadline: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Review Deadline</label>
                      <input
                        type="date"
                        value={form.reviewDeadline}
                        onChange={(e) => setForm((p) => ({ ...p, reviewDeadline: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Reviewer (Faculty) *</label>
                      <select
                        value={form.reviewer}
                        onChange={(e) => setForm((p) => ({ ...p, reviewer: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Select reviewer</option>
                        {teachers.filter((t) => !form.setters.includes(t._id)).map((t) => (
                          <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                      <input
                        type="text"
                        value={form.notes}
                        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Optional notes for faculty"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg ${
          toast.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default QuestionPaperAssignments;
