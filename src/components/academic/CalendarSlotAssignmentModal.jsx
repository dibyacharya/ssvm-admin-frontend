import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { getDayLabel, formatDateDisplay, formatDateKey } from '../../utils/timetableUtils';

const CLASS_MODE_OPTIONS = ['VIRTUAL', 'PHYSICAL'];

const CalendarSlotAssignmentModal = ({
  date,
  dayOfWeek,
  slotTemplate = {},
  currentAssignment = null,
  courses = [],
  teachers = [],
  subjectTeacherLookup = {},
  isHoliday = false,
  holidayTitle = '',
  onConfirm,
  onRemove,
  onCancel,
}) => {
  const isEdit = Boolean(currentAssignment);
  const dateStr = formatDateDisplay(date);
  const dayLabel = getDayLabel(dayOfWeek);

  const [course, setCourse] = useState(currentAssignment?.course || '');
  const [teacher, setTeacher] = useState(currentAssignment?.teacher || '');
  const [mode, setMode] = useState(currentAssignment?.mode || 'VIRTUAL');
  const [roomNo, setRoomNo] = useState(currentAssignment?.roomNo || '');
  const [campusNo, setCampusNo] = useState(currentAssignment?.campusNo || '');
  const [virtualLink, setVirtualLink] = useState(currentAssignment?.virtualLink || '');
  const [isRecurring, setIsRecurring] = useState(
    currentAssignment?.source === 'WEEKLY' || false
  );

  // Auto-fill teacher when course changes
  useEffect(() => {
    if (course && !teacher) {
      const mappedTeacher = subjectTeacherLookup[String(course)];
      if (mappedTeacher) setTeacher(mappedTeacher);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course]);

  const handleConfirm = () => {
    if (!course) return;
    onConfirm({
      date: formatDateKey(date),
      dayOfWeek,
      startTime: slotTemplate.startTime || '',
      endTime: slotTemplate.endTime || '',
      course,
      teacher,
      mode,
      roomNo: mode === 'PHYSICAL' ? roomNo : '',
      campusNo: mode === 'PHYSICAL' ? campusNo : '',
      virtualLink: mode === 'VIRTUAL' ? virtualLink : '',
      isRecurring,
    });
  };

  if (isHoliday) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {dayLabel}, {dateStr}
            </h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800 font-medium text-sm">🏖️ Holiday</p>
            <p className="text-red-600 text-xs mt-1">{holidayTitle || 'No classes on this day'}</p>
          </div>
          <div className="text-right">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {isEdit ? 'Edit' : 'Assign'} Class — {dayLabel}, {dateStr}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {slotTemplate.startTime || '??:??'} – {slotTemplate.endTime || '??:??'}
              {slotTemplate.title ? ` (${slotTemplate.title})` : ''}
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-3">
          {/* Course */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Course *</label>
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
            >
              <option value="">— Select Course —</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.courseCode ? `${c.courseCode} — ${c.title}` : c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Teacher</label>
            <select
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
            >
              <option value="">— Auto-fill from mapping —</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.user?.name || t.name || t.employeeId || t._id}
                </option>
              ))}
            </select>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
            <div className="flex gap-2">
              {CLASS_MODE_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition ${
                    mode === m
                      ? m === 'VIRTUAL'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setMode(m)}
                >
                  {m === 'VIRTUAL' ? '🖥️ Virtual' : '🏫 Physical'}
                </button>
              ))}
            </div>
          </div>

          {/* Physical: Room + Campus */}
          {mode === 'PHYSICAL' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Room No</label>
                <input
                  type="text"
                  value={roomNo}
                  onChange={(e) => setRoomNo(e.target.value)}
                  placeholder="Room number"
                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Campus No</label>
                <input
                  type="text"
                  value={campusNo}
                  onChange={(e) => setCampusNo(e.target.value)}
                  placeholder="Campus number"
                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                />
              </div>
            </div>
          )}

          {/* Virtual: Link */}
          {mode === 'VIRTUAL' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Virtual Link</label>
              <input
                type="text"
                value={virtualLink}
                onChange={(e) => setVirtualLink(e.target.value)}
                placeholder="Auto-filled on VConf scheduling"
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
              />
            </div>
          )}

          {/* ── Recurring Toggle ── */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-400"
              />
              <span className="text-xs font-medium text-amber-800">
                🔁 Every {dayLabel}
              </span>
            </label>
            <p className="text-[10px] text-amber-600 mt-1 ml-6">
              {isRecurring
                ? `This class will repeat every ${dayLabel} throughout the ${
                    /* periodLabel comes from parent, use dayLabel for now */
                    'period'
                  }. Holidays will be automatically skipped.`
                : `This class will only be assigned to ${dateStr} (${dayLabel}).`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div>
            {isEdit && onRemove && (
              <button
                type="button"
                onClick={() => onRemove({ date: formatDateKey(date), dayOfWeek, slotTemplate, isRecurring: currentAssignment?.source === 'WEEKLY' })}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition"
              >
                Remove
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!course}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isEdit ? 'Update' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSlotAssignmentModal;
