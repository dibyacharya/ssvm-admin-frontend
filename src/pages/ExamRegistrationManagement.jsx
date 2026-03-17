import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Users, Search, X, ChevronDown, ChevronUp, Clock,
  CheckCircle2, AlertTriangle, Calendar, UserCheck, XCircle,
  CreditCard, Filter, RefreshCw, FileText, Shield, Eye,
} from 'lucide-react';
import {
  getAllRegistrationPeriods, createRegistrationPeriod, updateRegistrationPeriod,
  deleteRegistrationPeriod, getAllRegistrations, updateRegistrationStatus,
  bulkConfirmRegistrations, issueAdmitCards, getRegistrationStats,
} from '../services/examRegistration.service';
import { getAllCourses } from '../services/courses.service';
import { getAllSemester } from '../services/semester.services';
import { getAllExams } from '../services/exam.service';

const STATUS_COLORS = {
  registered: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
  debarred: 'bg-red-200 text-red-800',
};

const ExamRegistrationManagement = () => {
  const [activeTab, setActiveTab] = useState('periods');
  const [periods, setPeriods] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedPeriod, setExpandedPeriod] = useState(null);

  // Registration filters
  const [filterExam, setFilterExam] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [regStats, setRegStats] = useState(null);

  const [periodForm, setPeriodForm] = useState({
    title: '', examType: 'mid_term', semester: '', batch: '',
    courses: [], registrationStartDate: '', registrationEndDate: '',
    eligibilityCriteria: { minAttendancePercentage: 75, feesMustBePaid: true, checkPrerequisites: false },
    autoConfirm: false, instructions: '',
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [periodRes, courseRes, semRes, examRes] = await Promise.all([
        getAllRegistrationPeriods(),
        getAllCourses(),
        getAllSemester(),
        getAllExams(),
      ]);
      setPeriods(periodRes.periods || []);
      setCourses(courseRes.courses || courseRes || []);
      setSemesters(semRes.semesters || semRes || []);
      setExams(examRes.exams || examRes || []);
    } catch { showToast('error', 'Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  const fetchRegistrations = useCallback(async () => {
    try {
      const params = {};
      if (filterExam) params.exam = filterExam;
      if (filterStatus) params.status = filterStatus;
      const res = await getAllRegistrations(params);
      setRegistrations(res.registrations || []);

      if (filterExam) {
        const statsRes = await getRegistrationStats(filterExam);
        setRegStats(statsRes.stats || null);
      } else {
        setRegStats(null);
      }
    } catch { showToast('error', 'Failed to load registrations'); }
  }, [filterExam, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (activeTab === 'registrations') fetchRegistrations(); }, [activeTab, fetchRegistrations]);

  const openCreatePeriodModal = () => {
    setEditingPeriod(null);
    setPeriodForm({
      title: '', examType: 'mid_term', semester: '', batch: '',
      courses: [], registrationStartDate: '', registrationEndDate: '',
      eligibilityCriteria: { minAttendancePercentage: 75, feesMustBePaid: true, checkPrerequisites: false },
      autoConfirm: false, instructions: '',
    });
    setShowPeriodModal(true);
  };

  const openEditPeriodModal = (p) => {
    setEditingPeriod(p._id);
    setPeriodForm({
      title: p.title,
      examType: p.examType,
      semester: p.semester?._id || '',
      batch: p.batch?._id || '',
      courses: p.courses?.map(c => c._id) || [],
      registrationStartDate: p.registrationStartDate ? new Date(p.registrationStartDate).toISOString().split('T')[0] : '',
      registrationEndDate: p.registrationEndDate ? new Date(p.registrationEndDate).toISOString().split('T')[0] : '',
      eligibilityCriteria: p.eligibilityCriteria || { minAttendancePercentage: 75, feesMustBePaid: true, checkPrerequisites: false },
      autoConfirm: p.autoConfirm || false,
      instructions: p.instructions || '',
    });
    setShowPeriodModal(true);
  };

  const handleSavePeriod = async () => {
    if (!periodForm.title || !periodForm.registrationStartDate || !periodForm.registrationEndDate) {
      showToast('error', 'Please fill required fields');
      return;
    }
    setSaving(true);
    try {
      if (editingPeriod) {
        await updateRegistrationPeriod(editingPeriod, periodForm);
        showToast('success', 'Period updated');
      } else {
        await createRegistrationPeriod(periodForm);
        showToast('success', 'Period created');
      }
      setShowPeriodModal(false);
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDeletePeriod = async (id) => {
    if (!window.confirm('Delete this registration period?')) return;
    try {
      await deleteRegistrationPeriod(id);
      showToast('success', 'Period deleted');
      fetchData();
    } catch (err) { showToast('error', err.response?.data?.error || 'Failed to delete'); }
  };

  const handleTogglePeriodStatus = async (period) => {
    const newStatus = period.status === 'open' ? 'closed' : 'open';
    try {
      await updateRegistrationPeriod(period._id, { status: newStatus });
      showToast('success', `Period ${newStatus}`);
      fetchData();
    } catch { showToast('error', 'Failed to update status'); }
  };

  const handleStatusUpdate = async (regId, status, reason = '') => {
    try {
      await updateRegistrationStatus(regId, { status, rejectionReason: reason });
      showToast('success', `Registration ${status}`);
      fetchRegistrations();
    } catch { showToast('error', 'Failed to update'); }
  };

  const handleBulkConfirm = async () => {
    if (!filterExam) { showToast('error', 'Select an exam first'); return; }
    try {
      const res = await bulkConfirmRegistrations(filterExam);
      showToast('success', res.message);
      fetchRegistrations();
    } catch (err) { showToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleIssueAdmitCards = async () => {
    if (!filterExam) { showToast('error', 'Select an exam first'); return; }
    try {
      const res = await issueAdmitCards(filterExam);
      showToast('success', res.message);
      fetchRegistrations();
    } catch (err) { showToast('error', err.response?.data?.error || 'Failed'); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  const filteredRegs = registrations.filter((r) => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return r.student?.name?.toLowerCase().includes(s) ||
        r.student?.email?.toLowerCase().includes(s) ||
        r.studentRecord?.rollNumber?.toLowerCase().includes(s);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Registration</h1>
          <p className="text-sm text-gray-500 mt-1">Manage registration periods, student registrations and admit cards</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'periods', label: 'Registration Periods', icon: Calendar },
          { key: 'registrations', label: 'Student Registrations', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ═══ Registration Periods Tab ═══ */}
      {activeTab === 'periods' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreatePeriodModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" /> New Period
            </button>
          </div>

          {periods.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No registration periods created</p>
            </div>
          ) : (
            <div className="space-y-3">
              {periods.map((p) => (
                <div key={p._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedPeriod(expandedPeriod === p._id ? null : p._id)}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{p.title}</h3>
                        <p className="text-xs text-gray-500">
                          {p.examType === 'mid_term' ? 'Mid Term' : p.examType === 'end_term' ? 'End Term' : 'Re-Exam'} | {formatDate(p.registrationStartDate)} — {formatDate(p.registrationEndDate)} | {p.courses?.length || 0} courses
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'open' ? 'bg-green-100 text-green-700' :
                        p.status === 'closed' ? 'bg-red-100 text-red-700' :
                        p.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {p.status}
                      </span>
                      {expandedPeriod === p._id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {expandedPeriod === p._id && (
                    <div className="border-t border-gray-100 p-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-gray-500">Min Attendance:</span> <span className="font-medium">{p.eligibilityCriteria?.minAttendancePercentage || 75}%</span></div>
                        <div><span className="text-gray-500">Fee Check:</span> <span className="font-medium">{p.eligibilityCriteria?.feesMustBePaid ? 'Yes' : 'No'}</span></div>
                        <div><span className="text-gray-500">Auto Confirm:</span> <span className="font-medium">{p.autoConfirm ? 'Yes' : 'No'}</span></div>
                        <div><span className="text-gray-500">Created By:</span> <span className="font-medium">{p.createdBy?.name || '-'}</span></div>
                      </div>
                      {p.courses?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {p.courses.map((c) => (
                            <span key={c._id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{c.code}</span>
                          ))}
                        </div>
                      )}
                      {p.instructions && (
                        <div className="bg-gray-50 rounded p-2 text-sm text-gray-700">{p.instructions}</div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => handleTogglePeriodStatus(p)} className={`px-3 py-1.5 text-sm rounded-lg ${p.status === 'open' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                          {p.status === 'open' ? 'Close' : 'Open'}
                        </button>
                        <button onClick={() => openEditPeriodModal(p)} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Edit</button>
                        <button onClick={() => handleDeletePeriod(p._id)} className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Student Registrations Tab ═══ */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <select value={filterExam} onChange={(e) => setFilterExam(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Exams</option>
              {exams.map((e) => (
                <option key={e._id} value={e._id}>{e.title} ({e.examType})</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Statuses</option>
              {Object.keys(STATUS_COLORS).map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <button onClick={fetchRegistrations} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Stats */}
          {regStats && (
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
              {Object.entries(regStats).map(([key, val]) => (
                <div key={key} className="bg-white rounded-lg border p-3 text-center">
                  <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-xl font-bold text-gray-900">{val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Bulk Actions */}
          {filterExam && (
            <div className="flex gap-2">
              <button onClick={handleBulkConfirm} className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4" /> Bulk Confirm Eligible
              </button>
              <button onClick={handleIssueAdmitCards} className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <CreditCard className="w-4 h-4" /> Issue Admit Cards
              </button>
            </div>
          )}

          {/* Registration Table */}
          {filteredRegs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No registrations found</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Roll No</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Exam</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Course</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Eligible</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Admit Card</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRegs.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.student?.name}</div>
                        <div className="text-xs text-gray-500">{r.student?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.studentRecord?.rollNumber || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{r.exam?.title || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{r.course?.code || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        {r.eligibility?.isEligible ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.admitCardIssued ? (
                          <span className="text-xs text-green-700">{r.admitCardNumber}</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {r.status === 'registered' && (
                            <>
                              <button onClick={() => handleStatusUpdate(r._id, 'confirmed')} title="Confirm" className="p-1 hover:bg-green-100 rounded text-green-600"><CheckCircle2 className="w-4 h-4" /></button>
                              <button onClick={() => {
                                const reason = window.prompt('Rejection reason:');
                                if (reason !== null) handleStatusUpdate(r._id, 'rejected', reason);
                              }} title="Reject" className="p-1 hover:bg-red-100 rounded text-red-600"><XCircle className="w-4 h-4" /></button>
                            </>
                          )}
                          {r.status === 'confirmed' && !r.admitCardIssued && (
                            <button onClick={() => handleStatusUpdate(r._id, 'debarred')} title="Debar" className="p-1 hover:bg-red-100 rounded text-red-600"><Shield className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ Period Create/Edit Modal ═══ */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 mb-10">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{editingPeriod ? 'Edit' : 'Create'} Registration Period</h2>
              <button onClick={() => setShowPeriodModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                  <input
                    type="text" value={periodForm.title}
                    onChange={(e) => setPeriodForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Mid Term Exam Registration - Spring 2026"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Exam Type *</label>
                  <select value={periodForm.examType} onChange={(e) => setPeriodForm(p => ({ ...p, examType: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="mid_term">Mid Term</option>
                    <option value="end_term">End Term</option>
                    <option value="re_exam">Re-Exam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
                  <select value={periodForm.semester} onChange={(e) => setPeriodForm(p => ({ ...p, semester: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">All Semesters</option>
                    {semesters.map(s => <option key={s._id} value={s._id}>{s.name || `Semester ${s.number}`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
                  <input type="date" value={periodForm.registrationStartDate} onChange={(e) => setPeriodForm(p => ({ ...p, registrationStartDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
                  <input type="date" value={periodForm.registrationEndDate} onChange={(e) => setPeriodForm(p => ({ ...p, registrationEndDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              {/* Courses multi-select */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Courses (optional — leave empty for all)</label>
                <select
                  multiple
                  value={periodForm.courses}
                  onChange={(e) => setPeriodForm(p => ({ ...p, courses: Array.from(e.target.selectedOptions, o => o.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-28"
                >
                  {courses.map(c => <option key={c._id} value={c._id}>{c.code} - {c.name}</option>)}
                </select>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Eligibility Criteria</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Min Attendance %</label>
                    <input type="number" min={0} max={100}
                      value={periodForm.eligibilityCriteria.minAttendancePercentage}
                      onChange={(e) => setPeriodForm(p => ({ ...p, eligibilityCriteria: { ...p.eligibilityCriteria, minAttendancePercentage: Number(e.target.value) } }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={periodForm.eligibilityCriteria.feesMustBePaid}
                        onChange={(e) => setPeriodForm(p => ({ ...p, eligibilityCriteria: { ...p.eligibilityCriteria, feesMustBePaid: e.target.checked } }))}
                        className="rounded"
                      />
                      Fees Must Be Paid
                    </label>
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={periodForm.autoConfirm}
                        onChange={(e) => setPeriodForm(p => ({ ...p, autoConfirm: e.target.checked }))}
                        className="rounded"
                      />
                      Auto-Confirm Eligible
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Instructions</label>
                <textarea value={periodForm.instructions} onChange={(e) => setPeriodForm(p => ({ ...p, instructions: e.target.value }))} rows={2} placeholder="Instructions for students" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setShowPeriodModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleSavePeriod} disabled={saving} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editingPeriod ? 'Update' : 'Create'}
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

export default ExamRegistrationManagement;
