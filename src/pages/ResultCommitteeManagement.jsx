import { useState, useEffect, useCallback } from "react";
import {
  Plus, Users, Calendar, CheckCircle, XCircle, Clock, FileText,
  ChevronDown, ChevronUp, Play, Square, Send, Trash2, Eye, Edit3
} from "lucide-react";
import * as committeeService from "../services/resultCommittee.service";

const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  decisions_recorded: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

const DECISION_COLORS = {
  pending: "bg-gray-100 text-gray-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  deferred: "bg-yellow-100 text-yellow-700",
  approved_with_changes: "bg-emerald-100 text-emerald-700",
};

const DECISION_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  deferred: "Deferred",
  approved_with_changes: "Approved with Changes",
};

export default function ResultCommitteeManagement() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (type, message) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await committeeService.getAllMeetings(params);
      setMeetings(res.data || []);
    } catch (err) {
      showToast("error","Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const handleViewDetail = async (id) => {
    try {
      const res = await committeeService.getMeeting(id);
      setSelectedMeeting(res.data);
      setShowDetailModal(true);
    } catch {
      showToast("error","Failed to load meeting details");
    }
  };

  const handleStart = async (id) => {
    try {
      await committeeService.startMeeting(id);
      showToast("success","Meeting started");
      fetchMeetings();
      if (selectedMeeting?._id === id) handleViewDetail(id);
    } catch (err) {
      showToast("error",err.response?.data?.message || "Failed to start meeting");
    }
  };

  const handleComplete = async (id) => {
    try {
      await committeeService.completeMeeting(id);
      showToast("success","Meeting completed");
      fetchMeetings();
      if (selectedMeeting?._id === id) handleViewDetail(id);
    } catch (err) {
      showToast("error",err.response?.data?.message || "Failed to complete meeting");
    }
  };

  const handleFinalize = async (id) => {
    try {
      await committeeService.finalizeMeeting(id);
      showToast("success","Decisions finalized");
      fetchMeetings();
      if (selectedMeeting?._id === id) handleViewDetail(id);
    } catch (err) {
      showToast("error",err.response?.data?.message || "Failed to finalize");
    }
  };

  const handlePublish = async (id) => {
    if (!confirm("Publish all approved results to students?")) return;
    try {
      const res = await committeeService.publishApprovedResults(id);
      showToast("success",res.message || "Results published");
      fetchMeetings();
      if (selectedMeeting?._id === id) handleViewDetail(id);
    } catch (err) {
      showToast("error",err.response?.data?.message || "Failed to publish");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this meeting?")) return;
    try {
      await committeeService.deleteMeeting(id);
      showToast("success","Meeting deleted");
      fetchMeetings();
      if (selectedMeeting?._id === id) setShowDetailModal(false);
    } catch (err) {
      showToast("error",err.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Result Committee</h1>
          <p className="text-sm text-gray-500 mt-1">Schedule committee meetings, record decisions, and publish results</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> Schedule Meeting
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="decisions_recorded">Decisions Recorded</option>
        </select>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No committee meetings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((m) => (
            <MeetingCard
              key={m._id}
              meeting={m}
              onView={() => handleViewDetail(m._id)}
              onStart={() => handleStart(m._id)}
              onComplete={() => handleComplete(m._id)}
              onFinalize={() => handleFinalize(m._id)}
              onPublish={() => handlePublish(m._id)}
              onDelete={() => handleDelete(m._id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateMeetingModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchMeetings(); }}
          showToast={showToast}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={() => setShowDetailModal(false)}
          onRefresh={() => handleViewDetail(selectedMeeting._id)}
          onStart={() => handleStart(selectedMeeting._id)}
          onComplete={() => handleComplete(selectedMeeting._id)}
          onFinalize={() => handleFinalize(selectedMeeting._id)}
          onPublish={() => handlePublish(selectedMeeting._id)}
          showToast={showToast}
        />
      )}
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg ${
          toastMsg.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {toastMsg.message}
        </div>
      )}
    </div>
  );
}

function MeetingCard({ meeting, onView, onStart, onComplete, onFinalize, onPublish, onDelete }) {
  const approvedCount = meeting.agendaItems?.filter(
    (a) => a.decision === "approved" || a.decision === "approved_with_changes"
  ).length || 0;
  const totalAgenda = meeting.agendaItems?.length || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{meeting.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[meeting.status]}`}>
              {meeting.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(meeting.meetingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {meeting.members?.length || 0} members
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {totalAgenda} agenda items ({approvedCount} approved)
            </span>
            {meeting.chairperson && (
              <span>Chair: {meeting.chairperson.name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onView} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="View Details">
            <Eye className="w-4 h-4" />
          </button>
          {meeting.status === "scheduled" && (
            <button onClick={onStart} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Start Meeting">
              <Play className="w-4 h-4" />
            </button>
          )}
          {meeting.status === "in_progress" && (
            <button onClick={onComplete} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Complete Meeting">
              <Square className="w-4 h-4" />
            </button>
          )}
          {meeting.status === "completed" && (
            <button onClick={onFinalize} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Finalize Decisions">
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {meeting.status === "decisions_recorded" && (
            <button onClick={onPublish} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
              <Send className="w-3 h-3" /> Publish
            </button>
          )}
          {!["decisions_recorded"].includes(meeting.status) && (
            <button onClick={onDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateMeetingModal({ onClose, onCreated, showToast }) {
  const [form, setForm] = useState({
    title: "",
    meetingDate: "",
    chairperson: "",
    academicYear: "",
    members: [{ user: "", role: "member" }],
    agendaItems: [{ semester: "", examType: "regular" }],
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.meetingDate || !form.chairperson) {
      showToast("error","Title, date, and chairperson are required");
      return;
    }
    const validAgenda = form.agendaItems.filter((a) => a.semester);
    if (validAgenda.length === 0) {
      showToast("error","At least one agenda item with semester is required");
      return;
    }
    try {
      setSubmitting(true);
      await committeeService.createMeeting({
        ...form,
        members: form.members.filter((m) => m.user),
        agendaItems: validAgenda,
      });
      showToast("success","Meeting scheduled");
      onCreated();
    } catch (err) {
      showToast("error",err.response?.data?.message || "Failed to create meeting");
    } finally {
      setSubmitting(false);
    }
  };

  const addMember = () => setForm({ ...form, members: [...form.members, { user: "", role: "member" }] });
  const removeMember = (i) => setForm({ ...form, members: form.members.filter((_, idx) => idx !== i) });
  const updateMember = (i, field, val) => {
    const m = [...form.members];
    m[i] = { ...m[i], [field]: val };
    setForm({ ...form, members: m });
  };

  const addAgenda = () => setForm({ ...form, agendaItems: [...form.agendaItems, { semester: "", examType: "regular" }] });
  const removeAgenda = (i) => setForm({ ...form, agendaItems: form.agendaItems.filter((_, idx) => idx !== i) });
  const updateAgenda = (i, field, val) => {
    const a = [...form.agendaItems];
    a[i] = { ...a[i], [field]: val };
    setForm({ ...form, agendaItems: a });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Schedule Committee Meeting</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
              <input
                type="text" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g. Semester 4 Result Committee"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meeting Date *</label>
              <input
                type="datetime-local" value={form.meetingDate}
                onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chairperson ID *</label>
              <input
                type="text" value={form.chairperson}
                onChange={(e) => setForm({ ...form, chairperson: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="User ID of chairperson"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Academic Year</label>
              <input
                type="text" value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g. 2025-26"
              />
            </div>
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Committee Members</label>
              <button type="button" onClick={addMember} className="text-sm text-indigo-600 hover:text-indigo-700">+ Add Member</button>
            </div>
            {form.members.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text" value={m.user} placeholder="User ID"
                  onChange={(e) => updateMember(i, "user", e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <select
                  value={m.role} onChange={(e) => updateMember(i, "role", e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="member">Member</option>
                  <option value="secretary">Secretary</option>
                  <option value="observer">Observer</option>
                </select>
                <button type="button" onClick={() => removeMember(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Agenda Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Agenda Items (Semesters to Review)</label>
              <button type="button" onClick={addAgenda} className="text-sm text-indigo-600 hover:text-indigo-700">+ Add Agenda</button>
            </div>
            {form.agendaItems.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text" value={a.semester} placeholder="Semester ID"
                  onChange={(e) => updateAgenda(i, "semester", e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <select
                  value={a.examType} onChange={(e) => updateAgenda(i, "examType", e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="regular">Regular</option>
                  <option value="supplementary">Supplementary</option>
                  <option value="improvement">Improvement</option>
                </select>
                <button type="button" onClick={() => removeAgenda(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? "Scheduling..." : "Schedule Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MeetingDetailModal({ meeting, onClose, onRefresh, onStart, onComplete, onFinalize, onPublish, showToast }) {
  const [expandedAgenda, setExpandedAgenda] = useState(null);
  const [minutesText, setMinutesText] = useState(meeting.minutes || "");
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [attendees, setAttendees] = useState(
    meeting.members?.filter((m) => m.attended).map((m) => m.user?._id || m.user) || []
  );

  const toggleAttendee = (userId) => {
    setAttendees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const saveAttendance = async () => {
    try {
      await committeeService.markAttendance(meeting._id, attendees);
      showToast("success","Attendance saved");
      onRefresh();
    } catch {
      showToast("error","Failed to save attendance");
    }
  };

  const handleDecision = async (agendaIndex, decision, remarks) => {
    try {
      await committeeService.recordDecision(meeting._id, agendaIndex, { decision, remarks });
      showToast("success","Decision recorded");
      onRefresh();
    } catch (err) {
      showToast("error",err.response?.data?.message || "Failed to record decision");
    }
  };

  const saveMinutes = async () => {
    try {
      setSavingMinutes(true);
      await committeeService.recordMinutes(meeting._id, minutesText);
      showToast("success","Minutes saved");
      onRefresh();
    } catch {
      showToast("error","Failed to save minutes");
    } finally {
      setSavingMinutes(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-700 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{meeting.title}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[meeting.status]}`}>
                {meeting.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(meeting.meetingDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              {meeting.academicYear && ` | AY: ${meeting.academicYear}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            {meeting.status === "scheduled" && (
              <button onClick={onStart} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <Play className="w-4 h-4" /> Start Meeting
              </button>
            )}
            {meeting.status === "in_progress" && (
              <button onClick={onComplete} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Square className="w-4 h-4" /> Complete Meeting
              </button>
            )}
            {meeting.status === "completed" && (
              <button onClick={onFinalize} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <CheckCircle className="w-4 h-4" /> Finalize Decisions
              </button>
            )}
            {meeting.status === "decisions_recorded" && (
              <button onClick={onPublish} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <Send className="w-4 h-4" /> Publish Approved Results
              </button>
            )}
          </div>

          {/* Attendance */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Committee Members & Attendance</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {meeting.members?.map((m) => {
                const userId = m.user?._id || m.user;
                const isPresent = attendees.includes(userId);
                return (
                  <label
                    key={userId}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isPresent
                        ? "bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700"
                        : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isPresent}
                      onChange={() => toggleAttendee(userId)}
                      className="rounded text-green-600"
                      disabled={meeting.status === "decisions_recorded"}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{m.user?.name || userId}</p>
                      <p className="text-xs text-gray-500 capitalize">{m.role}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            {meeting.status !== "decisions_recorded" && (
              <button onClick={saveAttendance} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700">
                Save Attendance
              </button>
            )}
          </div>

          {/* Agenda Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Agenda Items</h3>
            <div className="space-y-3">
              {meeting.agendaItems?.map((item, idx) => (
                <AgendaItem
                  key={idx}
                  item={item}
                  index={idx}
                  expanded={expandedAgenda === idx}
                  onToggle={() => setExpandedAgenda(expandedAgenda === idx ? null : idx)}
                  onDecide={(decision, remarks) => handleDecision(idx, decision, remarks)}
                  canDecide={["in_progress", "completed"].includes(meeting.status)}
                />
              ))}
            </div>
          </div>

          {/* Minutes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Minutes of Meeting</h3>
            <textarea
              value={minutesText}
              onChange={(e) => setMinutesText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Record minutes of the meeting here..."
              disabled={meeting.status === "decisions_recorded"}
            />
            {meeting.status !== "decisions_recorded" && (
              <button
                onClick={saveMinutes}
                disabled={savingMinutes}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
              >
                {savingMinutes ? "Saving..." : "Save Minutes"}
              </button>
            )}
            {meeting.minutesRecordedBy && (
              <p className="text-xs text-gray-500 mt-1">
                Recorded by {meeting.minutesRecordedBy.name} on{" "}
                {new Date(meeting.minutesRecordedAt).toLocaleDateString("en-IN")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgendaItem({ item, index, expanded, onToggle, onDecide, canDecide }) {
  const [decision, setDecision] = useState(item.decision || "pending");
  const [remarks, setRemarks] = useState(item.remarks || "");

  return (
    <div className="border rounded-lg dark:border-gray-700 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Semester: {item.semester?.name || item.semester}
            </p>
            <p className="text-xs text-gray-500 capitalize">{item.examType} Exam</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DECISION_COLORS[item.decision]}`}>
            {DECISION_LABELS[item.decision]}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <span className="text-gray-500">{item.totalResults} results</span>
            <span className="mx-1">|</span>
            <span className="text-green-600">{item.passCount} pass</span>
            <span className="mx-1">|</span>
            <span className="text-red-600">{item.failCount} fail</span>
            <span className="mx-1">|</span>
            <span className="text-indigo-600">Avg SGPA: {item.avgSGPA}</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && canDecide && (
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Decision</label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approve</option>
                <option value="approved_with_changes">Approve with Changes</option>
                <option value="rejected">Reject</option>
                <option value="deferred">Defer</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
              <input
                type="text" value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Optional remarks..."
              />
            </div>
            <button
              onClick={() => onDecide(decision, remarks)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm whitespace-nowrap"
            >
              Record Decision
            </button>
          </div>
          {item.decidedBy && (
            <p className="text-xs text-gray-500 mt-2">
              Decided by {item.decidedBy?.name || item.decidedBy} on{" "}
              {item.decidedAt && new Date(item.decidedAt).toLocaleDateString("en-IN")}
            </p>
          )}
        </div>
      )}

      {expanded && !canDecide && item.remarks && (
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <p className="text-sm text-gray-600 dark:text-gray-400"><strong>Remarks:</strong> {item.remarks}</p>
        </div>
      )}
    </div>
  );
}
