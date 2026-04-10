import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, Filter, RefreshCw, Download, ChevronRight, Clock,
  Users, Shield, BarChart3, Eye, AlertTriangle, CheckCircle2, XCircle,
  PlayCircle, Calendar, Loader2
} from 'lucide-react';
import * as examService from '../services/exam.service';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-white text-[#94A3B8]', icon: FileText },
  scheduled: { label: 'Scheduled', color: 'bg-[rgba(249,115,22,0.15)] text-[#F97316]', icon: Calendar },
  live: { label: 'Live', color: 'bg-[rgba(5,150,105,0.1)] text-[#10B981]', icon: PlayCircle },
  completed: { label: 'Completed', color: 'bg-[rgba(249,115,22,0.15)] text-[#F97316]', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]', icon: XCircle },
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
          <h1 className="text-2xl font-bold text-[#1E293B] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#F97316]" />
            Examination Management
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">Monitor and manage all exams across courses</p>
        </div>
        <button onClick={loadExams} className="flex items-center gap-2 px-4 py-2 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl text-sm font-medium text-[#94A3B8] hover:bg-white">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] p-4">
          <p className="text-2xl font-bold text-[#1E293B]">{totalExams}</p>
          <p className="text-xs text-[#94A3B8]">Total Exams</p>
        </div>
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                filterStatus === key ? 'border-[rgba(249,115,22,0.3)] bg-[rgba(249,115,22,0.1)]' : 'border-[rgba(0,0,0,0.08)] bg-white hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${filterStatus === key ? 'text-[#F97316]' : 'text-[#94A3B8]'}`} />
                <span className="text-xl font-bold text-[#1E293B]">{stats[key] || 0}</span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-1 capitalize">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exams, courses..."
            className="w-full pl-10 pr-4 py-2.5 border border-[rgba(0,0,0,0.08)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 border border-[rgba(0,0,0,0.08)] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]"
        >
          <option value="">All Types</option>
          <option value="mid_term">Mid Term</option>
          <option value="end_term">End Term</option>
          <option value="quiz">Quiz</option>
          <option value="practice">Practice</option>
          <option value="re_exam">Re-Exam</option>
        </select>
        {(filterStatus || filterType) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterType(''); }}
            className="px-3 py-2 text-xs text-[#94A3B8] hover:text-[#94A3B8]"
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
              <Loader2 className="w-8 h-8 text-[#F97316] animate-spin" />
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-16 text-[#94A3B8] text-sm bg-white rounded-xl border border-[rgba(0,0,0,0.08)]">
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
                    className={`w-full text-left bg-white rounded-xl border p-4 transition-all hover:shadow-none ${
                      isSelected ? 'border-[rgba(249,115,22,0.3)] ring-1 ring-[rgba(249,115,22,0.2)]' : 'border-[rgba(0,0,0,0.08)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-[#1E293B] truncate">{exam.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.color} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" /> {sc.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#94A3B8]">
                          {exam.course?.courseCode} — {exam.course?.title || 'Course'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-[#94A3B8]">
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
                            <span className="flex items-center gap-1 text-[#F97316]">
                              <Shield className="w-3 h-3" /> Proctored
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#94A3B8] mt-1">
                          {fmt(exam.scheduledStartTime)} — {fmt(exam.scheduledEndTime)}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${isSelected ? 'text-[#F97316]' : 'text-[#475569]'}`} />
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
                    className="px-3 py-1.5 text-xs border border-[rgba(0,0,0,0.08)] rounded-lg disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-[#94A3B8]">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs border border-[rgba(0,0,0,0.08)] rounded-lg disabled:opacity-30"
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
            <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] p-5 space-y-4 sticky top-6">
              {/* Exam Header */}
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">{selectedExam.title}</h2>
                <p className="text-sm text-[#94A3B8]">
                  {selectedExam.course?.courseCode} — {selectedExam.examType?.replace('_', ' ')}
                </p>
              </div>

              {/* Exam Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[#94A3B8] text-xs">Status</span>
                  <div className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold inline-block ${statusConfig[selectedExam.status]?.color}`}>
                    {statusConfig[selectedExam.status]?.label}
                  </div>
                </div>
                <div>
                  <span className="text-[#94A3B8] text-xs">Duration</span>
                  <p className="font-medium text-[#1E293B]">{selectedExam.duration} min</p>
                </div>
                <div>
                  <span className="text-[#94A3B8] text-xs">Questions</span>
                  <p className="font-medium text-[#1E293B]">{selectedExam.questionCount || 0}</p>
                </div>
                <div>
                  <span className="text-[#94A3B8] text-xs">Total Points</span>
                  <p className="font-medium text-[#1E293B]">{selectedExam.totalPoints}</p>
                </div>
                <div>
                  <span className="text-[#94A3B8] text-xs">Submissions</span>
                  <p className="font-medium text-[#1E293B]">{selectedExam.submissionCount || 0}</p>
                </div>
                <div>
                  <span className="text-[#94A3B8] text-xs">Proctored</span>
                  <p className={`font-medium ${selectedExam.proctoring?.enabled ? 'text-[#F97316]' : 'text-[#94A3B8]'}`}>
                    {selectedExam.proctoring?.enabled ? 'Yes' : 'No'}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-[#94A3B8] text-xs">Schedule</span>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {fmt(selectedExam.scheduledStartTime)} → {fmt(selectedExam.scheduledEndTime)}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-[#94A3B8] text-xs">Created By</span>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{selectedExam.createdBy?.name || '-'}</p>
                </div>
              </div>

              {/* Analytics (for completed/live exams) */}
              {analytics && (
                <div className="border-t border-[rgba(0,0,0,0.08)] pt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-[#1E293B] flex items-center gap-1">
                    <BarChart3 className="w-4 h-4 text-[#F97316]" /> Analytics
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-[#1E293B]">{analytics.totalSubmissions}</p>
                      <p className="text-[10px] text-[#94A3B8]">Submissions</p>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-[#1E293B]">{analytics.avgScore?.toFixed(1) || 0}</p>
                      <p className="text-[10px] text-[#94A3B8]">Avg Score</p>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-[#1E293B]">{analytics.gradedCount || 0}</p>
                      <p className="text-[10px] text-[#94A3B8]">Graded</p>
                    </div>
                  </div>
                  {analytics.proctoring && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[#94A3B8]"><Shield className="w-3 h-3 inline" /> Violations: <span className="font-bold text-[#EF4444]">{analytics.proctoring.totalViolations}</span></span>
                      <span className="text-[#94A3B8]"><AlertTriangle className="w-3 h-3 inline" /> Flagged: <span className="font-bold text-amber-600">{analytics.proctoring.flaggedCount}</span></span>
                      <span className="text-[#94A3B8]">Avg Integrity: <span className="font-bold text-[#10B981]">{analytics.proctoring.avgIntegrityScore}%</span></span>
                    </div>
                  )}
                  {analytics.gradeDistribution && Object.keys(analytics.gradeDistribution).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#94A3B8] mb-1">Grade Distribution</p>
                      <div className="flex items-end gap-1 h-16">
                        {Object.entries(analytics.gradeDistribution).map(([grade, count]) => {
                          const max = Math.max(...Object.values(analytics.gradeDistribution), 1);
                          const h = (count / max) * 100;
                          return (
                            <div key={grade} className="flex-1 flex flex-col items-center gap-0.5">
                              <span className="text-[8px] font-medium text-[#94A3B8]">{count}</span>
                              <div className="w-full bg-[#FB923C] rounded-t" style={{ height: `${Math.max(h, 6)}%` }} />
                              <span className="text-[8px] font-semibold text-[#94A3B8]">{grade}</span>
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
                  <Loader2 className="w-5 h-5 text-[#F97316] animate-spin" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t border-[rgba(0,0,0,0.08)] pt-4 flex flex-wrap gap-2">
                {selectedExam.status === 'completed' && (
                  <button
                    onClick={() => handleExport(selectedExam._id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#F97316] text-white rounded-lg text-xs font-semibold hover:bg-[#EA580C]"
                  >
                    <Download className="w-3 h-3" /> Export Results
                  </button>
                )}
                {['scheduled', 'live'].includes(selectedExam.status) && (
                  <button
                    onClick={() => handleCancel(selectedExam._id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(220,38,38,0.08)] text-[#EF4444] rounded-lg text-xs font-semibold hover:bg-[rgba(239,68,68,0.15)]"
                  >
                    <XCircle className="w-3 h-3" /> Cancel Exam
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] p-8 text-center">
              <Eye className="w-8 h-8 text-[#475569] mx-auto mb-2" />
              <p className="text-sm text-[#94A3B8]">Select an exam to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamManagement;
