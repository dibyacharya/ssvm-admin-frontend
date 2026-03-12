import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Video,
  MapPin,
  Save,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import CalendarSlotAssignmentModal from './CalendarSlotAssignmentModal';
import {
  getWeekStartMonday,
  getWeekDates,
  getDayOfWeekKey,
  getDayLabel,
  getDayShortLabel,
  formatDateKey,
  formatDateDisplay,
  getHolidayDateSet,
  getWeeklyOffDays,
  getPlanItemsByDate,
  getPlanItemTypeConfig,
  isDateInRange,
  computeWeekPreview,
} from '../../utils/timetableUtils';

/* ────────────────────────────────────────────────────────────── */
/*  UnifiedCalendarView                                          */
/* ────────────────────────────────────────────────────────────── */

const UnifiedCalendarView = ({
  semesterId,
  semesterRange = {},
  slotTemplates = [],
  expandedDateSchedule = [],
  semesterPlan = {},
  courses = [],
  teachers = [],
  subjectTeacherLookup = {},
  weeklyClassSchedule = [],
  dateClassSchedule = [],
  onAssignSlot,
  onRemoveSlot,
  onSaveWeekly,
  onSaveDate,
  onScheduleVConf,
  onResetTimetable,
  saving = false,
  savingVConf = false,
  resettingTimetable = false,
  statusMessage = '',
  statusType = '',
  onClearStatus,
  periodLabel = 'Semester',
}) => {
  /* ── State ── */
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const start = semesterRange?.startDate
      ? getWeekStartMonday(semesterRange.startDate)
      : getWeekStartMonday(new Date());
    return start || getWeekStartMonday(new Date());
  });
  const [modalState, setModalState] = useState(null); // { date, dayOfWeek, slotTemplate, currentAssignment }

  /* ── Derived Data ── */
  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  const semStart = semesterRange?.startDate ? formatDateKey(semesterRange.startDate) : '';
  const semEnd = semesterRange?.endDate ? formatDateKey(semesterRange.endDate) : '';

  const holidays = useMemo(() => getHolidayDateSet(semesterPlan), [semesterPlan]);
  const planMap = useMemo(() => getPlanItemsByDate(semesterPlan), [semesterPlan]);
  const weeklyOffDaySet = useMemo(() => getWeeklyOffDays(semesterPlan), [semesterPlan]);

  // Build a lookup: dateKey → startTime → scheduleEntry
  // Merges server data (expandedDateSchedule) with local unsaved assignments
  // (weeklyClassSchedule + dateClassSchedule) so changes appear immediately.
  const scheduleIndex = useMemo(() => {
    const idx = new Map();
    (expandedDateSchedule || []).forEach((entry) => {
      const dk = entry.date ? formatDateKey(entry.date) : '';
      if (!dk) return;
      if (!idx.has(dk)) idx.set(dk, new Map());
      const timeKey = `${entry.startTime}-${entry.endTime}`;
      if (!idx.get(dk).has(timeKey)) idx.get(dk).set(timeKey, []);
      idx.get(dk).get(timeKey).push(entry);
    });

    // Merge local assignments for the current week so they show immediately
    const localPreview = computeWeekPreview({
      weekDates,
      weeklyClassSchedule,
      dateClassSchedule,
      semesterPlan,
      slotTemplates,
    });
    localPreview.forEach(({ dateKey, slots }) => {
      if (!dateKey) return;
      slots.forEach((slot) => {
        if (!slot.course) return;
        const timeKey = `${slot.startTime}-${slot.endTime}`;
        if (!idx.has(dateKey)) idx.set(dateKey, new Map());
        // Local entries override server entries for the same date+time
        idx.get(dateKey).set(timeKey, [{
          ...slot,
          type: 'CLASS',
          date: dateKey,
        }]);
      });
    });

    return idx;
  }, [expandedDateSchedule, weekDates, weeklyClassSchedule, dateClassSchedule, semesterPlan, slotTemplates]);

  // Filter slot templates: CLASS + EXAM slots are schedulable, BREAK as dividers
  const classSlots = useMemo(
    () => slotTemplates.filter((s) => s.type === 'CLASS').sort((a, b) => (a.order || 0) - (b.order || 0)),
    [slotTemplates]
  );
  const examSlots = useMemo(
    () => slotTemplates.filter((s) => s.type === 'MID_EXAM' || s.type === 'END_EXAM').sort((a, b) => (a.order || 0) - (b.order || 0)),
    [slotTemplates]
  );
  const breakSlots = useMemo(
    () => slotTemplates.filter((s) => s.type === 'BREAK').sort((a, b) => (a.order || 0) - (b.order || 0)),
    [slotTemplates]
  );
  // All schedulable slots (for rendering rows in order)
  const allSchedulableSlots = useMemo(
    () => slotTemplates.filter((s) => s.type !== 'BREAK').sort((a, b) => (a.order || 0) - (b.order || 0)),
    [slotTemplates]
  );

  /* ── Navigation ── */
  const navigateWeek = useCallback(
    (offset) => {
      setCurrentWeekStart((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + offset * 7);
        return next;
      });
    },
    []
  );

  const goToToday = useCallback(() => {
    setCurrentWeekStart(getWeekStartMonday(new Date()));
  }, []);

  const goToStart = useCallback(() => {
    if (semesterRange?.startDate) {
      setCurrentWeekStart(getWeekStartMonday(semesterRange.startDate));
    }
  }, [semesterRange]);

  /* ── Modal Handlers ── */
  const openAssignModal = useCallback(
    (date, slot, existingEntry = null) => {
      const dayKey = getDayOfWeekKey(date);
      const dk = formatDateKey(date);
      const isDateHoliday = holidays.has(dk);
      const isWeeklyOff = weeklyOffDaySet.has(dayKey);
      const isOff = isDateHoliday || isWeeklyOff;
      const datePlanItems = planMap.get(dk) || [];
      const holidayItem = isDateHoliday ? datePlanItems.find((p) => p.type === 'HOLIDAY') : null;
      const offTitle = isDateHoliday
        ? (holidayItem?.title || 'Holiday')
        : isWeeklyOff
        ? `Weekly Off (${getDayLabel(dayKey)})`
        : '';

      setModalState({
        date,
        dayOfWeek: dayKey,
        slotTemplate: slot,
        currentAssignment: existingEntry,
        isHoliday: isOff,
        holidayTitle: offTitle,
      });
    },
    [holidays, planMap, weeklyOffDaySet]
  );

  const handleModalConfirm = useCallback(
    (assignment) => {
      if (onAssignSlot) onAssignSlot(semesterId, assignment);
      setModalState(null);
    },
    [semesterId, onAssignSlot]
  );

  const handleModalRemove = useCallback(
    (removal) => {
      if (onRemoveSlot) onRemoveSlot(semesterId, removal);
      setModalState(null);
    },
    [semesterId, onRemoveSlot]
  );

  /* ── Helpers ── */
  const getCellEntry = (dateKey, slot) => {
    const timeKey = `${slot.startTime}-${slot.endTime}`;
    const entries = scheduleIndex.get(dateKey)?.get(timeKey) || [];
    // Return first CLASS entry (ignore PLACEHOLDER/BREAK)
    return entries.find((e) => e.type === 'CLASS') || entries[0] || null;
  };

  const getCourseName = (courseId) => {
    if (!courseId) return '';
    const c = courses.find((co) => String(co._id) === String(courseId));
    return c?.courseCode || c?.title || '';
  };

  const getTeacherName = (teacherId) => {
    if (!teacherId) return '';
    const t = teachers.find((te) => String(te._id) === String(teacherId));
    return t?.user?.name || t?.name || t?.employeeId || '';
  };

  /* ── Week Info ── */
  const weekStartStr = formatDateDisplay(weekDates[0]);
  const weekEndStr = formatDateDisplay(weekDates[6]);
  const weekYear = weekDates[0]?.getFullYear() || '';

  /* ── Render ── */
  return (
    <div className="space-y-3">
      {/* ── Top Bar: Nav + Actions ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <h4 className="font-semibold text-gray-900 text-sm">
            {periodLabel} Schedule
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSaveWeekly && onSaveWeekly(semesterId)}
            disabled={saving}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
          <button
            type="button"
            onClick={() => onScheduleVConf && onScheduleVConf(semesterId)}
            disabled={savingVConf}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition"
          >
            <Video className="w-3.5 h-3.5" />
            {savingVConf ? 'Scheduling...' : 'Schedule Virtual Classes'}
          </button>
          <button
            type="button"
            onClick={() => onResetTimetable && onResetTimetable(semesterId)}
            disabled={resettingTimetable}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resettingTimetable ? 'animate-spin' : ''}`} />
            {resettingTimetable ? 'Resetting...' : 'Reset Timetable'}
          </button>
        </div>
      </div>

      {/* ── Status Message (near buttons) ── */}
      {statusMessage && (
        <div className={`flex items-center justify-between text-xs rounded-md px-3 py-2 ${
          statusType === 'error'
            ? 'text-red-700 bg-red-50 border border-red-200'
            : 'text-green-700 bg-green-50 border border-green-200'
        }`}>
          <span className="whitespace-pre-wrap flex-1">{statusMessage}</span>
          {onClearStatus && (
            <button
              type="button"
              onClick={onClearStatus}
              className="ml-2 text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* ── Week Navigation ── */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={goToStart}
            className="px-2 py-1 text-xs rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
            title={`Go to ${periodLabel.toLowerCase()} start`}
          >
            ⏮
          </button>
          <button
            onClick={() => navigateWeek(-1)}
            className="p-1 rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center">
          <span className="text-sm font-medium text-gray-800">
            {weekStartStr} — {weekEndStr}, {weekYear}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateWeek(1)}
            className="p-1 rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-2 py-1 text-xs rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Calendar Grid ── */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Column Headers (Days) */}
        <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
          {/* Time column header */}
          <div className="px-2 py-2 text-[10px] font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
            Time
          </div>
          {/* Day columns */}
          {weekDates.map((date) => {
            const dk = formatDateKey(date);
            const dayKey = getDayOfWeekKey(date);
            const isDateHoliday = holidays.has(dk);
            const isWeeklyOff = weeklyOffDaySet.has(dayKey);
            const isOff = isDateHoliday || isWeeklyOff;
            const isInRange = isDateInRange(date, semStart, semEnd);
            const datePlanItems = planMap.get(dk) || [];
            const isToday = dk === formatDateKey(new Date());

            return (
              <div
                key={dk}
                className={`px-1.5 py-2 text-center border-r border-gray-200 last:border-r-0 relative ${
                  isOff
                    ? 'bg-red-50'
                    : isToday
                    ? 'bg-blue-100 ring-2 ring-inset ring-blue-400'
                    : !isInRange
                    ? 'bg-gray-100'
                    : ''
                }`}
              >
                {isToday && (
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-500 rounded-b-sm" />
                )}
                <div className={`text-xs font-medium ${isOff ? 'text-red-700' : isToday ? 'text-blue-800 font-bold' : 'text-gray-800'}`}>
                  {getDayShortLabel(dayKey)}
                </div>
                <div className={`text-[10px] ${isOff ? 'text-red-600' : isToday ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>
                  {formatDateDisplay(date)}
                </div>
                {isToday && (
                  <span className="inline-block mt-0.5 px-1.5 py-0 text-[8px] font-bold text-white bg-blue-500 rounded-full">
                    TODAY
                  </span>
                )}
                {/* Plan item badges */}
                <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                  {datePlanItems.map((pi, i) => {
                    const cfg = getPlanItemTypeConfig(pi.type);
                    return (
                      <span
                        key={i}
                        className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dotColor}`}
                        title={`${pi.type}: ${pi.title}`}
                      />
                    );
                  })}
                </div>
                {isDateHoliday && (
                  <div className="text-[9px] text-red-600 font-medium truncate mt-0.5" title={datePlanItems.find((p) => p.type === 'HOLIDAY')?.title}>
                    {datePlanItems.find((p) => p.type === 'HOLIDAY')?.title || 'Holiday'}
                  </div>
                )}
                {isWeeklyOff && !isDateHoliday && (
                  <div className="text-[9px] text-red-500 font-medium truncate mt-0.5">
                    Off Day
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Slot Rows */}
        {classSlots.length === 0 && examSlots.length === 0 && (
          <div className="p-6 text-center text-xs text-gray-400">
            No slot templates defined. Add slot templates above to see the calendar grid.
          </div>
        )}

        {/* Render BREAK dividers + CLASS/EXAM slot rows in order */}
        {slotTemplates
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((slot, slotIdx) => {
            const isExamSlot = slot.type === 'MID_EXAM' || slot.type === 'END_EXAM';

            if (slot.type === 'BREAK') {
              return (
                <div
                  key={`break-${slotIdx}`}
                  className="grid grid-cols-8 bg-amber-50 border-b border-gray-200"
                >
                  <div className="col-span-8 px-3 py-1 text-[10px] text-amber-700 font-medium">
                    ☕ {slot.label || slot.title || 'Break'} ({slot.startTime} – {slot.endTime})
                  </div>
                </div>
              );
            }

            // EXAM slot row
            if (isExamSlot) {
              const examBg = slot.type === 'MID_EXAM' ? 'bg-orange-50' : 'bg-red-50';
              const examText = slot.type === 'MID_EXAM' ? 'text-orange-700' : 'text-red-700';
              const examLabel = slot.type === 'MID_EXAM' ? '📝 Mid Exam' : '📝 End Exam';

              return (
                <div
                  key={`exam-${slotIdx}`}
                  className={`grid grid-cols-8 border-b border-gray-200 ${examBg}`}
                >
                  {/* Time Label */}
                  <div className={`px-2 py-2 border-r border-gray-200 flex flex-col justify-center ${examBg}`}>
                    <div className={`text-[10px] font-medium ${examText}`}>
                      {slot.startTime}
                    </div>
                    <div className={`text-[10px] ${examText} opacity-70`}>
                      {slot.endTime}
                    </div>
                    <div className={`text-[9px] font-medium ${examText} truncate mt-0.5`}>
                      {examLabel}
                    </div>
                  </div>

                  {/* Day Cells — show plan items (EXAM/EVENT) matching this date+time */}
                  {weekDates.map((date) => {
                    const dk = formatDateKey(date);
                    const isInRange = isDateInRange(date, semStart, semEnd);
                    const isToday = dk === formatDateKey(new Date());

                    if (!isInRange) {
                      return (
                        <div key={dk} className={`border-r border-gray-200 last:border-r-0 ${examBg} p-1`}>
                          <div className="h-full flex items-center justify-center">
                            <span className="text-[9px] text-gray-300">—</span>
                          </div>
                        </div>
                      );
                    }

                    // Find plan items on this date that match this exam slot's time
                    const datePlanItems = planMap.get(dk) || [];
                    const matchingExams = datePlanItems.filter((pi) => {
                      if (pi.type !== 'EXAM' && pi.type !== 'EVENT') return false;
                      // Match by slot template ID or by time
                      if (pi.slotTemplateId && String(pi.slotTemplateId) === String(slot._id)) return true;
                      if (pi.startTime === slot.startTime && pi.endTime === slot.endTime) return true;
                      return false;
                    });

                    if (matchingExams.length > 0) {
                      const exam = matchingExams[0];
                      const courseName = exam.course
                        ? (courses.find((c) => String(c._id) === String(exam.course))?.courseCode || 'Course')
                        : '';

                      return (
                        <div
                          key={dk}
                          className={`border-r border-gray-200 last:border-r-0 p-1 ${
                            isToday ? 'ring-1 ring-inset ring-blue-200' : ''
                          } ${examBg}`}
                          title={`${exam.title}${courseName ? ` — ${courseName}` : ''}\n${exam.mode || ''}`}
                        >
                          <div className="min-h-[2.5rem] flex flex-col justify-center">
                            <div className={`text-[10px] font-semibold ${examText} truncate`}>
                              {exam.title || (exam.type === 'EXAM' ? 'Exam' : 'Event')}
                            </div>
                            {courseName && (
                              <div className="text-[9px] text-gray-600 truncate">{courseName}</div>
                            )}
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {exam.mode === 'PHYSICAL' && <MapPin className="w-2.5 h-2.5 text-green-600" />}
                              {exam.mode === 'VIRTUAL' && <Video className="w-2.5 h-2.5 text-purple-600" />}
                              {exam.isVconfScheduled && <CheckCircle className="w-2.5 h-2.5 text-green-500" />}
                              <span className={`text-[8px] font-bold px-1 rounded ${
                                exam.type === 'EXAM' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {exam.type === 'EXAM' ? 'E' : 'EV'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Empty exam cell
                    return (
                      <div
                        key={dk}
                        className={`border-r border-gray-200 last:border-r-0 p-1 ${examBg} ${
                          isToday ? 'ring-1 ring-inset ring-blue-200' : ''
                        }`}
                      >
                        <div className="h-full flex items-center justify-center min-h-[2.5rem]">
                          <span className={`text-[9px] ${examText} opacity-30`}>—</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            // CLASS row
            return (
              <div
                key={`slot-${slotIdx}`}
                className="grid grid-cols-8 border-b border-gray-200 last:border-b-0"
              >
                {/* Time Label */}
                <div className="px-2 py-2 border-r border-gray-200 flex flex-col justify-center">
                  <div className="text-[10px] font-medium text-gray-700">
                    {slot.startTime}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {slot.endTime}
                  </div>
                  {slot.title && (
                    <div className="text-[9px] text-gray-400 truncate mt-0.5">
                      {slot.title}
                    </div>
                  )}
                </div>

                {/* Day Cells */}
                {weekDates.map((date) => {
                  const dk = formatDateKey(date);
                  const dayKey = getDayOfWeekKey(date);
                  const isDateHoliday = holidays.has(dk);
                  const isWeeklyOff = weeklyOffDaySet.has(dayKey);
                  const isOff = isDateHoliday || isWeeklyOff;
                  const isInRange = isDateInRange(date, semStart, semEnd);
                  const entry = getCellEntry(dk, slot);
                  const hasEntry = entry && entry.type === 'CLASS' && entry.course;
                  const isToday = dk === formatDateKey(new Date());
                  const offLabel = isDateHoliday ? 'Holiday' : 'Off Day';

                  // Out of semester range
                  if (!isInRange) {
                    return (
                      <div
                        key={dk}
                        className="border-r border-gray-200 last:border-r-0 bg-gray-50 p-1"
                      >
                        <div className="h-full flex items-center justify-center">
                          <span className="text-[9px] text-gray-300">—</span>
                        </div>
                      </div>
                    );
                  }

                  // Holiday / Weekly Off cell
                  if (isOff) {
                    return (
                      <div
                        key={dk}
                        className="border-r border-gray-200 last:border-r-0 bg-red-50/60 p-1 cursor-pointer hover:bg-red-100/60 transition"
                        onClick={() => openAssignModal(date, slot, entry)}
                      >
                        <div className="h-full flex items-center justify-center min-h-[2.5rem]">
                          {hasEntry ? (
                            <div className="text-center opacity-40">
                              <div className="text-[10px] font-medium text-gray-500 line-through truncate">
                                {entry.courseLabel || getCourseName(entry.course)}
                              </div>
                              <div className="text-[9px] text-red-600">{offLabel}</div>
                            </div>
                          ) : (
                            <span className="text-[9px] text-red-400">{offLabel}</span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Normal cell with entry
                  if (hasEntry) {
                    const courseName = entry.courseLabel || getCourseName(entry.course);
                    const teacherName = entry.teacherLabel || getTeacherName(entry.teacher);
                    const isWeekly = entry.source === 'WEEKLY';

                    return (
                      <div
                        key={dk}
                        className={`border-r border-gray-200 last:border-r-0 p-1 cursor-pointer transition ${
                          isToday ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'bg-white'
                        } hover:bg-blue-50`}
                        onClick={() => openAssignModal(date, slot, entry)}
                        title={`${courseName}${teacherName ? ` — ${teacherName}` : ''}\n${entry.mode || 'VIRTUAL'}${isWeekly ? ' (Recurring)' : ' (One-time)'}`}
                      >
                        <div className="min-h-[2.5rem] flex flex-col justify-center">
                          <div className="text-[10px] font-semibold text-gray-800 truncate">
                            {courseName}
                          </div>
                          {teacherName && (
                            <div className="text-[9px] text-gray-500 truncate">
                              {teacherName}
                            </div>
                          )}
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {entry.mode === 'PHYSICAL' ? (
                              <MapPin className="w-2.5 h-2.5 text-green-600" />
                            ) : (
                              <Video className="w-2.5 h-2.5 text-blue-600" />
                            )}
                            {entry.isVconfScheduled && (
                              <CheckCircle className="w-2.5 h-2.5 text-green-500" />
                            )}
                            <span
                              className={`text-[8px] font-bold px-1 rounded ${
                                isWeekly
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}
                            >
                              {isWeekly ? 'W' : 'D'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Empty cell
                  return (
                    <div
                      key={dk}
                      className={`border-r border-gray-200 last:border-r-0 p-1 cursor-pointer transition ${
                        isToday ? 'bg-blue-50/60 ring-1 ring-inset ring-blue-200' : 'bg-white'
                      } hover:bg-gray-50`}
                      onClick={() => openAssignModal(date, slot)}
                    >
                      <div className="h-full flex items-center justify-center min-h-[2.5rem]">
                        <Plus className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="inline-block px-1 rounded bg-amber-100 text-amber-700 font-bold text-[8px]">W</span>
          <span>Recurring (Weekly)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block px-1 rounded bg-indigo-100 text-indigo-700 font-bold text-[8px]">D</span>
          <span>One-time (Date Override)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block px-1 rounded bg-orange-100 text-orange-700 font-bold text-[8px]">E</span>
          <span>Exam</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block px-1 rounded bg-blue-100 text-blue-700 font-bold text-[8px]">EV</span>
          <span>Event</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          <span>Holiday / Off Day</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded bg-orange-100 border border-orange-200" />
          <span>Mid Exam Slot</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded bg-red-100 border border-red-200" />
          <span>End Exam Slot</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span>VConf Scheduled</span>
        </div>
      </div>

      {/* ── Assignment Modal ── */}
      {modalState && (
        <CalendarSlotAssignmentModal
          date={modalState.date}
          dayOfWeek={modalState.dayOfWeek}
          slotTemplate={modalState.slotTemplate}
          currentAssignment={modalState.currentAssignment}
          courses={courses}
          teachers={teachers}
          subjectTeacherLookup={subjectTeacherLookup}
          isHoliday={modalState.isHoliday}
          holidayTitle={modalState.holidayTitle}
          onConfirm={handleModalConfirm}
          onRemove={handleModalRemove}
          onCancel={() => setModalState(null)}
        />
      )}
    </div>
  );
};

export default UnifiedCalendarView;
