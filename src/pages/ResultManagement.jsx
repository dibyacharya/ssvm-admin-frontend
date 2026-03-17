import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart3, Users, Search, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, Eye, FileText, RefreshCw, Send, Shield, Award,
  TrendingUp, AlertTriangle, X, Loader2, Play,
} from 'lucide-react';
import {
  compileResults, getAllResults, getResultById, updateResultStatus,
  bulkApproveResults, bulkPublishResults, getResultAnalytics,
} from '../services/result.service';
import { getAllSemester } from '../services/semester.services';
import { getAllExams } from '../services/exam.service';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  compiled: 'bg-blue-100 text-blue-700',
  under_review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  published: 'bg-emerald-100 text-emerald-800',
  withheld: 'bg-red-100 text-red-700',
};

const ResultManagement = () => {
  const [activeTab, setActiveTab] = useState('results');
  const [semesters, setSemesters] = useState([]);
  const [results, setResults] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [filterSemester, setFilterSemester] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [compileForm, setCompileForm] = useState({ semesterId: '', batchId: '', academicYear: '', examType: 'regular' });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [semRes] = await Promise.all([getAllSemester()]);
      setSemesters(semRes.semesters || semRes || []);
    } catch { showToast('error', 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  const fetchResults = useCallback(async () => {
    try {
      const params = {};
      if (filterSemester) params.semester = filterSemester;
      if (filterStatus) params.status = filterStatus;
      const res = await getAllResults(params);
      setResults(res.results || []);
    } catch { showToast('error', 'Failed to load results'); }
  }, [filterSemester, filterStatus]);

  const fetchAnalytics = useCallback(async () => {
    if (!filterSemester) { setAnalytics(null); return; }
    try {
      const res = await getResultAnalytics(filterSemester);
      setAnalytics(res.analytics || null);
    } catch { setAnalytics(null); }
  }, [filterSemester]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchResults(); }, [fetchResults]);
  useEffect(() => { if (activeTab === 'analytics') fetchAnalytics(); }, [activeTab, fetchAnalytics]);

  const handleCompile = async () => {
    if (!compileForm.semesterId) { showToast('error', 'Select a semester'); return; }
    setCompiling(true);
    try {
      const res = await compileResults(compileForm);
      showToast('success', res.message);
      fetchResults();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Compilation failed');
    } finally { setCompiling(false); }
  };

  const handleStatusChange = async (id, status, remarks = '') => {
    try {
      await updateResultStatus(id, { status, remarks });
      showToast('success', `Result ${status}`);
      fetchResults();
      if (selectedResult?._id === id) setSelectedResult(null);
    } catch { showToast('error', 'Failed to update status'); }
  };

  const handleBulkApprove = async () => {
    if (!filterSemester) { showToast('error', 'Select a semester first'); return; }
    try {
      const res = await bulkApproveResults(filterSemester);
      showToast('success', res.message);
      fetchResults();
    } catch (err) { showToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleBulkPublish = async () => {
    if (!filterSemester) { showToast('error', 'Select a semester first'); return; }
    if (!window.confirm('Publish all approved results? Students will be able to see them.')) return;
    try {
      const res = await bulkPublishResults(filterSemester);
      showToast('success', res.message);
      fetchResults();
    } catch (err) { showToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await getResultById(id);
      setSelectedResult(res.result);
    } catch { showToast('error', 'Failed to load detail'); }
  };

  const filteredResults = results.filter((r) => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return r.student?.name?.toLowerCase().includes(s) ||
        r.student?.email?.toLowerCase().includes(s) ||
        r.studentRecord?.rollNumber?.toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Result Management</h1>
        <p className="text-sm text-gray-500 mt-1">Compile, review, approve and publish semester results</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'results', label: 'Results', icon: FileText },
          { key: 'compile', label: 'Compile', icon: Play },
          { key: 'analytics', label: 'Analytics', icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 ${
              activeTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ═══ Results Tab ═══ */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Semesters</option>
              {semesters.map(s => <option key={s._id} value={s._id}>{s.name || `Semester ${s.number}`}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Statuses</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search student..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <button onClick={fetchResults} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Bulk Actions */}
          {filterSemester && (
            <div className="flex gap-2">
              <button onClick={handleBulkApprove} className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4" /> Bulk Approve
              </button>
              <button onClick={handleBulkPublish} className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Send className="w-4 h-4" /> Bulk Publish
              </button>
            </div>
          )}

          {filteredResults.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No results found. Compile results first.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Roll No</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Semester</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">SGPA</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Courses</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResults.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{r.student?.name}</div>
                        <div className="text-xs text-gray-500">{r.student?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.studentRecord?.rollNumber || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{r.semester?.name || `Sem ${r.semester?.number}`}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-700">{r.sgpa}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-green-700">{r.totalCoursesPassed}P</span> / <span className="text-red-600">{r.totalCoursesFailed}F</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[r.status]}`}>
                          {r.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleViewDetail(r._id)} title="View" className="p-1 hover:bg-blue-100 rounded text-blue-600">
                            <Eye className="w-4 h-4" />
                          </button>
                          {r.status === 'compiled' && (
                            <button onClick={() => handleStatusChange(r._id, 'approved')} title="Approve" className="p-1 hover:bg-green-100 rounded text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {r.status === 'approved' && (
                            <button onClick={() => handleStatusChange(r._id, 'published')} title="Publish" className="p-1 hover:bg-purple-100 rounded text-purple-600">
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {!['published', 'withheld'].includes(r.status) && (
                            <button onClick={() => handleStatusChange(r._id, 'withheld', 'Result withheld by admin')} title="Withhold" className="p-1 hover:bg-red-100 rounded text-red-600">
                              <Shield className="w-4 h-4" />
                            </button>
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

      {/* ═══ Compile Tab ═══ */}
      {activeTab === 'compile' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Compile Semester Results</h2>
          <p className="text-sm text-gray-500">Pull exam scores and course gradings to generate consolidated result sheets.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Semester *</label>
              <select value={compileForm.semesterId} onChange={(e) => setCompileForm(p => ({ ...p, semesterId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Select semester</option>
                {semesters.map(s => <option key={s._id} value={s._id}>{s.name || `Semester ${s.number}`}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
              <input type="text" value={compileForm.academicYear} onChange={(e) => setCompileForm(p => ({ ...p, academicYear: e.target.value }))} placeholder="e.g. 2025-2026" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Exam Type</label>
              <select value={compileForm.examType} onChange={(e) => setCompileForm(p => ({ ...p, examType: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="regular">Regular</option>
                <option value="supplementary">Supplementary</option>
                <option value="improvement">Improvement</option>
              </select>
            </div>
          </div>
          <button onClick={handleCompile} disabled={compiling} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
            {compiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {compiling ? 'Compiling...' : 'Compile Results'}
          </button>
        </div>
      )}

      {/* ═══ Analytics Tab ═══ */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Select Semester</option>
              {semesters.map(s => <option key={s._id} value={s._id}>{s.name || `Semester ${s.number}`}</option>)}
            </select>
            <button onClick={fetchAnalytics} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Load Analytics</button>
          </div>

          {!analytics ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Select a semester to view analytics</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Total Students', value: analytics.totalStudents, color: 'text-gray-900' },
                  { label: 'Avg SGPA', value: analytics.avgSGPA, color: 'text-blue-700' },
                  { label: 'Max SGPA', value: analytics.maxSGPA, color: 'text-green-700' },
                  { label: 'Pass %', value: `${analytics.passPercentage}%`, color: 'text-emerald-700' },
                  { label: 'Failed', value: analytics.failCount, color: 'text-red-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* SGPA Distribution */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">SGPA Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(analytics.sgpaBrackets || {}).map(([bracket, count]) => {
                    const total = analytics.totalStudents || 1;
                    const pct = ((count / total) * 100).toFixed(1);
                    return (
                      <div key={bracket} className="flex items-center gap-3">
                        <span className="text-sm w-24 text-gray-600">{bracket}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-medium w-16 text-right">{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Course Analytics */}
              {analytics.courseAnalytics?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Course-wise Performance</h3>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-600">
                        <th className="text-left py-2 font-medium">Course</th>
                        <th className="text-center py-2 font-medium">Students</th>
                        <th className="text-center py-2 font-medium">Avg %</th>
                        <th className="text-center py-2 font-medium">Pass %</th>
                        <th className="text-center py-2 font-medium">Failed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.courseAnalytics.map((c, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2"><span className="font-medium">{c.courseCode}</span> - {c.courseName}</td>
                          <td className="py-2 text-center">{c.students}</td>
                          <td className="py-2 text-center font-medium text-blue-700">{c.avgPercentage}%</td>
                          <td className="py-2 text-center text-green-700">{c.passPercentage}%</td>
                          <td className="py-2 text-center text-red-600">{c.failed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Top Performers */}
              {analytics.topPerformers?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" /> Top Performers
                  </h3>
                  <div className="space-y-2">
                    {analytics.topPerformers.map((tp, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{tp.studentName}</span>
                          <span className="text-xs text-gray-500 ml-2">{tp.rollNumber}</span>
                        </div>
                        <span className="font-bold text-blue-700">{tp.sgpa}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Result Detail Modal ═══ */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 mb-10">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedResult.student?.name}</h2>
                <p className="text-xs text-gray-500">{selectedResult.studentRecord?.rollNumber} | {selectedResult.semester?.name}</p>
              </div>
              <button onClick={() => setSelectedResult(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">SGPA</p>
                  <p className="text-2xl font-bold text-blue-700">{selectedResult.sgpa}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Passed</p>
                  <p className="text-2xl font-bold text-green-700">{selectedResult.totalCoursesPassed}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Failed</p>
                  <p className="text-2xl font-bold text-red-700">{selectedResult.totalCoursesFailed}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Credits</p>
                  <p className="text-2xl font-bold text-purple-700">{selectedResult.totalCredits}</p>
                </div>
              </div>

              {/* Course Results Table */}
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="text-left py-2 font-medium">Course</th>
                    <th className="text-center py-2 font-medium">Credits</th>
                    <th className="text-center py-2 font-medium">Mid</th>
                    <th className="text-center py-2 font-medium">End</th>
                    <th className="text-center py-2 font-medium">Total</th>
                    <th className="text-center py-2 font-medium">%</th>
                    <th className="text-center py-2 font-medium">Grade</th>
                    <th className="text-center py-2 font-medium">GP</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedResult.courseResults?.map((cr, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2">
                        <span className="font-medium">{cr.courseCode}</span>
                        <span className="text-gray-500 ml-1 text-xs">{cr.courseName}</span>
                      </td>
                      <td className="py-2 text-center">{cr.credits}</td>
                      <td className="py-2 text-center">{cr.midTermMarks ?? '-'}</td>
                      <td className="py-2 text-center">{cr.endTermMarks ?? '-'}</td>
                      <td className="py-2 text-center font-medium">{cr.totalMarks ?? '-'}</td>
                      <td className="py-2 text-center">{cr.percentage != null ? `${cr.percentage}%` : '-'}</td>
                      <td className={`py-2 text-center font-bold ${cr.grade === 'F' ? 'text-red-600' : 'text-green-700'}`}>{cr.grade || '-'}</td>
                      <td className="py-2 text-center">{cr.gradePoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedResult.remarks && (
                <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700">{selectedResult.remarks}</div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-200">
              <button onClick={() => setSelectedResult(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
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

export default ResultManagement;
