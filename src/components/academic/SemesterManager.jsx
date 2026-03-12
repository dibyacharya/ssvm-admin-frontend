import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock3,
  Edit3,
  Plus,
  PlusCircle,
  RefreshCw,
  Save,
  Trash,
  Trash2,
  Upload,
  Download,
  Video,
  X,
  CheckCircle,
} from 'lucide-react';
import {
  getSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  getSemesterTimetable,
  getSemesterDateView,
  updateSemesterWeeklyTimetable,
  updateSemesterSlotTemplates,
  updateSemesterDateClassSchedule,
  updateSemesterPlan,
  scheduleVirtualClasses,
  resetTimetable,
  downloadTimetableTemplate,
} from '../../services/semester.services';
import TimetableUploadModal from './TimetableUploadModal';
import SlotTemplateEditor from './SlotTemplateEditor';
import SemesterPlanEditor from './SemesterPlanEditor';
import UnifiedCalendarView from './UnifiedCalendarView';
import { getCoursesForSemester, updateCourseTeachers } from '../../services/courses.service';
import { getTeachers } from '../../services/user.service';
import { getPeriodLabel } from '../../utils/periodLabel';
import { calculateEndDate } from '../../utils/dateCalculator';
import { formatDateKey } from '../../utils/timetableUtils';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  upcoming: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800',
};

const WEEK_DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const CLASS_MODE_OPTIONS = ['VIRTUAL', 'PHYSICAL'];
const SLOT_TYPE_OPTIONS = ['CLASS', 'BREAK'];
const DEFAULT_SLOT_TEMPLATES = [
  { title: 'Slot 1', type: 'CLASS', startTime: '09:00', endTime: '10:30', order: 1 },
  { title: 'Slot 2', type: 'CLASS', startTime: '10:30', endTime: '12:00', order: 2 },
  { title: 'Slot 3', type: 'CLASS', startTime: '12:00', endTime: '13:30', order: 3 },
  {
    title: 'Lunch Break',
    type: 'BREAK',
    label: 'Lunch Break',
    startTime: '13:30',
    endTime: '14:30',
    order: 4,
  },
  { title: 'Slot 4', type: 'CLASS', startTime: '14:30', endTime: '17:30', order: 5 },
  { title: 'Slot 5', type: 'CLASS', startTime: '17:00', endTime: '18:00', order: 6 },
  { title: 'Slot 6', type: 'CLASS', startTime: '18:00', endTime: '19:00', order: 7 },
];

const toInputDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  try {
    const dateOnly = toInputDate(value);
    if (!dateOnly) return 'Not set';
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return String(value);
  }
};

const calculateDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Unknown duration';
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'Unknown duration';
    }
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} weeks (${diffDays} days)`;
  } catch {
    return 'Unknown duration';
  }
};

const sumCourseCredits = (course) => {
  const directTotal = Number(course?.creditPoints?.totalCredits);
  if (Number.isFinite(directTotal) && directTotal >= 0) return directTotal;
  const lecture = Number(course?.creditPoints?.lecture) || 0;
  const tutorial = Number(course?.creditPoints?.tutorial) || 0;
  const practical = Number(course?.creditPoints?.practical) || 0;
  return lecture + tutorial + practical;
};

const getTeacherDisplayName = (teacher) => {
  if (!teacher) return '';
  return (
    teacher.name ||
    teacher.user?.name ||
    [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') ||
    teacher.email ||
    teacher.user?.email ||
    teacher._id ||
    ''
  );
};

const getTeacherEmployeeId = (teacher) => {
  if (!teacher) return '';
  return (
    teacher.employeeId ||
    teacher.user?.employeeId ||
    ''
  );
};

const getTeacherOptionLabel = (teacher) => {
  const name = getTeacherDisplayName(teacher) || teacher?.email || teacher?._id || 'Teacher';
  const employeeId = getTeacherEmployeeId(teacher);
  return employeeId ? `${name} (${employeeId})` : name;
};

const getTeacherId = (teacher) => {
  if (!teacher) return '';
  return teacher._id || teacher.teacherId || teacher.teacher || '';
};

const createEmptyWeeklyClassRow = (dayOfWeek = 'monday') => ({
  type: 'CLASS',
  label: '',
  dayOfWeek,
  startTime: '',
  endTime: '',
  course: '',
  teacher: '',
  mode: 'VIRTUAL',
  virtualLink: '',
  roomNo: '',
  campusNo: '',
});

const createEmptyDateClassRow = (defaultDate = '') => ({
  type: 'CLASS',
  label: '',
  date: defaultDate,
  startTime: '',
  endTime: '',
  course: '',
  teacher: '',
  mode: 'VIRTUAL',
  virtualLink: '',
  roomNo: '',
  campusNo: '',
});

const createEmptySlotTemplateRow = (order = 1) => ({
  title: `Slot ${order}`,
  type: 'CLASS',
  label: '',
  startTime: '',
  endTime: '',
  order,
});

const normalizeScheduleRow = (row = {}, options = {}) => {
  const isDate = Boolean(options?.isDate);
  const normalizedType = String(row?.type || 'CLASS').toUpperCase() === 'BREAK' ? 'BREAK' : 'CLASS';
  const normalizedMode =
    normalizedType === 'BREAK'
      ? ''
      : String(row?.mode || 'VIRTUAL').toUpperCase() === 'PHYSICAL'
        ? 'PHYSICAL'
        : 'VIRTUAL';
  return {
    _id: row?._id || '',
    type: normalizedType,
    label:
      normalizedType === 'BREAK'
        ? String(row?.label || row?.title || 'Lunch Break').trim() || 'Lunch Break'
        : '',
    dayOfWeek: String(row?.dayOfWeek || options?.defaultDay || 'monday').toLowerCase(),
    date: isDate ? toInputDate(row?.date || options?.defaultDate || '') : '',
    startTime: String(row?.startTime || '').trim(),
    endTime: String(row?.endTime || '').trim(),
    course: normalizedType === 'BREAK' ? '' : row?.course?._id || row?.course || '',
    teacher: normalizedType === 'BREAK' ? '' : row?.teacher?._id || row?.teacher || '',
    mode: normalizedMode,
    virtualLink: normalizedType === 'BREAK' ? '' : String(row?.virtualLink || '').trim(),
    roomNo: normalizedType === 'BREAK' ? '' : String(row?.roomNo || '').trim(),
    campusNo: normalizedType === 'BREAK' ? '' : String(row?.campusNo || '').trim(),
    vconfRoomId: normalizedType === 'BREAK' ? '' : String(row?.vconfRoomId || '').trim(),
    vconfJoinUrl: normalizedType === 'BREAK' ? '' : String(row?.vconfJoinUrl || '').trim(),
    vconfHostUrl: normalizedType === 'BREAK' ? '' : String(row?.vconfHostUrl || '').trim(),
    meetingId: normalizedType === 'BREAK' ? null : row?.meetingId || null,
    isVconfScheduled: normalizedType === 'BREAK' ? false : Boolean(row?.isVconfScheduled),
    source: row?.source || options?.source || '',
    isHoliday: Boolean(row?.isHoliday),
    isWeeklyOff: Boolean(row?.isWeeklyOff),
    holidayTitle: String(row?.holidayTitle || '').trim(),
    planItems: Array.isArray(row?.planItems) ? row.planItems : [],
    courseLabel:
      row?.course?.courseCode || row?.course?.title || row?.course?.name || '',
    teacherLabel:
      row?.teacher?.user?.name ||
      row?.teacher?.name ||
      row?.teacher?.employeeId ||
      '',
  };
};

const normalizeTimeToMinutes = (timeValue) => {
  const value = String(timeValue || '').trim();
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const normalizeSlotTemplateRow = (row = {}, index = 0) => {
  const orderValue = Number(row?.order);
  const order = Number.isFinite(orderValue) && orderValue > 0 ? orderValue : index + 1;
  const normalizedType = String(row?.type || 'CLASS').toUpperCase() === 'BREAK' ? 'BREAK' : 'CLASS';
  const fallbackLabel = normalizedType === 'BREAK' ? 'Lunch Break' : `Slot ${index + 1}`;
  return {
    _id: row?._id || '',
    type: normalizedType,
    label:
      normalizedType === 'BREAK'
        ? String(row?.label || row?.title || 'Lunch Break').trim() || 'Lunch Break'
        : '',
    title: String(row?.title || fallbackLabel).trim() || fallbackLabel,
    startTime: String(row?.startTime || '').trim(),
    endTime: String(row?.endTime || '').trim(),
    order,
  };
};

const normalizeTimetableResponse = (payload = {}, options = {}) => {
  const semesterStartDate = toInputDate(
    payload?.semesterStartDate || options?.semesterStartDate || ''
  );
  const semesterEndDate = toInputDate(
    payload?.semesterEndDate || options?.semesterEndDate || ''
  );

  const legacyWeeklySource = payload?.weeklyTimetable || {};
  const fallbackWeekly = WEEK_DAYS.flatMap((day) => {
    const rows = Array.isArray(legacyWeeklySource?.[day.key]) ? legacyWeeklySource[day.key] : [];
    return rows.map((row) =>
      normalizeScheduleRow(
        {
          ...row,
          type: 'CLASS',
          label: '',
          dayOfWeek: day.key,
          mode: row?.room ? 'PHYSICAL' : 'VIRTUAL',
          roomNo: row?.room || '',
          campusNo: '',
        },
        { defaultDay: day.key }
      )
    );
  });

  const weeklyClassSchedule = Array.isArray(payload?.weeklyClassSchedule)
    ? payload.weeklyClassSchedule.map((row) => normalizeScheduleRow(row))
    : fallbackWeekly;

  const dateClassSchedule = Array.isArray(payload?.dateClassSchedule)
    ? payload.dateClassSchedule.map((row) => normalizeScheduleRow(row, { isDate: true }))
    : [];

  const expandedDateSchedule = Array.isArray(payload?.expandedDateSchedule)
    ? payload.expandedDateSchedule.map((row) => normalizeScheduleRow(row, { isDate: true }))
    : [];

  const slotTemplates =
    Array.isArray(payload?.slotTemplates) && payload.slotTemplates.length > 0
      ? payload.slotTemplates.map((row, index) => normalizeSlotTemplateRow(row, index))
      : DEFAULT_SLOT_TEMPLATES.map((row, index) => normalizeSlotTemplateRow(row, index));

  const subjectTeacherMappings = Array.isArray(payload?.subjectTeacherMappings)
    ? payload.subjectTeacherMappings
    : [];
  const subjectTeacherLookup = subjectTeacherMappings.reduce((acc, item) => {
    const courseId = String(item?.courseId || '').trim();
    const teacherId = String(item?.teacherId || '').trim();
    if (courseId && teacherId) {
      acc[courseId] = teacherId;
    }
    return acc;
  }, {});

  const semesterPlan = payload?.semesterPlan || { startDate: null, endDate: null, items: [], weeklyOffDays: ['sunday'] };

  return {
    weeklyClassSchedule,
    dateClassSchedule,
    expandedDateSchedule,
    slotTemplates,
    subjectTeacherMappings,
    subjectTeacherLookup,
    semesterPlan,
    semesterRange: {
      startDate: semesterStartDate,
      endDate: semesterEndDate,
    },
  };
};

const createEmptyTimetableState = (semesterRange = {}) => ({
  weeklyClassSchedule: [],
  dateClassSchedule: [],
  expandedDateSchedule: [],
  slotTemplates: DEFAULT_SLOT_TEMPLATES.map((row, index) => normalizeSlotTemplateRow(row, index)),
  subjectTeacherMappings: [],
  subjectTeacherLookup: {},
  semesterPlan: { startDate: null, endDate: null, items: [], weeklyOffDays: ['sunday'] },
  semesterRange: {
    startDate: semesterRange?.semesterStartDate || semesterRange?.startDate || '',
    endDate: semesterRange?.semesterEndDate || semesterRange?.endDate || '',
  },
});

const SemesterManager = ({
  batchId,
  periodType = 'semester',
  programTotalCredits = 0,
  detailedView = false,
  allowSemesterCreation = true,
  setupWizardOnly = false,
}) => {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);
  const [updating, setUpdating] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingSemesterId, setDeletingSemesterId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    semNumber: '',
    startDate: '',
    endDate: '',
    midTermExamDate: '',
    endTermExamDate: '',
    totalCredits: '',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    semNumber: '',
    startDate: '',
    endDate: '',
    midTermExamDate: '',
    endTermExamDate: '',
    totalCredits: '',
  });

  const [expandedSemesterId, setExpandedSemesterId] = useState(null);
  const [activeDetailTabBySemester, setActiveDetailTabBySemester] = useState({});

  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teacherLoadError, setTeacherLoadError] = useState('');

  const [coursesBySemester, setCoursesBySemester] = useState({});
  const [courseLoadingBySemester, setCourseLoadingBySemester] = useState({});
  const [courseErrorsBySemester, setCourseErrorsBySemester] = useState({});

  const [teacherSelectionByCourse, setTeacherSelectionByCourse] = useState({});
  const [assigningByCourse, setAssigningByCourse] = useState({});

  const [timetableBySemester, setTimetableBySemester] = useState({});
  const [timetableLoadingBySemester, setTimetableLoadingBySemester] = useState({});
  const [timetableSavingBySemester, setTimetableSavingBySemester] = useState({});
  const [timetableErrorBySemester, setTimetableErrorBySemester] = useState({});
  const [timetableNoticeBySemester, setTimetableNoticeBySemester] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(null); // semesterId or null

  const periodLabel = getPeriodLabel(periodType);

  const resetBatchScopedState = () => {
    setSemesters([]);
    setExpandedSemesterId(null);
    setActiveDetailTabBySemester({});
    setCoursesBySemester({});
    setCourseLoadingBySemester({});
    setCourseErrorsBySemester({});
    setTeacherSelectionByCourse({});
    setAssigningByCourse({});
    setTimetableBySemester({});
    setTimetableLoadingBySemester({});
    setTimetableSavingBySemester({});
    setTimetableErrorBySemester({});
    setTimetableNoticeBySemester({});

    setError(null);
  };

  const assignedCredits = useMemo(
    () => semesters.reduce((sum, sem) => sum + (Number(sem.totalCredits) || 0), 0),
    [semesters]
  );
  const remainingCredits =
    programTotalCredits > 0 ? programTotalCredits - assignedCredits : null;

  useEffect(() => {
    resetBatchScopedState();
    if (!batchId) {
      setLoading(false);
      return;
    }
    fetchSemesters();
  }, [batchId, setupWizardOnly]);

  useEffect(() => {
    if (allowSemesterCreation) return;
    setShowCreateForm(false);
    resetCreateForm();
  }, [allowSemesterCreation]);

  useEffect(() => {
    if (!detailedView) return;
    fetchTeachers();
  }, [detailedView]);

  useEffect(() => {
    if (formData.startDate && periodType) {
      const computed = calculateEndDate(formData.startDate, periodType);
      if (computed) {
        setFormData((prev) => ({ ...prev, endDate: computed }));
      }
    }
  }, [formData.startDate, periodType]);

  useEffect(() => {
    if (editFormData.startDate && periodType) {
      const computed = calculateEndDate(editFormData.startDate, periodType);
      if (computed) {
        setEditFormData((prev) => ({ ...prev, endDate: computed }));
      }
    }
  }, [editFormData.startDate, periodType]);

  useEffect(() => {
    if (!expandedSemesterId || !detailedView) return;
    const hasCourses = Object.prototype.hasOwnProperty.call(coursesBySemester, expandedSemesterId);
    const hasTimetable = Object.prototype.hasOwnProperty.call(timetableBySemester, expandedSemesterId);
    const activeTab = activeDetailTabBySemester[expandedSemesterId] || 'COURSE';

    if (activeTab === 'COURSE' && !hasCourses) {
      fetchSemesterCourses(expandedSemesterId);
    }
    if (activeTab === 'TIMETABLE' && !hasTimetable) {
      fetchSemesterTimetable(expandedSemesterId);
    }
  }, [
    expandedSemesterId,
    detailedView,
    coursesBySemester,
    timetableBySemester,
    activeDetailTabBySemester,
  ]);

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSemesters({
        batch: batchId,
        limit: 200,
        ...(setupWizardOnly ? { setupWizardOnly: true } : {}),
      });
      const list = Array.isArray(data) ? data : data?.semesters || [];
      setSemesters(list);

      const semesterIds = new Set(list.map((sem) => sem?._id).filter(Boolean));
      const filterSemesterMap = (source = {}) =>
        Object.fromEntries(
          Object.entries(source).filter(([semesterId]) => semesterIds.has(semesterId))
        );
      const filterCourseMap = (source = {}) =>
        Object.fromEntries(
          Object.entries(source).filter(([key]) => {
            const semesterId = String(key).split(":")[0];
            return semesterIds.has(semesterId);
          })
        );

      setActiveDetailTabBySemester((prev) => filterSemesterMap(prev));
      setCoursesBySemester((prev) => filterSemesterMap(prev));
      setCourseLoadingBySemester((prev) => filterSemesterMap(prev));
      setCourseErrorsBySemester((prev) => filterSemesterMap(prev));
      setTimetableBySemester((prev) => filterSemesterMap(prev));
      setTimetableLoadingBySemester((prev) => filterSemesterMap(prev));
      setTimetableSavingBySemester((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(([key]) => {
            const semesterId = String(key).split(":")[1];
            return semesterIds.has(semesterId);
          })
        )
      );
      setTimetableErrorBySemester((prev) => filterSemesterMap(prev));
      setTimetableNoticeBySemester((prev) => filterSemesterMap(prev));
      setTeacherSelectionByCourse((prev) => filterCourseMap(prev));
      setAssigningByCourse((prev) => filterCourseMap(prev));

      if (expandedSemesterId && !list.some((sem) => sem._id === expandedSemesterId)) {
        setExpandedSemesterId(null);
      }
    } catch (err) {
      setError('Failed to fetch semester data');
      console.error('Error fetching semester data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      setTeachersLoading(true);
      setTeacherLoadError('');
      const response = await getTeachers({ page: 1, limit: 200 });
      const list = Array.isArray(response?.teachers)
        ? response.teachers
        : Array.isArray(response?.users)
          ? response.users
          : Array.isArray(response?.data)
            ? response.data
            : [];
      setTeachers(list);
      if (!list.length) {
        setTeacherLoadError('No teachers found. Add teachers first in User Management.');
      }
    } catch (err) {
      setTeachers([]);
      setTeacherLoadError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Unable to load teachers for assignment.'
      );
    } finally {
      setTeachersLoading(false);
    }
  };

  const fetchSemesterCourses = async (semesterId) => {
    if (!semesterId) return;
    setCourseLoadingBySemester((prev) => ({ ...prev, [semesterId]: true }));
    setCourseErrorsBySemester((prev) => ({ ...prev, [semesterId]: '' }));

    try {
      const response = await getCoursesForSemester(semesterId);
      const list = Array.isArray(response) ? response : response?.courses || [];
      const normalized = Array.from(
        new Map(
          (Array.isArray(list) ? list : [])
            .filter((course) => course && course._id && course.isActive !== false)
            .map((course) => [String(course._id), course])
        ).values()
      );
      const sorted = [...normalized].sort((a, b) => {
        const aCode = String(a?.courseCode || a?.title || '');
        const bCode = String(b?.courseCode || b?.title || '');
        return aCode.localeCompare(bCode);
      });

      setCoursesBySemester((prev) => ({ ...prev, [semesterId]: sorted }));
      // Keep dropdown at "+ Add Teacher" placeholder (don't pre-select assigned teacher)
      setTeacherSelectionByCourse((prev) => {
        const next = { ...prev };
        sorted.forEach((course) => {
          const key = `${semesterId}:${course._id}`;
          if (!next[key]) {
            next[key] = '';
          }
        });
        return next;
      });
    } catch (err) {
      setCoursesBySemester((prev) => ({ ...prev, [semesterId]: [] }));
      setCourseErrorsBySemester((prev) => ({
        ...prev,
        [semesterId]:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to fetch semester courses.',
      }));
    } finally {
      setCourseLoadingBySemester((prev) => ({ ...prev, [semesterId]: false }));
    }
  };

  const getSemesterRangeById = (semesterId) => {
    const semester = semesters.find((row) => String(row?._id || '') === String(semesterId || ''));
    return {
      semesterStartDate: toInputDate(semester?.startDate),
      semesterEndDate: toInputDate(semester?.endDate),
    };
  };

  const fetchSemesterTimetable = async (semesterId) => {
    if (!semesterId) return;
    setTimetableLoadingBySemester((prev) => ({ ...prev, [semesterId]: true }));
    setTimetableErrorBySemester((prev) => ({ ...prev, [semesterId]: '' }));

    try {
      const semesterRange = getSemesterRangeById(semesterId);
      const response = await getSemesterTimetable(semesterId);
      if (Array.isArray(response?.courses) && response.courses.length > 0) {
        const sanitizedCourses = Array.from(
          new Map(
            response.courses
              .filter((course) => course && course._id && course.isActive !== false)
              .map((course) => [String(course._id), course])
          ).values()
        );
        setCoursesBySemester((prev) => ({
          ...prev,
          [semesterId]: sanitizedCourses,
        }));
      }
      let normalized = normalizeTimetableResponse(response, semesterRange);
      try {
        const dateViewResponse = await getSemesterDateView(semesterId);
        if (Array.isArray(dateViewResponse?.expandedDateSchedule)) {
          normalized = {
            ...normalized,
            expandedDateSchedule: dateViewResponse.expandedDateSchedule.map((row) =>
              normalizeScheduleRow(row, { isDate: true })
            ),
          };
        }
      } catch {
        // Date-view endpoint is optional in some deployments; fall back to timetable payload.
      }
      setTimetableBySemester((prev) => ({
        ...prev,
        [semesterId]: normalized,
      }));
    } catch (err) {
      setTimetableErrorBySemester((prev) => ({
        ...prev,
        [semesterId]:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to fetch timetable data.',
      }));
    } finally {
      setTimetableLoadingBySemester((prev) => ({ ...prev, [semesterId]: false }));
    }
  };

  const toggleSemesterExpand = (semesterId) => {
    if (!detailedView) return;
    setExpandedSemesterId((prev) => {
      if (prev === semesterId) return null;
      return semesterId;
    });
    setActiveDetailTabBySemester((prev) => ({
      ...prev,
      [semesterId]: prev[semesterId] || 'COURSE',
    }));
  };

  const handleSemesterTabChange = (semesterId, tabKey) => {
    setActiveDetailTabBySemester((prev) => ({
      ...prev,
      [semesterId]: tabKey,
    }));
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (event) => {
    const { name, value } = event.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetCreateForm = () => {
    setFormData({
      name: '',
      semNumber: '',
      startDate: '',
      endDate: '',
      midTermExamDate: '',
      endTermExamDate: '',
      totalCredits: '',
    });
  };

  const handleCreateSemester = async (event) => {
    event.preventDefault();

    const newCredits = Number(formData.totalCredits) || 0;
    if (
      programTotalCredits > 0 &&
      newCredits > 0 &&
      assignedCredits + newCredits > programTotalCredits
    ) {
      setError(
        `Adding ${newCredits} credits would exceed program total of ${programTotalCredits} (currently assigned: ${assignedCredits}).`
      );
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const payload = {
        name: formData.name,
        semNumber: Number(formData.semNumber),
        startDate: formData.startDate,
        endDate: formData.endDate,
        batch: batchId,
      };

      if (formData.midTermExamDate) {
        payload.midTermExamDate = formData.midTermExamDate;
      }
      if (formData.endTermExamDate) {
        payload.endTermExamDate = formData.endTermExamDate;
      }
      if (formData.totalCredits) {
        payload.totalCredits = Number(formData.totalCredits);
      }

      await createSemester(payload);
      await fetchSemesters();
      resetCreateForm();
      setShowCreateForm(false);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create semester');
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (semester) => {
    setEditingSemester(semester);
    setEditFormData({
      name: semester.name || '',
      semNumber: semester.semNumber?.toString() || '',
      startDate: toInputDate(semester.startDate),
      endDate: toInputDate(semester.endDate),
      midTermExamDate: toInputDate(semester.midTermExamDate),
      endTermExamDate: toInputDate(semester.endTermExamDate),
      totalCredits: semester.totalCredits?.toString() || '',
    });
    setShowEditForm(true);
  };

  const handleUpdateSemester = async (event) => {
    event.preventDefault();

    const newCredits = Number(editFormData.totalCredits) || 0;
    const oldCredits = Number(editingSemester?.totalCredits) || 0;
    const projectedAssignedCredits = assignedCredits - oldCredits + newCredits;
    if (
      programTotalCredits > 0 &&
      newCredits > 0 &&
      projectedAssignedCredits > programTotalCredits
    ) {
      setError(
        `Setting ${newCredits} credits would exceed program total of ${programTotalCredits} (other semesters: ${assignedCredits - oldCredits}).`
      );
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      const payload = {
        name: editFormData.name,
        semNumber: Number(editFormData.semNumber),
        startDate: editFormData.startDate,
        endDate: editFormData.endDate,
        batch: batchId,
      };

      if (editFormData.midTermExamDate) {
        payload.midTermExamDate = editFormData.midTermExamDate;
      }
      if (editFormData.endTermExamDate) {
        payload.endTermExamDate = editFormData.endTermExamDate;
      }
      if (editFormData.totalCredits) {
        payload.totalCredits = Number(editFormData.totalCredits);
      }

      await updateSemester(editingSemester._id, payload);
      setShowEditForm(false);
      setEditingSemester(null);
      await fetchSemesters();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to update semester');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (semesterId) => {
    setDeletingSemesterId(semesterId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      await deleteSemester(deletingSemesterId);
      const deletedSemesterId = deletingSemesterId;
      setShowDeleteConfirm(false);
      setDeletingSemesterId(null);
      setCoursesBySemester((prev) => {
        const next = { ...prev };
        delete next[deletedSemesterId];
        return next;
      });
      setCourseLoadingBySemester((prev) => {
        const next = { ...prev };
        delete next[deletedSemesterId];
        return next;
      });
      setCourseErrorsBySemester((prev) => {
        const next = { ...prev };
        delete next[deletedSemesterId];
        return next;
      });
      setActiveDetailTabBySemester((prev) => {
        const next = { ...prev };
        delete next[deletedSemesterId];
        return next;
      });
      setTimetableBySemester((prev) => {
        const next = { ...prev };
        delete next[deletedSemesterId];
        return next;
      });
      setTimetableLoadingBySemester((prev) => {
        const next = { ...prev };
        delete next[deletedSemesterId];
        return next;
      });
      setTimetableErrorBySemester((prev) => {
        const next = { ...prev };
        delete next[deletedSemesterId];
        return next;
      });
      setTimetableNoticeBySemester((prev) => {
        const next = { ...prev };
        delete next[deletedSemesterId];
        return next;
      });
      setTeacherSelectionByCourse((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(
            ([key]) => String(key).split(":")[0] !== deletedSemesterId
          )
        )
      );
      setAssigningByCourse((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(
            ([key]) => String(key).split(":")[0] !== deletedSemesterId
          )
        )
      );
      setTimetableSavingBySemester((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(
            ([key]) =>
              !String(key).endsWith(`:${deletedSemesterId}`)
          )
        )
      );
      await fetchSemesters();
      if (expandedSemesterId === deletedSemesterId) {
        setExpandedSemesterId(null);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to delete semester');
    } finally {
      setDeleting(false);
    }
  };

  const handleTeacherSelection = (semesterId, courseId, teacherId) => {
    setTeacherSelectionByCourse((prev) => ({
      ...prev,
      [`${semesterId}:${courseId}`]: teacherId,
    }));
  };

  const handleAssignTeacher = async (semesterId, course, selectedTeacherId = '', roleLabel = 'Teacher') => {
    const selectionKey = `${semesterId}:${course._id}`;
    const teacherId = selectedTeacherId || teacherSelectionByCourse[selectionKey];
    if (!teacherId) {
      setCourseErrorsBySemester((prev) => ({
        ...prev,
        [semesterId]: 'Select a teacher before assigning.',
      }));
      return;
    }

    // Build new list: keep existing teachers + add new one (skip duplicates)
    const existingTeachers = Array.isArray(course.assignedTeachers)
      ? course.assignedTeachers
          .map((t) => ({
            teacherId: String(getTeacherId(t)),
            roleLabel: t?.roleLabel || 'Teacher',
          }))
          .filter((t) => t.teacherId)
      : [];
    const alreadyExists = existingTeachers.some((t) => t.teacherId === String(teacherId));
    if (alreadyExists) {
      setCourseErrorsBySemester((prev) => ({
        ...prev,
        [semesterId]: 'This teacher is already assigned to this course.',
      }));
      return;
    }
    const updatedTeachers = [...existingTeachers, { teacherId, roleLabel }];

    try {
      setAssigningByCourse((prev) => ({ ...prev, [selectionKey]: true }));
      setCourseErrorsBySemester((prev) => ({ ...prev, [semesterId]: '' }));

      await updateCourseTeachers(semesterId, course._id, updatedTeachers);

      await fetchSemesterCourses(semesterId);
      if (Object.prototype.hasOwnProperty.call(timetableBySemester, semesterId)) {
        await fetchSemesterTimetable(semesterId);
      }
      // Reset dropdown selection
      handleTeacherSelection(semesterId, course._id, '');
      setCourseErrorsBySemester((prev) => ({
        ...prev,
        [semesterId]: 'Teacher assignment updated successfully.',
      }));
    } catch (err) {
      setCourseErrorsBySemester((prev) => ({
        ...prev,
        [semesterId]:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to assign teacher.',
      }));
    } finally {
      setAssigningByCourse((prev) => ({ ...prev, [selectionKey]: false }));
    }
  };

  const handleRemoveTeacher = async (semesterId, course, removeTeacherId) => {
    const selectionKey = `${semesterId}:${course._id}`;
    const existingTeachers = Array.isArray(course.assignedTeachers)
      ? course.assignedTeachers
          .map((t) => ({
            teacherId: String(getTeacherId(t)),
            roleLabel: t?.roleLabel || 'Teacher',
          }))
          .filter((t) => t.teacherId)
      : [];
    const updatedTeachers = existingTeachers.filter(
      (t) => t.teacherId !== String(removeTeacherId)
    );

    try {
      setAssigningByCourse((prev) => ({ ...prev, [selectionKey]: true }));
      setCourseErrorsBySemester((prev) => ({ ...prev, [semesterId]: '' }));

      await updateCourseTeachers(semesterId, course._id, updatedTeachers);

      await fetchSemesterCourses(semesterId);
      setCourseErrorsBySemester((prev) => ({
        ...prev,
        [semesterId]: 'Teacher removed successfully.',
      }));
    } catch (err) {
      setCourseErrorsBySemester((prev) => ({
        ...prev,
        [semesterId]:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to remove teacher.',
      }));
    } finally {
      setAssigningByCourse((prev) => ({ ...prev, [selectionKey]: false }));
    }
  };

  const getTimetableEntry = (stateMap, semesterId) =>
    stateMap?.[semesterId] || createEmptyTimetableState(getSemesterRangeById(semesterId));

  const sanitizeScheduleRows = ({ rows = [], isDate = false, semesterRange = {} }) => {
    const cleanedRows = [];
    (rows || []).forEach((row, index) => {
      const normalized = normalizeScheduleRow(row, {
        isDate,
        defaultDate: semesterRange?.startDate || '',
      });
      const hasValue = [
        normalized.label,
        normalized.startTime,
        normalized.endTime,
        normalized.course,
        normalized.teacher,
        normalized.virtualLink,
        normalized.roomNo,
        normalized.campusNo,
        isDate ? normalized.date : '',
      ]
        .map((value) => String(value || '').trim())
        .some(Boolean);

      if (!hasValue) return;

      const startMinutes = normalizeTimeToMinutes(normalized.startTime);
      const endMinutes = normalizeTimeToMinutes(normalized.endTime);
      if (startMinutes === null || endMinutes === null) {
        throw new Error(`Row ${index + 1}: start/end time must be in HH:mm format`);
      }
      if (startMinutes >= endMinutes) {
        throw new Error(`Row ${index + 1}: start time must be earlier than end time`);
      }

      if (normalized.type === 'CLASS') {
        // virtualLink is optional for VIRTUAL mode — auto-filled when scheduling VConf classes
        if (normalized.mode === 'PHYSICAL' && (!normalized.roomNo || !normalized.campusNo)) {
          throw new Error(`Row ${index + 1}: room no and campus no are required for physical classes`);
        }
      }

      if (isDate) {
        if (!normalized.date) {
          throw new Error(`Row ${index + 1}: date is required`);
        }
        const minDate = semesterRange?.startDate || '';
        const maxDate = semesterRange?.endDate || '';
        if ((minDate && normalized.date < minDate) || (maxDate && normalized.date > maxDate)) {
          throw new Error(
            `Row ${index + 1}: date must be within semester range (${minDate || '-'} to ${
              maxDate || '-'
            })`
          );
        }
      }

      cleanedRows.push({
        type: normalized.type,
        label: normalized.type === 'BREAK' ? normalized.label || 'Lunch Break' : '',
        dayOfWeek: normalized.dayOfWeek,
        date: normalized.date,
        startTime: normalized.startTime,
        endTime: normalized.endTime,
        course: normalized.type === 'BREAK' ? null : normalized.course || null,
        teacher: normalized.type === 'BREAK' ? null : normalized.teacher || null,
        mode: normalized.type === 'BREAK' ? '' : normalized.mode,
        virtualLink: normalized.type === 'BREAK' ? '' : normalized.virtualLink,
        roomNo: normalized.type === 'BREAK' ? '' : normalized.roomNo,
        campusNo: normalized.type === 'BREAK' ? '' : normalized.campusNo,
        vconfRoomId: normalized.type === 'BREAK' ? '' : normalized.vconfRoomId || '',
        vconfJoinUrl: normalized.type === 'BREAK' ? '' : normalized.vconfJoinUrl || '',
        vconfHostUrl: normalized.type === 'BREAK' ? '' : normalized.vconfHostUrl || '',
        meetingId: normalized.type === 'BREAK' ? null : normalized.meetingId || null,
        isVconfScheduled: normalized.type === 'BREAK' ? false : Boolean(normalized.isVconfScheduled),
      });
    });

    const groups = cleanedRows.reduce((acc, row) => {
      const key = isDate ? row.date : row.dayOfWeek;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
    Object.entries(groups).forEach(([key, rowsForKey]) => {
      const sorted = [...rowsForKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let index = 1; index < sorted.length; index += 1) {
        const prevRow = sorted[index - 1];
        const nextRow = sorted[index];
        if ((normalizeTimeToMinutes(nextRow.startTime) || 0) < (normalizeTimeToMinutes(prevRow.endTime) || 0)) {
          throw new Error(
            `${isDate ? 'Date' : 'Day'} ${key} has overlapping slots (${prevRow.startTime}-${prevRow.endTime} and ${nextRow.startTime}-${nextRow.endTime})`
          );
        }
      }
    });

    return cleanedRows;
  };

  const sanitizeSlotTemplates = (rows = []) => {
    const normalized = (rows || []).map((row, index) => {
      const template = normalizeSlotTemplateRow(row, index);
      const startMinutes = normalizeTimeToMinutes(template.startTime);
      const endMinutes = normalizeTimeToMinutes(template.endTime);
      if (startMinutes === null || endMinutes === null) {
        throw new Error(`Slot template ${index + 1}: start/end time must be in HH:mm format`);
      }
      if (startMinutes >= endMinutes) {
        throw new Error(`Slot template ${index + 1}: start time must be earlier than end time`);
      }
      if (template.type === 'BREAK' && !String(template.label || '').trim()) {
        template.label = 'Lunch Break';
      }
      return template;
    });

    return normalized.sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return left.startTime.localeCompare(right.startTime);
    });
  };

  const updateWeeklyDaySlot = (semesterId, rowIndex, field, value) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      const rows = Array.isArray(entry.weeklyClassSchedule)
        ? [...entry.weeklyClassSchedule]
        : [];
      const currentRow = rows[rowIndex] || createEmptyWeeklyClassRow();
      const nextRow = {
        ...currentRow,
        [field]: value,
      };
      if (field === 'type') {
        const normalizedType = String(value || 'CLASS').toUpperCase() === 'BREAK' ? 'BREAK' : 'CLASS';
        nextRow.type = normalizedType;
        if (normalizedType === 'BREAK') {
          nextRow.label = currentRow.label || 'Lunch Break';
          nextRow.course = '';
          nextRow.teacher = '';
          nextRow.mode = '';
          nextRow.virtualLink = '';
          nextRow.roomNo = '';
          nextRow.campusNo = '';
        } else {
          nextRow.label = '';
          nextRow.mode = currentRow.mode || 'VIRTUAL';
        }
      }
      if (field === 'course' && value) {
        const mappedTeacherId = entry?.subjectTeacherLookup?.[String(value)] || '';
        if ((currentRow.type || 'CLASS') !== 'BREAK' && !currentRow.teacher && mappedTeacherId) {
          nextRow.teacher = mappedTeacherId;
        }
      }
      rows[rowIndex] = nextRow;
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          weeklyClassSchedule: rows,
        },
      };
    });
  };

  const addWeeklySlot = (semesterId, dayKey = 'monday', slotTemplate = null) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      const baseRow = createEmptyWeeklyClassRow(dayKey);
      const rowWithTemplate = slotTemplate
        ? {
            ...baseRow,
            type: String(slotTemplate?.type || 'CLASS').toUpperCase() === 'BREAK' ? 'BREAK' : 'CLASS',
            label:
              String(slotTemplate?.type || '').toUpperCase() === 'BREAK'
                ? String(slotTemplate?.label || slotTemplate?.title || 'Lunch Break').trim() ||
                  'Lunch Break'
                : '',
            startTime: String(slotTemplate?.startTime || '').trim(),
            endTime: String(slotTemplate?.endTime || '').trim(),
          }
        : baseRow;
      if (rowWithTemplate.type === 'BREAK') {
        rowWithTemplate.mode = '';
        rowWithTemplate.course = '';
        rowWithTemplate.teacher = '';
        rowWithTemplate.virtualLink = '';
        rowWithTemplate.roomNo = '';
        rowWithTemplate.campusNo = '';
      }
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          weeklyClassSchedule: [...(entry.weeklyClassSchedule || []), rowWithTemplate],
        },
      };
    });
  };

  const removeWeeklySlot = (semesterId, rowIndex) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          weeklyClassSchedule: (entry.weeklyClassSchedule || []).filter((_, index) => index !== rowIndex),
        },
      };
    });
  };

  const saveWeeklyTimetable = async (semesterId) => {
    const entry = getTimetableEntry(timetableBySemester, semesterId);
    try {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`weekly:${semesterId}`]: true }));
      setTimetableErrorBySemester((prev) => ({ ...prev, [semesterId]: '' }));
      const payload = sanitizeScheduleRows({
        rows: entry.weeklyClassSchedule || [],
        isDate: false,
        semesterRange: entry.semesterRange || {},
      });

      await updateSemesterWeeklyTimetable(semesterId, payload);

      // Also persist any date-specific entries so they aren't lost when state
      // refreshes after save (fetchSemesterTimetable replaces all local state).
      const dateEntries = entry.dateClassSchedule || [];
      if (dateEntries.length > 0) {
        try {
          const datePayload = sanitizeScheduleRows({
            rows: dateEntries,
            isDate: true,
            semesterRange: entry.semesterRange || {},
          });
          if (datePayload.length > 0) {
            await updateSemesterDateClassSchedule(semesterId, datePayload);
          }
        } catch (dateErr) {
          // Date-save failure should not block the weekly-save success notice
          console.warn('[Timetable] Date schedule co-save failed:', dateErr.message);
        }
      }

      setTimetableNoticeBySemester((prev) => ({
        ...prev,
        [semesterId]: 'Weekly class schedule saved successfully.',
      }));
      await fetchSemesterTimetable(semesterId);
    } catch (err) {
      setTimetableErrorBySemester((prev) => ({
        ...prev,
        [semesterId]:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to save weekly class schedule.',
      }));
    } finally {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`weekly:${semesterId}`]: false }));
    }
  };

  const handleScheduleVirtualClasses = async (semesterId) => {
    if (!window.confirm(
      'This will auto-save your current timetable, then create Meeting entries for all class slots.\n\nAlready-scheduled classes will be skipped.\n\nProceed?'
    )) {
      return;
    }
    try {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`vconf:${semesterId}`]: true }));
      setTimetableErrorBySemester((prev) => ({ ...prev, [semesterId]: '' }));
      setTimetableNoticeBySemester((prev) => ({ ...prev, [semesterId]: '' }));

      // Auto-save local timetable state to server before scheduling,
      // so the scheduler reads the latest assignments from DB.
      const entry = getTimetableEntry(timetableBySemester, semesterId);
      const weeklyRows = entry.weeklyClassSchedule || [];
      const dateRows = entry.dateClassSchedule || [];
      if (weeklyRows.length > 0) {
        const weeklyPayload = sanitizeScheduleRows({
          rows: weeklyRows,
          isDate: false,
          semesterRange: entry.semesterRange || {},
        });
        if (weeklyPayload.length > 0) {
          await updateSemesterWeeklyTimetable(semesterId, weeklyPayload);
        }
      }
      if (dateRows.length > 0) {
        const datePayload = sanitizeScheduleRows({
          rows: dateRows,
          isDate: true,
          semesterRange: entry.semesterRange || {},
        });
        if (datePayload.length > 0) {
          await updateSemesterDateClassSchedule(semesterId, datePayload);
        }
      }

      const result = await scheduleVirtualClasses(semesterId);
      let msg = result?.message || `Created ${result?.summary?.created || 0} classes`;

      // Show skipped/error details so admin can see what happened
      if (result?.skipped?.length > 0) {
        const skippedReasons = result.skipped.map((s) => s.reason || 'Unknown').join('; ');
        msg += `\n\nSkipped: ${skippedReasons}`;
      }
      if (result?.errors?.length > 0) {
        const errorReasons = result.errors.map((e) => e.error || e.reason || 'Unknown').join('; ');
        msg += `\n\nErrors: ${errorReasons}`;
      }

      if (result?.summary?.errors > 0 || result?.summary?.created === 0) {
        setTimetableErrorBySemester((prev) => ({ ...prev, [semesterId]: msg }));
      } else {
        setTimetableNoticeBySemester((prev) => ({ ...prev, [semesterId]: msg }));
      }

      // Refresh timetable to show updated VConf URLs
      await fetchSemesterTimetable(semesterId);
    } catch (err) {
      setTimetableErrorBySemester((prev) => ({
        ...prev,
        [semesterId]:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to schedule virtual classes.',
      }));
    } finally {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`vconf:${semesterId}`]: false }));
    }
  };

  const handleResetTimetable = async (semesterId) => {
    if (!window.confirm(
      '⚠️ This will DELETE all scheduled virtual classes for this semester.\n\nAll meeting entries created from the timetable will be permanently removed.\n\nThis cannot be undone. Proceed?'
    )) {
      return;
    }
    try {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`reset:${semesterId}`]: true }));
      setTimetableErrorBySemester((prev) => ({ ...prev, [semesterId]: '' }));
      setTimetableNoticeBySemester((prev) => ({ ...prev, [semesterId]: '' }));

      const result = await resetTimetable(semesterId);
      const msg = result?.message || 'Timetable reset complete.';
      setTimetableNoticeBySemester((prev) => ({ ...prev, [semesterId]: msg }));

      // Refresh timetable to reflect cleared state
      await fetchSemesterTimetable(semesterId);
    } catch (err) {
      setTimetableErrorBySemester((prev) => ({
        ...prev,
        [semesterId]:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to reset timetable.',
      }));
    } finally {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`reset:${semesterId}`]: false }));
    }
  };

  const handleDownloadTemplate = async (semesterId) => {
    try {
      const response = await downloadTimetableTemplate(semesterId);
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable_template_${periodLabel.toLowerCase()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setTimetableErrorBySemester((prev) => ({
        ...prev,
        [semesterId]: err?.response?.data?.error || err?.message || 'Failed to download template.',
      }));
    }
  };

  const handleUploadSuccess = async (semesterId) => {
    setShowUploadModal(null);
    setTimetableNoticeBySemester((prev) => ({
      ...prev,
      [semesterId]: 'Timetable imported successfully!',
    }));
    // Refresh timetable after upload import
    await fetchSemesterTimetable(semesterId);
  };

  const updateDateClassSchedule = (semesterId, rowIndex, field, value) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      const rows = Array.isArray(entry.dateClassSchedule) ? [...entry.dateClassSchedule] : [];
      const currentRow = rows[rowIndex] || createEmptyDateClassRow(entry.semesterRange?.startDate || '');
      const nextRow = {
        ...currentRow,
        [field]: value,
      };
      if (field === 'type') {
        const normalizedType = String(value || 'CLASS').toUpperCase() === 'BREAK' ? 'BREAK' : 'CLASS';
        nextRow.type = normalizedType;
        if (normalizedType === 'BREAK') {
          nextRow.label = currentRow.label || 'Lunch Break';
          nextRow.course = '';
          nextRow.teacher = '';
          nextRow.mode = '';
          nextRow.virtualLink = '';
          nextRow.roomNo = '';
          nextRow.campusNo = '';
        } else {
          nextRow.label = '';
          nextRow.mode = currentRow.mode || 'VIRTUAL';
        }
      }
      if (field === 'course' && value) {
        const mappedTeacherId = entry?.subjectTeacherLookup?.[String(value)] || '';
        if ((currentRow.type || 'CLASS') !== 'BREAK' && !currentRow.teacher && mappedTeacherId) {
          nextRow.teacher = mappedTeacherId;
        }
      }
      rows[rowIndex] = nextRow;
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          dateClassSchedule: rows,
        },
      };
    });
  };

  const updateSlotTemplate = (semesterId, templateIndex, field, value) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      const rows = Array.isArray(entry.slotTemplates) ? [...entry.slotTemplates] : [];
      const current = rows[templateIndex] || createEmptySlotTemplateRow(templateIndex + 1);
      const next = {
        ...current,
        [field]: value,
      };
      if (field === 'type') {
        const normalizedType = String(value || 'CLASS').toUpperCase() === 'BREAK' ? 'BREAK' : 'CLASS';
        next.type = normalizedType;
        if (normalizedType === 'BREAK') {
          next.label = current.label || 'Lunch Break';
          next.title = current.title || 'Lunch Break';
        } else {
          next.label = '';
        }
      }
      rows[templateIndex] = next;
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          slotTemplates: rows,
        },
      };
    });
  };

  const addSlotTemplateRow = (semesterId) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      const existingRows = Array.isArray(entry.slotTemplates) ? entry.slotTemplates : [];
      const nextOrder = existingRows.length + 1;
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          slotTemplates: [...existingRows, createEmptySlotTemplateRow(nextOrder)],
        },
      };
    });
  };

  const removeSlotTemplateRow = (semesterId, templateIndex) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      const existingRows = Array.isArray(entry.slotTemplates) ? entry.slotTemplates : [];
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          slotTemplates: existingRows.filter((_, index) => index !== templateIndex),
        },
      };
    });
  };

  const saveSlotTemplates = async (semesterId) => {
    const entry = getTimetableEntry(timetableBySemester, semesterId);
    try {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`slots:${semesterId}`]: true }));
      setTimetableErrorBySemester((prev) => ({ ...prev, [semesterId]: '' }));

      const payload = sanitizeSlotTemplates(entry.slotTemplates || []);
      await updateSemesterSlotTemplates(semesterId, payload);

      setTimetableNoticeBySemester((prev) => ({
        ...prev,
        [semesterId]: 'Slot templates saved successfully.',
      }));
      await fetchSemesterTimetable(semesterId);
    } catch (err) {
      setTimetableErrorBySemester((prev) => ({
        ...prev,
        [semesterId]:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to save slot templates.',
      }));
    } finally {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`slots:${semesterId}`]: false }));
    }
  };

  const addDateScheduleRow = (semesterId) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          dateClassSchedule: [
            ...(entry.dateClassSchedule || []),
            createEmptyDateClassRow(entry.semesterRange?.startDate || ''),
          ],
        },
      };
    });
  };

  const removeDateScheduleRow = (semesterId, rowIndex) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          dateClassSchedule: (entry.dateClassSchedule || []).filter((_, index) => index !== rowIndex),
        },
      };
    });
  };

  const saveDateScheduleData = async (semesterId) => {
    const entry = getTimetableEntry(timetableBySemester, semesterId);
    try {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`date:${semesterId}`]: true }));
      setTimetableErrorBySemester((prev) => ({ ...prev, [semesterId]: '' }));
      const payload = sanitizeScheduleRows({
        rows: entry.dateClassSchedule || [],
        isDate: true,
        semesterRange: entry.semesterRange || {},
      });

      await updateSemesterDateClassSchedule(semesterId, payload);

      // Also persist any weekly entries so they aren't lost when state refreshes.
      const weeklyEntries = entry.weeklyClassSchedule || [];
      if (weeklyEntries.length > 0) {
        try {
          const weeklyPayload = sanitizeScheduleRows({
            rows: weeklyEntries,
            isDate: false,
            semesterRange: entry.semesterRange || {},
          });
          if (weeklyPayload.length > 0) {
            await updateSemesterWeeklyTimetable(semesterId, weeklyPayload);
          }
        } catch (weeklyErr) {
          console.warn('[Timetable] Weekly schedule co-save failed:', weeklyErr.message);
        }
      }

      setTimetableNoticeBySemester((prev) => ({
        ...prev,
        [semesterId]: 'Date-wise class schedule saved successfully.',
      }));
      await fetchSemesterTimetable(semesterId);
    } catch (err) {
      setTimetableErrorBySemester((prev) => ({
        ...prev,
        [semesterId]:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to save date-wise schedule.',
      }));
    } finally {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`date:${semesterId}`]: false }));
    }
  };

  /* ── Semester Plan (Holiday / Event / Exam / Timeline) handlers ── */

  const addPlanItem = (semesterId, item = {}) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      const plan = entry.semesterPlan || { startDate: null, endDate: null, items: [] };
      const newItem = {
        type: String(item.type || 'HOLIDAY').toUpperCase(),
        title: String(item.title || '').trim(),
        description: String(item.description || '').trim(),
        date: item.date || '',
      };
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          semesterPlan: { ...plan, items: [...(plan.items || []), newItem] },
        },
      };
    });
  };

  const updatePlanItem = (semesterId, itemIndex, field, value) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      const plan = entry.semesterPlan || { startDate: null, endDate: null, items: [] };
      const items = [...(plan.items || [])];
      if (itemIndex < 0 || itemIndex >= items.length) return prev;
      items[itemIndex] = { ...items[itemIndex], [field]: value };
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          semesterPlan: { ...plan, items },
        },
      };
    });
  };

  const removePlanItem = (semesterId, itemIndex) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      const plan = entry.semesterPlan || { startDate: null, endDate: null, items: [] };
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          semesterPlan: {
            ...plan,
            items: (plan.items || []).filter((_, index) => index !== itemIndex),
          },
        },
      };
    });
  };

  const updateWeeklyOffDays = (semesterId, days) => {
    setTimetableBySemester((prev) => {
      const entry = getTimetableEntry(prev, semesterId);
      const plan = entry.semesterPlan || { startDate: null, endDate: null, items: [], weeklyOffDays: ['sunday'] };
      return {
        ...prev,
        [semesterId]: {
          ...entry,
          semesterPlan: { ...plan, weeklyOffDays: Array.isArray(days) ? days : ['sunday'] },
        },
      };
    });
  };

  const saveSemesterPlan = async (semesterId) => {
    const entry = getTimetableEntry(timetableBySemester, semesterId);
    const plan = entry.semesterPlan || { startDate: null, endDate: null, items: [], weeklyOffDays: ['sunday'] };
    try {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`plan:${semesterId}`]: true }));
      setTimetableErrorBySemester((prev) => ({ ...prev, [semesterId]: '' }));

      const payload = {
        startDate: entry.semesterRange?.startDate || plan.startDate || null,
        endDate: entry.semesterRange?.endDate || plan.endDate || null,
        items: (plan.items || []).map((item) => ({
          type: String(item.type || 'HOLIDAY').toUpperCase(),
          title: String(item.title || '').trim(),
          description: String(item.description || '').trim(),
          date: item.date || '',
        })),
        weeklyOffDays: Array.isArray(plan.weeklyOffDays) ? plan.weeklyOffDays : ['sunday'],
      };

      await updateSemesterPlan(semesterId, { semesterPlan: payload });
      setTimetableNoticeBySemester((prev) => ({
        ...prev,
        [semesterId]: 'Semester plan saved successfully.',
      }));
      await fetchSemesterTimetable(semesterId);
    } catch (err) {
      setTimetableErrorBySemester((prev) => ({
        ...prev,
        [semesterId]:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to save semester plan.',
      }));
    } finally {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`plan:${semesterId}`]: false }));
    }
  };

  if (loading && semesters.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading {periodLabel} Data</h2>
            <p className="text-gray-600">Please wait while we fetch the scheduling information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{periodLabel}s</h2>
              <p className="text-gray-600">Manage {periodLabel.toLowerCase()}s for this batch</p>
            </div>
          </div>
          <div className="flex space-x-3">
            {allowSemesterCreation && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add {periodLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {programTotalCredits > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">
              Program Credits:{' '}
              <span className="font-semibold text-gray-900">{programTotalCredits}</span>
            </span>
            <span className="text-gray-600">
              Assigned:{' '}
              <span
                className={`font-semibold ${
                  assignedCredits > programTotalCredits ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {assignedCredits}
              </span>
              {remainingCredits !== null && (
                <span className="ml-2 text-gray-400">
                  ({remainingCredits >= 0 ? `${remainingCredits} remaining` : `${Math.abs(remainingCredits)} over`})
                </span>
              )}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                assignedCredits > programTotalCredits ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, (assignedCredits / programTotalCredits) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {semesters.map((semester) => {
          const isExpanded = expandedSemesterId === semester._id;
          const activeSemesterTab = activeDetailTabBySemester[semester._id] || 'COURSE';
          const semesterCourses = coursesBySemester[semester._id] || [];
          const semesterRange = {
            startDate: toInputDate(semester?.startDate),
            endDate: toInputDate(semester?.endDate),
          };
          const timetableEntry =
            timetableBySemester[semester._id] || createEmptyTimetableState(semesterRange);

          return (
            <div key={semester._id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 sm:p-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSemesterExpand(semester._id)}
                      disabled={!detailedView}
                      className={`mt-0.5 p-1 rounded transition-colors ${
                        detailedView
                          ? 'text-gray-500 hover:text-blue-700 hover:bg-blue-50'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      title={detailedView ? 'Expand details' : 'Detailed view available in Batch details'}
                    >
                      {detailedView ? (
                        isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">{semester.name}</h3>
                        {semester.semNumber && (
                          <span className="text-sm text-gray-500">{periodLabel} #{semester.semNumber}</span>
                        )}
                        {semester.status && (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[semester.status] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {semester.status}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
                        <div>
                          <span className="font-medium text-gray-700">Duration:</span>{' '}
                          {calculateDuration(semester.startDate, semester.endDate)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Start:</span> {formatDate(semester.startDate)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">End:</span> {formatDate(semester.endDate)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Credits:</span>{' '}
                          {semester.totalCredits != null ? semester.totalCredits : 'Not set'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEditClick(semester)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(semester._id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {detailedView && isExpanded && (
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-gray-100 p-1">
                    <button
                      type="button"
                      onClick={() => handleSemesterTabChange(semester._id, 'COURSE')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeSemesterTab === 'COURSE'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Course
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSemesterTabChange(semester._id, 'TIMETABLE')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeSemesterTab === 'TIMETABLE'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Clock3 className="w-4 h-4" />
                        Timetable
                      </span>
                    </button>
                  </div>

                  <div className={activeSemesterTab === 'COURSE' ? '' : 'hidden'}>
                    <div className="border border-gray-200 rounded-lg p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                      {teacherLoadError && (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                          {teacherLoadError}
                        </div>
                      )}

                      {courseErrorsBySemester[semester._id] && (
                        <div
                          className={`text-xs rounded p-2 border ${
                            courseErrorsBySemester[semester._id].toLowerCase().includes('success')
                              ? 'text-green-700 bg-green-50 border-green-200'
                              : 'text-red-700 bg-red-50 border-red-200'
                          }`}
                        >
                          {courseErrorsBySemester[semester._id]}
                        </div>
                      )}

                      {courseLoadingBySemester[semester._id] ? (
                        <div className="text-sm text-gray-500">Loading courses...</div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="overflow-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left w-12">Sl No</th>
                                  <th className="px-3 py-2 text-left">Course</th>
                                  <th className="px-3 py-2 text-left">Course Code</th>
                                  <th className="px-2 py-2 text-center w-10">L</th>
                                  <th className="px-2 py-2 text-center w-10">T</th>
                                  <th className="px-2 py-2 text-center w-10">P</th>
                                  <th className="px-2 py-2 text-center w-10">C</th>
                                  <th className="px-3 py-2 text-left">Teachers</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {semesterCourses.map((course, index) => {
                                  const selectionKey = `${semester._id}:${course._id}`;
                                  const assignedTeachers = Array.isArray(course.assignedTeachers)
                                    ? course.assignedTeachers
                                    : [];
                                  const hasAssignedTeacher = assignedTeachers.length > 0;

                                  return (
                                    <tr key={course._id} className="hover:bg-gray-50 align-top">
                                      <td className="px-3 py-2 text-gray-600">{index + 1}</td>
                                      <td className="px-3 py-2 text-gray-900 font-medium">{course.title || '-'}</td>
                                      <td className="px-3 py-2 font-mono text-gray-700">{course.courseCode || '-'}</td>
                                      <td className="px-2 py-2 text-center text-gray-700">{Number(course?.creditPoints?.lecture) || 0}</td>
                                      <td className="px-2 py-2 text-center text-gray-700">{Number(course?.creditPoints?.tutorial) || 0}</td>
                                      <td className="px-2 py-2 text-center text-gray-700">{Number(course?.creditPoints?.practical) || 0}</td>
                                      <td className="px-2 py-2 text-center font-semibold text-gray-900">{sumCourseCredits(course)}</td>
                                      <td className="px-3 py-2">
                                        <div className="flex flex-col gap-2">
                                          {/* Assigned teachers list */}
                                          {hasAssignedTeacher && (
                                            <div className="flex flex-col gap-1.5">
                                              {assignedTeachers.map((teacher, tIdx) => {
                                                const tId = String(getTeacherId(teacher));
                                                const matchedT = teachers.find(
                                                  (t) => String(t._id) === tId
                                                );
                                                const empId = getTeacherEmployeeId(teacher) || getTeacherEmployeeId(matchedT) || '';
                                                return (
                                                  <div
                                                    key={`${course._id}-teacher-${tIdx}`}
                                                    className="flex items-center gap-2 rounded-md bg-blue-50 border border-blue-200 px-2 py-1.5"
                                                  >
                                                    <div className="flex-1 min-w-0">
                                                      <div className="text-xs font-medium text-gray-900 truncate">
                                                        {getTeacherDisplayName(teacher) || 'Unknown'}
                                                      </div>
                                                      <div className="flex items-center gap-2 text-[10px]">
                                                        {empId && (
                                                          <span className="text-gray-500 font-mono">ID: {empId}</span>
                                                        )}
                                                        <span className="text-blue-600">{teacher?.roleLabel || 'Teacher'}</span>
                                                      </div>
                                                    </div>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleRemoveTeacher(semester._id, course, tId)}
                                                      disabled={assigningByCourse[selectionKey]}
                                                      className="flex-shrink-0 p-0.5 text-gray-400 hover:text-red-600 disabled:opacity-50"
                                                      title="Remove teacher"
                                                    >
                                                      <X size={14} />
                                                    </button>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}

                                          {/* Add teacher dropdown */}
                                          <div className="flex items-center gap-1.5">
                                            <select
                                              value={teacherSelectionByCourse[selectionKey] || ''}
                                              onChange={(event) => {
                                                const nextTeacherId = event.target.value;
                                                handleTeacherSelection(
                                                  semester._id,
                                                  course._id,
                                                  nextTeacherId
                                                );
                                                if (!nextTeacherId) return;
                                                handleAssignTeacher(
                                                  semester._id,
                                                  course,
                                                  nextTeacherId
                                                );
                                              }}
                                              className="flex-1 min-w-[180px] px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                                              disabled={teachersLoading || assigningByCourse[selectionKey]}
                                            >
                                              <option value="">+ Add Teacher</option>
                                              {teachers.map((teacher) => (
                                                <option key={teacher._id} value={teacher._id}>
                                                  {getTeacherOptionLabel(teacher)}
                                                </option>
                                              ))}
                                            </select>
                                          </div>

                                          {assigningByCourse[selectionKey] && (
                                            <span className="text-[11px] text-blue-700">Saving...</span>
                                          )}
                                          {!hasAssignedTeacher && !assigningByCourse[selectionKey] && (
                                            <span className="text-[10px] text-gray-400 italic">No teacher assigned</span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}

                                {!semesterCourses.length && (
                                  <tr>
                                    <td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={5}>
                                      No courses available for this {periodLabel.toLowerCase()}.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={activeSemesterTab === 'TIMETABLE' ? '' : 'hidden'}>
                    <div className="border border-gray-200 rounded-lg p-4 space-y-6 max-h-[70vh] overflow-y-auto">
                      {timetableLoadingBySemester[semester._id] ? (
                        <div className="text-sm text-gray-500">Loading timetable...</div>
                      ) : (
                        <>
                          {/* Download / Upload buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleDownloadTemplate(semester._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download Template
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowUploadModal(semester._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Upload Timetable
                            </button>
                          </div>

                          {/* Date Range */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-blue-100 bg-blue-50 rounded-lg p-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-blue-700 font-semibold">
                                {periodLabel} Start Date
                              </p>
                              <p className="text-sm text-blue-900 font-medium">
                                {formatDate(
                                  timetableEntry?.semesterRange?.startDate || semester?.startDate
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-blue-700 font-semibold">
                                {periodLabel} End Date
                              </p>
                              <p className="text-sm text-blue-900 font-medium">
                                {formatDate(
                                  timetableEntry?.semesterRange?.endDate || semester?.endDate
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Slot Template Editor */}
                          <SlotTemplateEditor
                            slotTemplates={timetableEntry.slotTemplates || []}
                            onUpdateTemplate={(index, field, value) =>
                              updateSlotTemplate(semester._id, index, field, value)
                            }
                            onAddTemplate={() => addSlotTemplateRow(semester._id)}
                            onRemoveTemplate={(index) => removeSlotTemplateRow(semester._id, index)}
                            onSave={() => saveSlotTemplates(semester._id)}
                            saving={!!timetableSavingBySemester[`slots:${semester._id}`]}
                            periodLabel={periodLabel}
                          />

                          {/* Subject-Teacher Mappings */}
                          {(timetableEntry.subjectTeacherMappings || []).length > 0 && (
                            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                              <p className="text-xs text-amber-800 font-medium mb-2">
                                Subject → Teacher Mapping (auto-fill when teacher is left blank)
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(timetableEntry.subjectTeacherMappings || []).map((mapping) => (
                                  <span
                                    key={mapping.courseId || mapping.courseCode}
                                    className="text-xs bg-white border border-amber-200 px-2 py-0.5 rounded"
                                  >
                                    {mapping.courseCode || mapping.courseTitle} → {mapping.teacherName || mapping.employeeId || 'Unassigned'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Semester Plan Editor (Holidays / Events / Exams) */}
                          <SemesterPlanEditor
                            semesterPlan={timetableEntry.semesterPlan || { startDate: null, endDate: null, items: [] }}
                            semesterRange={timetableEntry.semesterRange || {}}
                            onAddItem={(item) => addPlanItem(semester._id, item)}
                            onUpdateItem={(index, field, value) =>
                              updatePlanItem(semester._id, index, field, value)
                            }
                            onRemoveItem={(index) => removePlanItem(semester._id, index)}
                            onUpdateWeeklyOffDays={(days) => updateWeeklyOffDays(semester._id, days)}
                            onSave={() => saveSemesterPlan(semester._id)}
                            saving={!!timetableSavingBySemester[`plan:${semester._id}`]}
                            periodLabel={periodLabel}
                          />

                          {/* Unified Calendar View */}
                          <UnifiedCalendarView
                            semesterId={semester._id}
                            semesterRange={timetableEntry.semesterRange || {}}
                            slotTemplates={timetableEntry.slotTemplates || []}
                            expandedDateSchedule={timetableEntry.expandedDateSchedule || []}
                            semesterPlan={timetableEntry.semesterPlan || { startDate: null, endDate: null, items: [] }}
                            courses={semesterCourses}
                            teachers={teachers}
                            subjectTeacherLookup={timetableEntry.subjectTeacherLookup || {}}
                            weeklyClassSchedule={timetableEntry.weeklyClassSchedule || []}
                            dateClassSchedule={timetableEntry.dateClassSchedule || []}
                            onAssignSlot={(semId, assignment) => {
                              if (assignment.isRecurring) {
                                // Save to weeklyClassSchedule
                                setTimetableBySemester((prev) => {
                                  const entry = getTimetableEntry(prev, semId);
                                  const newRow = {
                                    _id: '',
                                    type: 'CLASS',
                                    label: '',
                                    dayOfWeek: assignment.dayOfWeek,
                                    date: '',
                                    startTime: assignment.startTime,
                                    endTime: assignment.endTime,
                                    course: assignment.course,
                                    teacher: assignment.teacher,
                                    mode: assignment.mode,
                                    virtualLink: assignment.virtualLink || '',
                                    roomNo: assignment.roomNo || '',
                                    campusNo: assignment.campusNo || '',
                                    vconfRoomId: '',
                                    vconfJoinUrl: '',
                                    vconfHostUrl: '',
                                    meetingId: null,
                                    isVconfScheduled: false,
                                    source: 'WEEKLY',
                                    isHoliday: false,
                                    holidayTitle: '',
                                    planItems: [],
                                    courseLabel: '',
                                    teacherLabel: '',
                                  };
                                  // Remove any existing entry for same dayOfWeek + time
                                  const filtered = (entry.weeklyClassSchedule || []).filter(
                                    (r) =>
                                      !(
                                        r.dayOfWeek === assignment.dayOfWeek &&
                                        r.startTime === assignment.startTime &&
                                        r.endTime === assignment.endTime
                                      )
                                  );
                                  return {
                                    ...prev,
                                    [semId]: {
                                      ...entry,
                                      weeklyClassSchedule: [...filtered, newRow],
                                    },
                                  };
                                });
                              } else {
                                // Save to dateClassSchedule
                                setTimetableBySemester((prev) => {
                                  const entry = getTimetableEntry(prev, semId);
                                  const newRow = {
                                    _id: '',
                                    type: 'CLASS',
                                    label: '',
                                    dayOfWeek: assignment.dayOfWeek,
                                    date: assignment.date,
                                    startTime: assignment.startTime,
                                    endTime: assignment.endTime,
                                    course: assignment.course,
                                    teacher: assignment.teacher,
                                    mode: assignment.mode,
                                    virtualLink: assignment.virtualLink || '',
                                    roomNo: assignment.roomNo || '',
                                    campusNo: assignment.campusNo || '',
                                    vconfRoomId: '',
                                    vconfJoinUrl: '',
                                    vconfHostUrl: '',
                                    meetingId: null,
                                    isVconfScheduled: false,
                                    source: 'DATE_OVERRIDE',
                                    isHoliday: false,
                                    holidayTitle: '',
                                    planItems: [],
                                    courseLabel: '',
                                    teacherLabel: '',
                                  };
                                  // Remove existing entry for same date + time
                                  const filtered = (entry.dateClassSchedule || []).filter(
                                    (r) =>
                                      !(
                                        formatDateKey(r.date) === formatDateKey(assignment.date) &&
                                        r.startTime === assignment.startTime &&
                                        r.endTime === assignment.endTime
                                      )
                                  );
                                  return {
                                    ...prev,
                                    [semId]: {
                                      ...entry,
                                      dateClassSchedule: [...filtered, newRow],
                                    },
                                  };
                                });
                              }
                            }}
                            onRemoveSlot={(semId, removal) => {
                              setTimetableBySemester((prev) => {
                                const entry = getTimetableEntry(prev, semId);
                                if (removal.isRecurring) {
                                  return {
                                    ...prev,
                                    [semId]: {
                                      ...entry,
                                      weeklyClassSchedule: (entry.weeklyClassSchedule || []).filter(
                                        (r) =>
                                          !(
                                            r.dayOfWeek === removal.dayOfWeek &&
                                            r.startTime === removal.slotTemplate?.startTime &&
                                            r.endTime === removal.slotTemplate?.endTime
                                          )
                                      ),
                                    },
                                  };
                                } else {
                                  const dateMatch = (r) =>
                                    formatDateKey(r.date) === formatDateKey(removal.date) &&
                                    r.startTime === removal.slotTemplate?.startTime &&
                                    r.endTime === removal.slotTemplate?.endTime;
                                  return {
                                    ...prev,
                                    [semId]: {
                                      ...entry,
                                      dateClassSchedule: (entry.dateClassSchedule || []).filter(
                                        (r) => !dateMatch(r)
                                      ),
                                      // Also remove from cached server data so entry disappears immediately
                                      expandedDateSchedule: (entry.expandedDateSchedule || []).filter(
                                        (r) => !dateMatch(r)
                                      ),
                                    },
                                  };
                                }
                              });
                            }}
                            onSaveWeekly={(semId) => saveWeeklyTimetable(semId)}
                            onSaveDate={(semId) => saveDateScheduleData(semId)}
                            onScheduleVConf={(semId) => handleScheduleVirtualClasses(semId)}
                            onResetTimetable={(semId) => handleResetTimetable(semId)}
                            saving={
                              !!timetableSavingBySemester[`weekly:${semester._id}`] ||
                              !!timetableSavingBySemester[`date:${semester._id}`]
                            }
                            savingVConf={!!timetableSavingBySemester[`vconf:${semester._id}`]}
                            resettingTimetable={!!timetableSavingBySemester[`reset:${semester._id}`]}
                            statusMessage={timetableErrorBySemester[semester._id] || timetableNoticeBySemester[semester._id] || ''}
                            statusType={timetableErrorBySemester[semester._id] ? 'error' : 'success'}
                            onClearStatus={() => {
                              setTimetableErrorBySemester((prev) => ({ ...prev, [semester._id]: '' }));
                              setTimetableNoticeBySemester((prev) => ({ ...prev, [semester._id]: '' }));
                            }}
                            periodLabel={periodLabel}
                          />
                        </>

                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {semesters.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No {periodLabel}s Found</h2>
            <p className="text-gray-600 mb-4">
              {allowSemesterCreation
                ? `Get started by creating your first ${periodLabel.toLowerCase()}.`
                : `No ${periodLabel.toLowerCase()} records were created from Setup Wizard for this batch yet.`}
            </p>
            {allowSemesterCreation && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create {periodLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {allowSemesterCreation && showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New {periodLabel}</h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetCreateForm();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSemester} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{periodLabel} Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Spring 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{periodLabel} Number *</label>
                <input
                  type="number"
                  name="semNumber"
                  value={formData.semNumber}
                  onChange={handleInputChange}
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                  {formData.startDate && (
                    <span className="text-xs text-gray-400 ml-1">(auto-computed, editable)</span>
                  )}
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mid Exam Date</label>
                <input
                  type="date"
                  name="midTermExamDate"
                  value={formData.midTermExamDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Exam Date</label>
                <input
                  type="date"
                  name="endTermExamDate"
                  value={formData.endTermExamDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Credits</label>
                <input
                  type="number"
                  name="totalCredits"
                  value={formData.totalCredits}
                  onChange={handleInputChange}
                  min="0"
                  max={remainingCredits != null && remainingCredits > 0 ? remainingCredits : undefined}
                  placeholder={remainingCredits != null ? `max ${remainingCredits}` : 'e.g., 24'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetCreateForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-white transition-colors ${
                    creating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{creating ? 'Creating...' : `Create ${periodLabel}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditForm && editingSemester && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit {periodLabel}</h2>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingSemester(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSemester} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{periodLabel} Name *</label>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{periodLabel} Number *</label>
                <input
                  type="number"
                  name="semNumber"
                  value={editFormData.semNumber}
                  onChange={handleEditInputChange}
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={editFormData.startDate}
                  onChange={handleEditInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={editFormData.endDate}
                  onChange={handleEditInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mid Exam Date</label>
                <input
                  type="date"
                  name="midTermExamDate"
                  value={editFormData.midTermExamDate}
                  onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Exam Date</label>
                <input
                  type="date"
                  name="endTermExamDate"
                  value={editFormData.endTermExamDate}
                  onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Credits</label>
                <input
                  type="number"
                  name="totalCredits"
                  value={editFormData.totalCredits}
                  onChange={handleEditInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingSemester(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-white transition-colors ${
                    updating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{updating ? 'Updating...' : `Update ${periodLabel}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete {periodLabel}?</h3>
              <p className="text-sm text-gray-600 mb-6">
                This will delete the {periodLabel.toLowerCase()} and related course links.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingSemesterId(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className={`px-4 py-2 rounded-md text-white ${
                    deleting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timetable Upload Modal */}
      {showUploadModal && (
        <TimetableUploadModal
          semesterId={showUploadModal}
          periodLabel={periodLabel}
          onClose={() => setShowUploadModal(null)}
          onImportSuccess={() => handleUploadSuccess(showUploadModal)}
        />
      )}
    </div>
  );
};

export default SemesterManager;
