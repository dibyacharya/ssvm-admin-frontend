import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, Filter, RefreshCw, Download, ChevronRight, Clock,
  Users, Shield, BarChart3, Eye, AlertTriangle, CheckCircle2, XCircle,
  PlayCircle, Calendar, Loader2
} from 'lucide-react';
import * as examService from '../services/exam.service';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  live: { label: 'Live', color: 'bg-emerald-100 text-emerald-700', icon: PlayCircle },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const ExamManagement = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedExam, setSelectedExam] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => { loadExams(); }, [filterStatus, filterType, page]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 30 };
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.examType = filterType;
      const data = await examService.getAllExams(params);
      setExams(data.exams || []);
      setStats(data.stats || {});
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally { setLoading(false); }
  };

  const loadAnalytics = async (examId) => {
    try {
      setAnalyticsLoading(true);
      const data = await examService.getExamAnalytics(examId);
      setAnalytics(data.analytics);
    } catch { setAnalytics(null); }
    finally { setAnalyticsLoading(false); }
  };

  const handleExamClick = (exam) => {
    setSelectedExam(exam);
    if (['completed', 'live'].includes(exam.status)) {
      loadAnalytics(exam._id);
    } else {
      setAnalytics(null);
    }
  };

  const handleExport = async (examId) => {
    try {
      const blob = await examService.exportResults(examId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam-results-${examId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Export failed:', err); }
  };

  const handleCancel = async (examId) => {
    if (!window.confirm('Cancel this exam? In-progress submissions will be auto-submitted.')) return;
    try {
      await examService.cancelExam(examId);
      loadExams();
      setSelectedExam(null);
    } catch (err) { console.error('Cancel failed:', err); }
  };

  const filteredExams = useMemo(() => {
    if (!search) return exams;
    const q = search.toLowerCase();
    return exams.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.course?.title?.toLowerCase().includes(q) ||
      e.course?.courseCode?.toLowerCase().includes(q)
    );
  }, [exams, search]);

  const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

  const totalExams = Object.values(stats).reduce((s, v) => s + v, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Examination Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monitor and manage all exams across courses</p>
        </div>
        <button onClick={loadExams} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{totalExams}</p>
          <p className="text-xs text-gray-500">Total Exams</p>
        </div>
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                filterStatus === key ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${filterStatus === key ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className="text-xl font-bold text-gray-900">{stats[key] || 0}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 capitalize">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exams, courses..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Types</option>
          <option value="mid_term">Mid</option>
          <option value="re_mid">ReMid</option>
          <option value="end_term">End</option>
          <option value="back">Back</option>
          <option value="supplementary">Supplementary</option>
        </select>
        {(filterStatus || filterType) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterType(''); }}
            className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Exam List */}
        <div className="lg:col-span-7">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
              No exams found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExams.map((exam) => {
                const sc = statusConfig[exam.status] || statusConfig.draft;
                const StatusIcon = sc.icon;
                const isSelected = selectedExam?._id === exam._id;
                return (
                  <button
                    key={exam._id}
                    onClick={() => handleExamClick(exam)}
                    className={`w-full text-left bg-white rounded-xl border p-4 transition-all hover:shadow-sm ${
                      isSelected ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{exam.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.color} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" /> {sc.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {exam.course?.courseCode} — {exam.course?.title || 'Course'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {exam.duration}min
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {exam.questionCount || 0}Q / {exam.totalPoints}pts
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {exam.submissionCount || 0} submissions
                          </span>
                          {exam.proctoring?.enabled && (
                            <span className="flex items-center gap-1 text-purple-500">
                              <Shield className="w-3 h-3" /> Proctored
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {fmt(exam.scheduledStartTime)} — {fmt(exam.scheduledEndTime)}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${isSelected ? 'text-indigo-600' : 'text-gray-300'}`} />
                    </div>
                  </button>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-5">
          {selectedExam ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 sticky top-6">
              {/* Exam Header */}
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedExam.title}</h2>
                <p className="text-sm text-gray-500">
                  {selectedExam.course?.courseCode} — {selectedExam.examType?.replace('_', ' ')}
                </p>
              </div>

              {/* Exam Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">Status</span>
                  <div className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold inline-block ${statusConfig[selectedExam.status]?.color}`}>
                    {statusConfig[selectedExam.status]?.label}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Duration</span>
                  <p className="font-medium text-gray-900">{selectedExam.duration} min</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Questions</span>
                  <p className="font-medium text-gray-900">{selectedExam.questionCount || 0}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Total Points</span>
                  <p className="font-medium text-gray-900">{selectedExam.totalPoints}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Submissions</span>
                  <p className="font-medium text-gray-900">{selectedExam.submissionCount || 0}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Proctored</span>
                  <p className={`font-medium ${selectedExam.proctoring?.enabled ? 'text-purple-600' : 'text-gray-400'}`}>
                    {selectedExam.proctoring?.enabled ? 'Yes' : 'No'}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 text-xs">Schedule</span>
                  <p className="text-xs text-gray-700 mt-0.5">
                    {fmt(selectedExam.scheduledStartTime)} → {fmt(selectedExam.scheduledEndTime)}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 text-xs">Created By</span>
                  <p className="text-xs text-gray-700 mt-0.5">{selectedExam.createdBy?.name || '-'}</p>
                </div>
              </div>

              {/* Analytics (for completed/live exams) */}
              {analytics && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                    <BarChart3 className="w-4 h-4 text-indigo-500" /> Analytics
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-gray-900">{analytics.totalSubmissions}</p>
                      <p className="text-[10px] text-gray-500">Submissions</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-gray-900">{analytics.avgScore?.toFixed(1) || 0}</p>
                      <p className="text-[10px] text-gray-500">Avg Score</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-gray-900">{analytics.gradedCount || 0}</p>
                      <p className="text-[10px] text-gray-500">Graded</p>
                    </div>
                  </div>
                  {analytics.proctoring && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500"><Shield className="w-3 h-3 inline" /> Violations: <span className="font-bold text-red-600">{analytics.proctoring.totalViolations}</span></span>
                      <span className="text-gray-500"><AlertTriangle className="w-3 h-3 inline" /> Flagged: <span className="font-bold text-amber-600">{analytics.proctoring.flaggedCount}</span></span>
                      <span className="text-gray-500">Avg Integrity: <span className="font-bold text-emerald-600">{analytics.proctoring.avgIntegrityScore}%</span></span>
                    </div>
                  )}
                  {analytics.gradeDistribution && Object.keys(analytics.gradeDistribution).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Grade Distribution</p>
                      <div className="flex items-end gap-1 h-16">
                        {Object.entries(analytics.gradeDistribution).map(([grade, count]) => {
                          const max = Math.max(...Object.values(analytics.gradeDistribution), 1);
                          const h = (count / max) * 100;
                          return (
                            <div key={grade} className="flex-1 flex flex-col items-center gap-0.5">
                              <span className="text-[8px] font-medium text-gray-600">{count}</span>
                              <div className="w-full bg-indigo-400 rounded-t" style={{ height: `${Math.max(h, 6)}%` }} />
                              <span className="text-[8px] font-semibold text-gray-500">{grade}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {analyticsLoading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t border-gray-100 pt-4 flex flex-wrap gap-2">
                {selectedExam.status === 'completed' && (
                  <button
                    onClick={() => handleExport(selectedExam._id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                  >
                    <Download className="w-3 h-3" /> Export Results
                  </button>
                )}
                {['scheduled', 'live'].includes(selectedExam.status) && (
                  <button
                    onClick={() => handleCancel(selectedExam._id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100"
                  >
                    <XCircle className="w-3 h-3" /> Cancel Exam
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Eye className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Select an exam to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamManagement;
