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
  X,
} from 'lucide-react';
import {
  getSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  getSemesterTimetable,
  updateSemesterWeeklyTimetable,
  updateSemesterPlan,
} from '../../services/semester.services';
import { getCoursesForSemester, updateCourseTeachers } from '../../services/courses.service';
import { getTeachers } from '../../services/user.service';
import { getPeriodLabel } from '../../utils/periodLabel';
import { calculateEndDate } from '../../utils/dateCalculator';

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
];

const PLAN_TYPE_OPTIONS = ['HOLIDAY', 'EVENT', 'EXAM', 'TIMELINE'];

const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

const emptyWeeklyTimetable = () => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
});

const createEmptySlot = () => ({
  startTime: '',
  endTime: '',
  course: '',
  teacher: '',
  room: '',
});

const monthIso = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const normalizeTimetableResponse = (payload = {}) => {
  const weeklySource = payload?.weeklyTimetable || {};
  const weeklyTimetable = WEEK_DAYS.reduce((acc, day) => {
    const dayRows = Array.isArray(weeklySource?.[day.key]) ? weeklySource[day.key] : [];
    acc[day.key] = dayRows.map((slot) => ({
      startTime: slot?.startTime || '',
      endTime: slot?.endTime || '',
      course: slot?.course?._id || slot?.course || '',
      teacher: slot?.teacher?._id || slot?.teacher || '',
      room: slot?.room || '',
    }));
    return acc;
  }, emptyWeeklyTimetable());

  const planSource = payload?.semesterPlan || {};
  const semesterPlan = {
    startDate: toInputDate(planSource?.startDate),
    endDate: toInputDate(planSource?.endDate),
    items: Array.isArray(planSource?.items)
      ? planSource.items.map((item, index) => ({
          itemId: item?.itemId || `${Date.now()}-${index}`,
          type: item?.type || 'EVENT',
          title: item?.title || '',
          description: item?.description || '',
          date: toInputDate(item?.date),
        }))
      : [],
  };

  return {
    weeklyTimetable,
    semesterPlan,
    calendarMonth: monthIso(semesterPlan.startDate || new Date()),
  };
};

const buildCalendarCells = (monthValue) => {
  const baseDate = new Date(`${monthValue}T00:00:00`);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const day = index - startOffset + 1;
    if (day < 1 || day > daysInMonth) {
      cells.push({
        key: `blank-${index}`,
        inMonth: false,
        day: '',
        dateKey: '',
      });
      continue;
    }

    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      key: dateKey,
      inMonth: true,
      day,
      dateKey,
    });
  }

  return {
    label: baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    cells,
  };
};

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
  const [planEmailSummaryBySemester, setPlanEmailSummaryBySemester] = useState({});
  const [activeTimetablePlanBySemester, setActiveTimetablePlanBySemester] = useState({});

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
    setPlanEmailSummaryBySemester({});
    setActiveTimetablePlanBySemester({});
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
      setPlanEmailSummaryBySemester((prev) => filterSemesterMap(prev));
      setActiveTimetablePlanBySemester((prev) => filterSemesterMap(prev));
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
      const sorted = [...list].sort((a, b) => {
        const aCode = String(a?.courseCode || a?.title || '');
        const bCode = String(b?.courseCode || b?.title || '');
        return aCode.localeCompare(bCode);
      });

      setCoursesBySemester((prev) => ({ ...prev, [semesterId]: sorted }));
      setTeacherSelectionByCourse((prev) => {
        const next = { ...prev };
        sorted.forEach((course) => {
          const key = `${semesterId}:${course._id}`;
          const firstAssigned = Array.isArray(course?.assignedTeachers)
            ? course.assignedTeachers[0]
            : null;
          if (!next[key]) {
            next[key] = getTeacherId(firstAssigned);
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

  const fetchSemesterTimetable = async (semesterId) => {
    if (!semesterId) return;
    setTimetableLoadingBySemester((prev) => ({ ...prev, [semesterId]: true }));
    setTimetableErrorBySemester((prev) => ({ ...prev, [semesterId]: '' }));

    try {
      const response = await getSemesterTimetable(semesterId);
      setTimetableBySemester((prev) => ({
        ...prev,
        [semesterId]: normalizeTimetableResponse(response),
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
    setActiveTimetablePlanBySemester((prev) => ({
      ...prev,
      [semesterId]: prev[semesterId] || 'WEEKLY',
    }));
  };

  const handleSemesterTabChange = (semesterId, tabKey) => {
    setActiveDetailTabBySemester((prev) => ({
      ...prev,
      [semesterId]: tabKey,
    }));
  };

  const handleTimetablePlanChange = (semesterId, planType) => {
    setActiveTimetablePlanBySemester((prev) => ({
      ...prev,
      [semesterId]: planType,
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
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        batch: batchId,
      };

      if (formData.midTermExamDate) {
        payload.midTermExamDate = new Date(formData.midTermExamDate).toISOString();
      }
      if (formData.endTermExamDate) {
        payload.endTermExamDate = new Date(formData.endTermExamDate).toISOString();
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
        startDate: new Date(editFormData.startDate).toISOString(),
        endDate: new Date(editFormData.endDate).toISOString(),
        batch: batchId,
      };

      if (editFormData.midTermExamDate) {
        payload.midTermExamDate = new Date(editFormData.midTermExamDate).toISOString();
      }
      if (editFormData.endTermExamDate) {
        payload.endTermExamDate = new Date(editFormData.endTermExamDate).toISOString();
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
      setPlanEmailSummaryBySemester((prev) => {
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

  const handleAssignTeacher = async (semesterId, course, selectedTeacherId = '') => {
    const selectionKey = `${semesterId}:${course._id}`;
    const teacherId = selectedTeacherId || teacherSelectionByCourse[selectionKey];
    if (!teacherId) {
      setCourseErrorsBySemester((prev) => ({
        ...prev,
        [semesterId]: 'Select a teacher before assigning.',
      }));
      return;
    }

    try {
      setAssigningByCourse((prev) => ({ ...prev, [selectionKey]: true }));
      setCourseErrorsBySemester((prev) => ({ ...prev, [semesterId]: '' }));

      await updateCourseTeachers(semesterId, course._id, [
        {
          teacherId,
          roleLabel: 'Teacher',
        },
      ]);

      await fetchSemesterCourses(semesterId);
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

  const updateWeeklyDaySlot = (semesterId, dayKey, index, field, value) => {
    setTimetableBySemester((prev) => {
      const entry = prev[semesterId] || {
        weeklyTimetable: emptyWeeklyTimetable(),
        semesterPlan: { startDate: '', endDate: '', items: [] },
        calendarMonth: monthIso(new Date()),
      };
      const dayRows = Array.isArray(entry.weeklyTimetable?.[dayKey])
        ? [...entry.weeklyTimetable[dayKey]]
        : [];
      dayRows[index] = {
        ...(dayRows[index] || createEmptySlot()),
        [field]: value,
      };

      return {
        ...prev,
        [semesterId]: {
          ...entry,
          weeklyTimetable: {
            ...entry.weeklyTimetable,
            [dayKey]: dayRows,
          },
        },
      };
    });
  };

  const addWeeklySlot = (semesterId, dayKey) => {
    setTimetableBySemester((prev) => {
      const entry = prev[semesterId] || {
        weeklyTimetable: emptyWeeklyTimetable(),
        semesterPlan: { startDate: '', endDate: '', items: [] },
        calendarMonth: monthIso(new Date()),
      };
      const dayRows = Array.isArray(entry.weeklyTimetable?.[dayKey])
        ? [...entry.weeklyTimetable[dayKey]]
        : [];
      dayRows.push(createEmptySlot());

      return {
        ...prev,
        [semesterId]: {
          ...entry,
          weeklyTimetable: {
            ...entry.weeklyTimetable,
            [dayKey]: dayRows,
          },
        },
      };
    });
  };

  const removeWeeklySlot = (semesterId, dayKey, index) => {
    setTimetableBySemester((prev) => {
      const entry = prev[semesterId];
      if (!entry) return prev;
      const dayRows = Array.isArray(entry.weeklyTimetable?.[dayKey])
        ? entry.weeklyTimetable[dayKey].filter((_, rowIndex) => rowIndex !== index)
        : [];

      return {
        ...prev,
        [semesterId]: {
          ...entry,
          weeklyTimetable: {
            ...entry.weeklyTimetable,
            [dayKey]: dayRows,
          },
        },
      };
    });
  };

  const saveWeeklyTimetable = async (semesterId) => {
    const entry = timetableBySemester[semesterId];
    if (!entry) return;

    try {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`weekly:${semesterId}`]: true }));
      setTimetableErrorBySemester((prev) => ({ ...prev, [semesterId]: '' }));

      await updateSemesterWeeklyTimetable(semesterId, entry.weeklyTimetable || emptyWeeklyTimetable());

      setTimetableNoticeBySemester((prev) => ({
        ...prev,
        [semesterId]: 'Weekly timetable saved successfully.',
      }));
      await fetchSemesterTimetable(semesterId);
    } catch (err) {
      setTimetableErrorBySemester((prev) => ({
        ...prev,
        [semesterId]:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to save weekly timetable.',
      }));
    } finally {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`weekly:${semesterId}`]: false }));
    }
  };

  const updateSemesterPlanField = (semesterId, field, value) => {
    setTimetableBySemester((prev) => {
      const entry = prev[semesterId] || {
        weeklyTimetable: emptyWeeklyTimetable(),
        semesterPlan: { startDate: '', endDate: '', items: [] },
        calendarMonth: monthIso(new Date()),
      };

      return {
        ...prev,
        [semesterId]: {
          ...entry,
          semesterPlan: {
            ...entry.semesterPlan,
            [field]: value,
          },
          calendarMonth:
            field === 'startDate' && value ? monthIso(value) : entry.calendarMonth,
        },
      };
    });
  };

  const addSemesterPlanItem = (semesterId) => {
    setTimetableBySemester((prev) => {
      const entry = prev[semesterId] || {
        weeklyTimetable: emptyWeeklyTimetable(),
        semesterPlan: { startDate: '', endDate: '', items: [] },
        calendarMonth: monthIso(new Date()),
      };
      const defaultDate = entry.semesterPlan.startDate || toInputDate(new Date());

      return {
        ...prev,
        [semesterId]: {
          ...entry,
          semesterPlan: {
            ...entry.semesterPlan,
            items: [
              ...(entry.semesterPlan.items || []),
              {
                itemId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                type: 'EVENT',
                title: '',
                description: '',
                date: defaultDate,
              },
            ],
          },
        },
      };
    });
  };

  const updateSemesterPlanItem = (semesterId, index, field, value) => {
    setTimetableBySemester((prev) => {
      const entry = prev[semesterId];
      if (!entry) return prev;
      const items = Array.isArray(entry.semesterPlan?.items)
        ? entry.semesterPlan.items.map((item, itemIndex) =>
            itemIndex === index ? { ...item, [field]: value } : item
          )
        : [];

      return {
        ...prev,
        [semesterId]: {
          ...entry,
          semesterPlan: {
            ...entry.semesterPlan,
            items,
          },
        },
      };
    });
  };

  const removeSemesterPlanItem = (semesterId, index) => {
    setTimetableBySemester((prev) => {
      const entry = prev[semesterId];
      if (!entry) return prev;
      const items = Array.isArray(entry.semesterPlan?.items)
        ? entry.semesterPlan.items.filter((_, itemIndex) => itemIndex !== index)
        : [];

      return {
        ...prev,
        [semesterId]: {
          ...entry,
          semesterPlan: {
            ...entry.semesterPlan,
            items,
          },
        },
      };
    });
  };

  const saveSemesterPlanData = async (semesterId) => {
    const entry = timetableBySemester[semesterId];
    if (!entry) return;

    const payload = {
      startDate: entry.semesterPlan?.startDate || null,
      endDate: entry.semesterPlan?.endDate || null,
      items: (entry.semesterPlan?.items || []).map((item) => ({
        itemId: item.itemId,
        type: item.type,
        title: item.title,
        description: item.description,
        date: item.date,
      })),
    };

    try {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`plan:${semesterId}`]: true }));
      setTimetableErrorBySemester((prev) => ({ ...prev, [semesterId]: '' }));

      const response = await updateSemesterPlan(semesterId, payload);
      setTimetableNoticeBySemester((prev) => ({
        ...prev,
        [semesterId]: 'Semester plan saved successfully.',
      }));

      if (response?.semesterPlan) {
        setTimetableBySemester((prev) => ({
          ...prev,
          [semesterId]: {
            ...(prev[semesterId] || {
              weeklyTimetable: emptyWeeklyTimetable(),
              semesterPlan: { startDate: '', endDate: '', items: [] },
              calendarMonth: monthIso(new Date()),
            }),
            ...normalizeTimetableResponse({
              weeklyTimetable: prev[semesterId]?.weeklyTimetable || emptyWeeklyTimetable(),
              semesterPlan: response.semesterPlan,
            }),
          },
        }));
      }

      if (response?.emailSummary) {
        setPlanEmailSummaryBySemester((prev) => ({
          ...prev,
          [semesterId]: response.emailSummary,
        }));
      }
    } catch (err) {
      setTimetableErrorBySemester((prev) => ({
        ...prev,
        [semesterId]:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to save semester plan.',
      }));
    } finally {
      setTimetableSavingBySemester((prev) => ({ ...prev, [`plan:${semesterId}`]: false }));
    }
  };

  const shiftCalendarMonth = (semesterId, monthDelta) => {
    setTimetableBySemester((prev) => {
      const entry = prev[semesterId];
      if (!entry) return prev;
      const baseDate = new Date(`${entry.calendarMonth}T00:00:00`);
      baseDate.setMonth(baseDate.getMonth() + monthDelta);

      return {
        ...prev,
        [semesterId]: {
          ...entry,
          calendarMonth: monthIso(baseDate),
        },
      };
    });
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
            <button
              onClick={fetchSemesters}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
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
          const activeTimetablePlan = activeTimetablePlanBySemester[semester._id] || 'WEEKLY';
          const semesterCourses = coursesBySemester[semester._id] || [];
          const timetableEntry = timetableBySemester[semester._id] || {
            weeklyTimetable: emptyWeeklyTimetable(),
            semesterPlan: { startDate: '', endDate: '', items: [] },
            calendarMonth: monthIso(new Date()),
          };
          const calendarData = buildCalendarCells(timetableEntry.calendarMonth);
          const itemsByDate = (timetableEntry.semesterPlan.items || []).reduce((acc, item) => {
            const dateKey = item?.date || '';
            if (!dateKey) return acc;
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(item);
            return acc;
          }, {});

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
                          <div className="max-h-80 overflow-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left">Sl No</th>
                                  <th className="px-3 py-2 text-left">Course</th>
                                  <th className="px-3 py-2 text-left">Course Code</th>
                                  <th className="px-3 py-2 text-left">Credit</th>
                                  <th className="px-3 py-2 text-left">Employee ID</th>
                                  <th className="px-3 py-2 text-left">Teacher</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {semesterCourses.map((course, index) => {
                                  const selectionKey = `${semester._id}:${course._id}`;
                                  const assignedTeachers = Array.isArray(course.assignedTeachers)
                                    ? course.assignedTeachers
                                    : [];
                                  const hasAssignedTeacher = assignedTeachers.length > 0;
                                  const assignedTeacherLabel = hasAssignedTeacher
                                    ? assignedTeachers
                                        .map((teacher) => getTeacherDisplayName(teacher))
                                        .filter(Boolean)
                                        .join(', ')
                                    : 'Not assigned';
                                  const primaryAssignedTeacher = hasAssignedTeacher
                                    ? assignedTeachers[0]
                                    : null;
                                  const matchedTeacher = primaryAssignedTeacher
                                    ? teachers.find(
                                        (teacher) =>
                                          String(getTeacherId(teacher)) ===
                                          String(getTeacherId(primaryAssignedTeacher))
                                      )
                                    : null;
                                  const assignedEmployeeId =
                                    getTeacherEmployeeId(primaryAssignedTeacher) ||
                                    getTeacherEmployeeId(matchedTeacher) ||
                                    '—';

                                  return (
                                    <tr key={course._id} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 text-gray-600">{index + 1}</td>
                                      <td className="px-3 py-2 text-gray-900 font-medium">{course.title || '-'}</td>
                                      <td className="px-3 py-2 font-mono text-gray-700">{course.courseCode || '-'}</td>
                                      <td className="px-3 py-2 text-gray-700">{sumCourseCredits(course)}</td>
                                      <td className="px-3 py-2 text-gray-700">{assignedEmployeeId}</td>
                                      <td className="px-3 py-2">
                                        <div className="flex flex-col gap-1">
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
                                            className="min-w-[220px] px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                                            disabled={teachersLoading || assigningByCourse[selectionKey]}
                                          >
                                            <option value="">
                                              {hasAssignedTeacher ? 'Change Teacher' : 'Assign Teacher'}
                                            </option>
                                            {teachers.map((teacher) => (
                                              <option key={teacher._id} value={teacher._id}>
                                                {getTeacherOptionLabel(teacher)}
                                              </option>
                                            ))}
                                          </select>
                                          {assigningByCourse[selectionKey] && (
                                            <span className="text-[11px] text-blue-700">Saving teacher assignment...</span>
                                          )}
                                          {!assigningByCourse[selectionKey] && hasAssignedTeacher && (
                                            <span className="text-[11px] text-gray-500 truncate">
                                              {assignedTeacherLabel}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}

                                {!semesterCourses.length && (
                                  <tr>
                                    <td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={6}>
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
                      {timetableErrorBySemester[semester._id] && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                          {timetableErrorBySemester[semester._id]}
                        </div>
                      )}
                      {timetableNoticeBySemester[semester._id] && (
                        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
                          {timetableNoticeBySemester[semester._id]}
                        </div>
                      )}

                      {timetableLoadingBySemester[semester._id] ? (
                        <div className="text-sm text-gray-500">Loading timetable...</div>
                      ) : (
                        <>
                          <div className="inline-flex items-center gap-2 rounded-lg bg-gray-100 p-1">
                            <button
                              type="button"
                              onClick={() => handleTimetablePlanChange(semester._id, 'WEEKLY')}
                              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                activeTimetablePlan === 'WEEKLY'
                                  ? 'bg-white text-blue-700 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Weekly Plan
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTimetablePlanChange(semester._id, 'SEMESTER')}
                              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                activeTimetablePlan === 'SEMESTER'
                                  ? 'bg-white text-blue-700 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Semester Plan
                            </button>
                          </div>

                          {activeTimetablePlan === 'WEEKLY' && (
                            <section className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900">Weekly Plan (Mon–Fri)</h4>
                                <button
                                  type="button"
                                  onClick={() => saveWeeklyTimetable(semester._id)}
                                  disabled={timetableSavingBySemester[`weekly:${semester._id}`]}
                                  className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                >
                                  {timetableSavingBySemester[`weekly:${semester._id}`] ? 'Saving...' : 'Save Weekly Plan'}
                                </button>
                              </div>

                              {WEEK_DAYS.map((day) => {
                                const dayRows = timetableEntry.weeklyTimetable?.[day.key] || [];
                                return (
                                  <div key={day.key} className="border border-gray-200 rounded-lg">
                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                      <span className="text-sm font-medium text-gray-800">{day.label}</span>
                                      <button
                                        type="button"
                                        onClick={() => addWeeklySlot(semester._id, day.key)}
                                        className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900"
                                      >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        Add Slot
                                      </button>
                                    </div>

                                    <div className="p-3 space-y-2 max-h-56 overflow-y-auto">
                                      {dayRows.map((slot, index) => (
                                        <div key={`${day.key}-${index}`} className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center">
                                          <input
                                            type="time"
                                            value={slot.startTime || ''}
                                            onChange={(event) =>
                                              updateWeeklyDaySlot(
                                                semester._id,
                                                day.key,
                                                index,
                                                'startTime',
                                                event.target.value
                                              )
                                            }
                                            className="px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                                          />
                                        <input
                                          type="time"
                                          value={slot.endTime || ''}
                                          onChange={(event) =>
                                            updateWeeklyDaySlot(
                                              semester._id,
                                              day.key,
                                              index,
                                              'endTime',
                                              event.target.value
                                            )
                                          }
                                          className="px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                                        />
                                        <select
                                          value={slot.course || ''}
                                          onChange={(event) =>
                                            updateWeeklyDaySlot(
                                              semester._id,
                                              day.key,
                                              index,
                                              'course',
                                              event.target.value
                                            )
                                          }
                                          className="px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                                        >
                                          <option value="">Course</option>
                                          {semesterCourses.map((course) => (
                                            <option key={course._id} value={course._id}>
                                              {course.courseCode || course.title}
                                            </option>
                                          ))}
                                        </select>
                                        <select
                                          value={slot.teacher || ''}
                                          onChange={(event) =>
                                            updateWeeklyDaySlot(
                                              semester._id,
                                              day.key,
                                              index,
                                              'teacher',
                                              event.target.value
                                            )
                                          }
                                          className="px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                                        >
                                          <option value="">Teacher</option>
                                          {teachers.map((teacher) => (
                                            <option key={teacher._id} value={teacher._id}>
                                              {getTeacherDisplayName(teacher) || teacher.email || teacher._id}
                                            </option>
                                          ))}
                                        </select>
                                        <input
                                          type="text"
                                          value={slot.room || ''}
                                          onChange={(event) =>
                                            updateWeeklyDaySlot(
                                              semester._id,
                                              day.key,
                                              index,
                                              'room',
                                              event.target.value
                                            )
                                          }
                                          placeholder="Room"
                                          className="px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeWeeklySlot(semester._id, day.key, index)}
                                          className="inline-flex items-center justify-center px-2 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                                          title="Remove slot"
                                        >
                                          <Trash className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}

                                    {!dayRows.length && (
                                      <p className="text-xs text-gray-500">No slots configured.</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </section>
                          )}

                          {activeTimetablePlan === 'SEMESTER' && (
                            <section className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-gray-900">Semester Plan</h4>
                              <button
                                type="button"
                                onClick={() => saveSemesterPlanData(semester._id)}
                                disabled={timetableSavingBySemester[`plan:${semester._id}`]}
                                className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                              >
                                {timetableSavingBySemester[`plan:${semester._id}`] ? 'Saving...' : 'Save Semester Plan'}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                                <input
                                  type="date"
                                  value={timetableEntry.semesterPlan.startDate || ''}
                                  onChange={(event) =>
                                    updateSemesterPlanField(semester._id, 'startDate', event.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                                <input
                                  type="date"
                                  value={timetableEntry.semesterPlan.endDate || ''}
                                  onChange={(event) =>
                                    updateSemesterPlanField(semester._id, 'endDate', event.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-medium text-gray-800">Holiday / Event / Exam / Timeline Entries</h5>
                              <button
                                type="button"
                                onClick={() => addSemesterPlanItem(semester._id)}
                                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Add Entry
                              </button>
                            </div>

                            <div className="space-y-2 max-h-72 overflow-y-auto border border-gray-200 rounded-lg p-3">
                              {(timetableEntry.semesterPlan.items || []).map((item, index) => (
                                <div key={item.itemId || index} className="grid grid-cols-1 lg:grid-cols-5 gap-2 items-start border border-gray-100 rounded-md p-2">
                                  <select
                                    value={item.type || 'EVENT'}
                                    onChange={(event) =>
                                      updateSemesterPlanItem(
                                        semester._id,
                                        index,
                                        'type',
                                        event.target.value
                                      )
                                    }
                                    className="px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                                  >
                                    {PLAN_TYPE_OPTIONS.map((type) => (
                                      <option key={type} value={type}>
                                        {type}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    value={item.title || ''}
                                    onChange={(event) =>
                                      updateSemesterPlanItem(
                                        semester._id,
                                        index,
                                        'title',
                                        event.target.value
                                      )
                                    }
                                    placeholder="Title"
                                    className="px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                                  />
                                  <input
                                    type="date"
                                    value={item.date || ''}
                                    onChange={(event) =>
                                      updateSemesterPlanItem(
                                        semester._id,
                                        index,
                                        'date',
                                        event.target.value
                                      )
                                    }
                                    className="px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                                  />
                                  <input
                                    value={item.description || ''}
                                    onChange={(event) =>
                                      updateSemesterPlanItem(
                                        semester._id,
                                        index,
                                        'description',
                                        event.target.value
                                      )
                                    }
                                    placeholder="Description"
                                    className="px-2 py-1.5 border border-gray-300 rounded-md text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeSemesterPlanItem(semester._id, index)}
                                    className="inline-flex items-center justify-center px-2 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                                    title="Remove entry"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}

                              {(timetableEntry.semesterPlan.items || []).length === 0 && (
                                <p className="text-xs text-gray-500">No plan entries added yet.</p>
                              )}
                            </div>

                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => shiftCalendarMonth(semester._id, -1)}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-white"
                                >
                                  Prev
                                </button>
                                <span className="text-sm font-medium text-gray-800">{calendarData.label}</span>
                                <button
                                  type="button"
                                  onClick={() => shiftCalendarMonth(semester._id, 1)}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-white"
                                >
                                  Next
                                </button>
                              </div>

                              <div className="grid grid-cols-7 text-[11px] font-semibold uppercase text-gray-500 bg-gray-50 border-b border-gray-200">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                  <div key={day} className="px-2 py-1.5 border-r border-gray-200 last:border-r-0">
                                    {day}
                                  </div>
                                ))}
                              </div>

                              <div className="grid grid-cols-7 text-xs">
                                {calendarData.cells.map((cell) => {
                                  const events = cell.inMonth ? itemsByDate[cell.dateKey] || [] : [];
                                  return (
                                    <div
                                      key={cell.key}
                                      className={`min-h-[64px] border-r border-b border-gray-100 p-1.5 last:border-r-0 ${
                                        cell.inMonth ? 'bg-white' : 'bg-gray-50'
                                      }`}
                                    >
                                      {cell.inMonth ? (
                                        <>
                                          <div className="text-gray-700 font-medium">{cell.day}</div>
                                          {events.length > 0 && (
                                            <div className="mt-1 space-y-1">
                                              {events.slice(0, 2).map((eventItem) => (
                                                <div
                                                  key={`${cell.dateKey}-${eventItem.itemId}`}
                                                  className="truncate rounded bg-blue-50 text-blue-700 px-1 py-0.5 text-[10px]"
                                                  title={`${eventItem.type}: ${eventItem.title}`}
                                                >
                                                  {eventItem.type}: {eventItem.title}
                                                </div>
                                              ))}
                                              {events.length > 2 && (
                                                <div className="text-[10px] text-gray-500">+{events.length - 2} more</div>
                                              )}
                                            </div>
                                          )}
                                        </>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {planEmailSummaryBySemester[semester._id] && (
                              <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2">
                                Email alerts: sent {planEmailSummaryBySemester[semester._id].sent || 0},
                                failed {planEmailSummaryBySemester[semester._id].failed || 0},
                                recipients {planEmailSummaryBySemester[semester._id].recipients || 0}
                              </div>
                            )}
                          </section>
                          )}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Mid-Term Exam Date</label>
                <input
                  type="date"
                  name="midTermExamDate"
                  value={formData.midTermExamDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End-Term Exam Date</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Mid-Term Exam Date</label>
                <input
                  type="date"
                  name="midTermExamDate"
                  value={editFormData.midTermExamDate}
                  onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End-Term Exam Date</label>
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
    </div>
  );
};

export default SemesterManager;
