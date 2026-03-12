/**
 * Client-side timetable utilities.
 * Mirrors key backend logic for instant UI feedback before API saves.
 */

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};
const WEEKDAY_SHORT = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

/**
 * Get the day-of-week key ('monday', 'tuesday', ...) for a given date string or Date.
 */
export const getDayOfWeekKey = (dateValue) => {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return WEEKDAY_KEYS[d.getDay()] || '';
};

/**
 * Get day label from key: 'monday' → 'Monday'
 */
export const getDayLabel = (dayKey) => WEEKDAY_LABELS[dayKey] || dayKey;

/**
 * Get short day label: 'monday' → 'Mon'
 */
export const getDayShortLabel = (dayKey) => WEEKDAY_SHORT[dayKey] || dayKey;

/**
 * Format date to 'YYYY-MM-DD'.
 */
export const formatDateKey = (dateValue) => {
  if (!dateValue) return '';
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date for display: 'Mar 6'
 */
export const formatDateDisplay = (dateValue) => {
  if (!dateValue) return '';
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

/**
 * Get the Monday of the week containing the given date.
 */
export const getWeekStartMonday = (dateValue) => {
  const d = dateValue instanceof Date ? new Date(dateValue) : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // Move back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the 7 dates (Mon–Sun) starting from a given Monday.
 * Returns array of Date objects.
 */
export const getWeekDates = (mondayDate) => {
  const start = mondayDate instanceof Date ? new Date(mondayDate) : new Date(mondayDate);
  if (Number.isNaN(start.getTime())) return [];
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
};

/**
 * Extract weekly off day keys (e.g. ['sunday', 'saturday']) from semester plan.
 * Defaults to ['sunday'] if not specified.
 */
export const getWeeklyOffDays = (semesterPlan) => {
  if (!semesterPlan?.weeklyOffDays || !Array.isArray(semesterPlan.weeklyOffDays)) {
    return new Set(['sunday']);
  }
  return new Set(
    semesterPlan.weeklyOffDays.map((d) => String(d || '').toLowerCase()).filter(Boolean)
  );
};

/**
 * Extract a Set of 'YYYY-MM-DD' holiday dates from a semester plan.
 */
export const getHolidayDateSet = (semesterPlan) => {
  const holidays = new Set();
  if (!semesterPlan?.items || !Array.isArray(semesterPlan.items)) return holidays;
  semesterPlan.items.forEach((item) => {
    if (String(item?.type || '').toUpperCase() !== 'HOLIDAY') return;
    const dk = formatDateKey(item?.date);
    if (dk) holidays.add(dk);
  });
  return holidays;
};

/**
 * Build a Map of dateKey → planItems[] from semester plan.
 */
export const getPlanItemsByDate = (semesterPlan) => {
  const map = new Map();
  if (!semesterPlan?.items || !Array.isArray(semesterPlan.items)) return map;
  semesterPlan.items.forEach((item) => {
    const dk = formatDateKey(item?.date);
    if (!dk) return;
    if (!map.has(dk)) map.set(dk, []);
    map.get(dk).push({
      type: String(item.type || '').toUpperCase(),
      title: String(item.title || '').trim(),
      description: String(item.description || '').trim(),
      course: item.course || null,
      mode: item.mode || '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      examType: item.examType || '',
      slotTemplateId: item.slotTemplateId || null,
      meetingId: item.meetingId || null,
      isVconfScheduled: !!item.isVconfScheduled,
      roomNo: item.roomNo || '',
      campusNo: item.campusNo || '',
      itemId: item.itemId || '',
    });
  });
  return map;
};

/**
 * Compute a client-side preview of the expanded schedule for a single week.
 * Used for immediate UI feedback before saving to the API.
 */
export const computeWeekPreview = ({
  weekDates = [],
  weeklyClassSchedule = [],
  dateClassSchedule = [],
  semesterPlan = {},
  slotTemplates = [],
}) => {
  const holidays = getHolidayDateSet(semesterPlan);
  const planMap = getPlanItemsByDate(semesterPlan);

  // Group weekly entries by dayOfWeek
  const weeklyByDay = new Map();
  weeklyClassSchedule.forEach((entry) => {
    const dk = String(entry?.dayOfWeek || '').toLowerCase();
    if (!weeklyByDay.has(dk)) weeklyByDay.set(dk, []);
    weeklyByDay.get(dk).push(entry);
  });

  // Group date overrides by date key
  const overridesByDate = new Map();
  dateClassSchedule.forEach((entry) => {
    const dk = formatDateKey(entry?.date);
    if (!dk) return;
    if (!overridesByDate.has(dk)) overridesByDate.set(dk, []);
    overridesByDate.get(dk).push(entry);
  });

  // For each date in the week, compute what slots to display
  const result = [];
  weekDates.forEach((date) => {
    const dateKey = formatDateKey(date);
    const dayKey = getDayOfWeekKey(date);
    const isHoliday = holidays.has(dateKey);
    const datePlanItems = planMap.get(dateKey) || [];
    const holidayItem = isHoliday ? datePlanItems.find((p) => p.type === 'HOLIDAY') : null;

    const overrides = overridesByDate.get(dateKey) || [];
    const weeklyRows = weeklyByDay.get(dayKey) || [];
    const sourceRows = overrides.length > 0 ? overrides : weeklyRows;
    const sourceType = overrides.length > 0 ? 'DATE_OVERRIDE' : 'WEEKLY';

    result.push({
      date,
      dateKey,
      dayKey,
      isHoliday,
      holidayTitle: holidayItem?.title || '',
      planItems: datePlanItems,
      slots: sourceRows.map((entry) => ({
        ...entry,
        source: sourceType,
        isHoliday,
        holidayTitle: holidayItem?.title || '',
        planItems: datePlanItems,
      })),
    });
  });

  return result;
};

/**
 * Check if a date falls within the semester range (inclusive).
 */
export const isDateInRange = (dateValue, startDate, endDate) => {
  const d = formatDateKey(dateValue);
  const s = formatDateKey(startDate);
  const e = formatDateKey(endDate);
  if (!d || !s || !e) return false;
  return d >= s && d <= e;
};

/**
 * Plan item type config for UI rendering.
 */
export const PLAN_ITEM_TYPES = [
  { value: 'HOLIDAY', label: 'Holiday', color: 'bg-red-100 text-red-800 border-red-200', dotColor: 'bg-red-500' },
  { value: 'EVENT', label: 'Event', color: 'bg-blue-100 text-blue-800 border-blue-200', dotColor: 'bg-blue-500' },
  { value: 'EXAM', label: 'Exam', color: 'bg-orange-100 text-orange-800 border-orange-200', dotColor: 'bg-orange-500' },
];

export const SLOT_TEMPLATE_TYPES = [
  { value: 'CLASS', label: 'Class' },
  { value: 'BREAK', label: 'Break' },
  { value: 'MID_EXAM', label: 'Mid Exam' },
  { value: 'END_EXAM', label: 'End Exam' },
];

export const getPlanItemTypeConfig = (type) =>
  PLAN_ITEM_TYPES.find((t) => t.value === String(type || '').toUpperCase()) || PLAN_ITEM_TYPES[0];
