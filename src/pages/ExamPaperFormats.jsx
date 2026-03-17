import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, FileText, Edit3, Trash2, Copy, CheckCircle2,
  ChevronDown, ChevronUp, Clock, BookOpen, Search, X, Filter,
} from 'lucide-react';
import {
  getAllPaperFormats, createPaperFormat, updatePaperFormat,
  deletePaperFormat, approvePaperFormat, clonePaperFormat,
} from '../services/examPaperFormat.service';
import { getAllCourses } from '../services/courses.service';
import { getAllSemester } from '../services/semester.services';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'long_answer', label: 'Long Answer' },
  { value: 'fill_in_blank', label: 'Fill in Blank' },
];

const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

const emptySectionTemplate = {
  sectionLabel: '',
  title: '',
  questionType: 'mcq',
  numberOfQuestions: 5,
  marksPerQuestion: 1,
  isCompulsory: true,
  choiceCount: 0,
  difficulty: { easy: 0, medium: 0, hard: 0 },
  bloomLevels: [],
  instructions: '',
};

const ExamPaperFormats = () => {
  const [formats, setFormats] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterExamType, setFilterExamType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    course: '',
    semester: '',
    examType: 'mid_term',
    title: '',
    totalMarks: 100,
    duration: 120,
    sections: [{ ...emptySectionTemplate, sectionLabel: 'A' }],
    generalInstructions: '',
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [fmtRes, courseRes, semRes] = await Promise.all([
        getAllPaperFormats(),
        getAllCourses(),
        getAllSemester(),
      ]);
      setFormats(fmtRes.formats || []);
      setCourses(courseRes.courses || courseRes || []);
      setSemesters(semRes.semesters || semRes || []);
    } catch (err) {
      showToast('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      course: '',
      semester: '',
      examType: 'mid_term',
      title: '',
      totalMarks: 100,
      duration: 120,
      sections: [{ ...emptySectionTemplate, sectionLabel: 'A' }],
      generalInstructions: '',
    });
    setShowModal(true);
  };

  const openEditModal = (fmt) => {
    setEditing(fmt._id);
    setForm({
      course: fmt.course?._id || fmt.course,
      semester: fmt.semester?._id || fmt.semester || '',
      examType: fmt.examType,
      title: fmt.title,
      totalMarks: fmt.totalMarks,
      duration: fmt.duration,
      sections: fmt.sections.map((s) => ({ ...s })),
      generalInstructions: fmt.generalInstructions || '',
    });
    setShowModal(true);
  };

  const addSection = () => {
    const nextLabel = String.fromCharCode(65 + form.sections.length); // A, B, C...
    setForm((p) => ({
      ...p,
      sections: [...p.sections, { ...emptySectionTemplate, sectionLabel: nextLabel }],
    }));
  };

  const removeSection = (idx) => {
    setForm((p) => ({
      ...p,
      sections: p.sections.filter((_, i) => i !== idx),
    }));
  };

  const updateSection = (idx, field, value) => {
    setForm((p) => {
      const updated = [...p.sections];
      if (field.startsWith('difficulty.')) {
        const key = field.split('.')[1];
        updated[idx] = { ...updated[idx], difficulty: { ...updated[idx].difficulty, [key]: Number(value) } };
      } else {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return { ...p, sections: updated };
    });
  };

  const toggleBloom = (idx, level) => {
    setForm((p) => {
      const updated = [...p.sections];
      const current = updated[idx].bloomLevels || [];
      updated[idx] = {
        ...updated[idx],
        bloomLevels: current.includes(level)
          ? current.filter((l) => l !== level)
          : [...current, level],
      };
      return { ...p, sections: updated };
    });
  };

  const handleSubmit = async () => {
    if (!form.course || !form.title || !form.sections.length) {
      showToast('error', 'Please fill required fields');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updatePaperFormat(editing, form);
        showToast('success', 'Paper format updated');
      } else {
        await createPaperFormat(form);
        showToast('success', 'Paper format created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this paper format?')) return;
    try {
      await deletePaperFormat(id);
      showToast('success', 'Paper format deactivated');
      fetchData();
    } catch (err) {
      showToast('error', 'Failed to delete');
    }
  };

  const handleApprove = async (id) => {
    try {
      await approvePaperFormat(id);
      showToast('success', 'Paper format approved');
      fetchData();
    } catch (err) {
      showToast('error', 'Failed to approve');
    }
  };

  const handleClone = async (id) => {
    const targetCourse = window.prompt('Enter target course ID to clone to:');
    if (!targetCourse) return;
    try {
      await clonePaperFormat(id, { targetCourse });
      showToast('success', 'Paper format cloned');
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to clone');
    }
  };

  const calcSectionMarks = (s) => (s.numberOfQuestions || 0) * (s.marksPerQuestion || 0);
  const calcTotalMarks = () => form.sections.reduce((sum, s) => sum + calcSectionMarks(s), 0);

  const filteredFormats = formats.filter((f) => {
    if (filterCourse && (f.course?._id || f.course) !== filterCourse) return false;
    if (filterExamType && f.examType !== filterExamType) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        f.title?.toLowerCase().includes(search) ||
        f.course?.name?.toLowerCase().includes(search) ||
        f.course?.code?.toLowerCase().includes(search)
      );
    }
    return true;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Exam Paper Formats</h1>
          <p className="text-sm text-gray-500 mt-1">Define section-wise paper patterns for courses</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Format
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>{c.code} - {c.name}</option>
          ))}
        </select>
        <select
          value={filterExamType}
          onChange={(e) => setFilterExamType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Types</option>
          <option value="mid_term">Mid Term</option>
          <option value="end_term">End Term</option>
        </select>
      </div>

      {/* Formats List */}
      {filteredFormats.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No paper formats found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFormats.map((fmt) => (
            <div key={fmt._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Card Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === fmt._id ? null : fmt._id)}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{fmt.title}</h3>
                    <p className="text-xs text-gray-500">
                      {fmt.course?.code} - {fmt.course?.name} | {fmt.examType === 'mid_term' ? 'Mid Term' : 'End Term'} | {fmt.totalMarks} marks | {fmt.duration} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {fmt.approvedBy ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Approved
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{fmt.sections?.length || 0} sections</span>
                  {expandedId === fmt._id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedId === fmt._id && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {/* Sections Table */}
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-600">
                        <th className="text-left py-2 font-medium">Section</th>
                        <th className="text-left py-2 font-medium">Title</th>
                        <th className="text-left py-2 font-medium">Type</th>
                        <th className="text-center py-2 font-medium">Qs</th>
                        <th className="text-center py-2 font-medium">Marks/Q</th>
                        <th className="text-center py-2 font-medium">Total</th>
                        <th className="text-center py-2 font-medium">Compulsory</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fmt.sections?.map((s, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2 font-bold text-blue-700">{s.sectionLabel}</td>
                          <td className="py-2 text-gray-800">{s.title}</td>
                          <td className="py-2">{QUESTION_TYPES.find((t) => t.value === s.questionType)?.label || s.questionType}</td>
                          <td className="py-2 text-center">{s.numberOfQuestions}</td>
                          <td className="py-2 text-center">{s.marksPerQuestion}</td>
                          <td className="py-2 text-center font-medium">{s.totalSectionMarks || s.numberOfQuestions * s.marksPerQuestion}</td>
                          <td className="py-2 text-center">{s.isCompulsory ? 'Yes' : `Any ${s.choiceCount}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {fmt.generalInstructions && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                      <strong>Instructions:</strong> {fmt.generalInstructions}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => openEditModal(fmt)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    {!fmt.approvedBy && (
                      <button onClick={() => handleApprove(fmt._id)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    <button onClick={() => handleClone(fmt._id)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg">
                      <Copy className="w-3.5 h-3.5" /> Clone
                    </button>
                    <button onClick={() => handleDelete(fmt._id)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" /> Deactivate
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Create/Edit Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 mb-10">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Edit Paper Format' : 'Create Paper Format'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Course *</label>
                  <select
                    value={form.course}
                    onChange={(e) => setForm((p) => ({ ...p, course: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select course</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
                  <select
                    value={form.semester}
                    onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select semester</option>
                    {semesters.map((s) => (
                      <option key={s._id} value={s._id}>{s.name || `Semester ${s.number}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Mid Term Paper - Data Structures"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Exam Type *</label>
                  <select
                    value={form.examType}
                    onChange={(e) => setForm((p) => ({ ...p, examType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="mid_term">Mid Term</option>
                    <option value="end_term">End Term</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={form.totalMarks}
                    onChange={(e) => setForm((p) => ({ ...p, totalMarks: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm((p) => ({ ...p, duration: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* General Instructions */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">General Instructions</label>
                <textarea
                  value={form.generalInstructions}
                  onChange={(e) => setForm((p) => ({ ...p, generalInstructions: e.target.value }))}
                  rows={2}
                  placeholder="Enter general instructions for the paper..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* Sections Builder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Sections</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      Calculated Total: <strong className="text-blue-700">{calcTotalMarks()}</strong> marks
                    </span>
                    <button
                      onClick={addSection}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Section
                    </button>
                  </div>
                </div>

                {form.sections.map((section, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-700">Section {section.sectionLabel || idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">= {calcSectionMarks(section)} marks</span>
                        {form.sections.length > 1 && (
                          <button onClick={() => removeSection(idx)} className="p-1 hover:bg-red-100 rounded text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Label</label>
                        <input
                          type="text"
                          value={section.sectionLabel}
                          onChange={(e) => updateSection(idx, 'sectionLabel', e.target.value)}
                          placeholder="A"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-3">
                        <label className="block text-xs text-gray-500 mb-0.5">Title</label>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(idx, 'title', e.target.value)}
                          placeholder="e.g. Multiple Choice Questions"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Question Type</label>
                        <select
                          value={section.questionType}
                          onChange={(e) => updateSection(idx, 'questionType', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        >
                          {QUESTION_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">No. of Questions</label>
                        <input
                          type="number"
                          min={1}
                          value={section.numberOfQuestions}
                          onChange={(e) => updateSection(idx, 'numberOfQuestions', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Marks/Question</label>
                        <input
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={section.marksPerQuestion}
                          onChange={(e) => updateSection(idx, 'marksPerQuestion', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-4">
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={section.isCompulsory}
                            onChange={(e) => updateSection(idx, 'isCompulsory', e.target.checked)}
                            className="rounded"
                          />
                          Compulsory
                        </label>
                      </div>
                    </div>

                    {!section.isCompulsory && (
                      <div className="w-32">
                        <label className="block text-xs text-gray-500 mb-0.5">Answer any N of</label>
                        <input
                          type="number"
                          min={1}
                          value={section.choiceCount}
                          onChange={(e) => updateSection(idx, 'choiceCount', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    )}

                    {/* Bloom Levels */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Bloom Levels</label>
                      <div className="flex flex-wrap gap-1.5">
                        {BLOOM_LEVELS.map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => toggleBloom(idx, lvl)}
                            className={`px-2 py-0.5 rounded text-xs capitalize ${
                              (section.bloomLevels || []).includes(lvl)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section Instructions */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Section Instructions</label>
                      <input
                        type="text"
                        value={section.instructions || ''}
                        onChange={(e) => updateSection(idx, 'instructions', e.target.value)}
                        placeholder="Optional section-specific instructions"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
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

export default ExamPaperFormats;
