import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Trash2,
  Mail,
  Phone,
  Calendar,
  UserPlus,
  X,
  Copy,
  Check,
  Shield,
  Save,
  KeyRound,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  bulkDeleteUsers,
  getUserDetails,
  updateUserDetails,
  resetUserPassword
} from '../services/user.service';
import { getProgramsDropdown } from '../services/program.service';
import { getBatchesDropdown } from '../services/batch.service';
import { listRoles } from '../services/role.service';
import StudentImportModal from '../components/userManagement/StudentImportModal';
import {
  MODE_OF_DELIVERY,
  normalizeModeOfDeliveryValue
} from '../constants/modeOfDelivery';
import { getPeriodLabel } from '../utils/periodLabel';

const DEFAULT_PERSONAL_PROFILE = {
  fullName: '',
  email: '',
  phone: '',
  designation: '',
  dob: '',
  gender: '',
  bloodGroup: '',
  category: '',
  motherTongue: '',
  aadhaarMasked: '',
  panMasked: '',
  addressPermanent: '',
  addressCorrespondence: '',
  state: '',
  city: '',
  pin: '',
  photoUrl: '',
  documentsMeta: []
};

const DEFAULT_ACADEMIC_PROFILE = {
  programId: '',
  programCode: '',
  stream: '',
  batchId: '',
  rollNumber: '',
  semester: '',
  stage: '',
  status: '',
  admissionYear: '',
  tenth: { board: '', marks: '', year: '' },
  twelfth: { board: '', marks: '', year: '' },
  diploma: { board: '', marks: '', year: '' },
  workExperience: []
};

const DEFAULT_TEACHER_PROFILE = {
  teacherId: '',
  employeeId: '',
  department: '',
  designation: '',
  qualification: '',
  specialization: '',
  experience: '',
  profTitle: '',
  profDesc: '',
  googleScholarLink: '',
  scopusLink: '',
  linkedInLink: ''
};

const createDetailForm = (payload = {}) => {
  const user = payload.user || {};
  const personalProfile = payload.personalProfile || {};
  const academicProfile = payload.academicProfile || {};
  const linkedTeacher = payload.linked?.teacher || {};

  return {
    user: {
      _id: user._id || '',
      name: user.name || '',
      email: user.email || '',
      username: user.username || '',
      designation: user.designation || personalProfile.designation || '',
      role: user.role || 'student',
      roleKey: user.roleKey || user.role || 'student',
      roleLabel: user.roleLabel || '',
      isActive: user.isActive !== false,
      mobileNo: user.mobileNo || '',
      passwordResetAt: user.passwordResetAt || null
    },
    personalProfile: {
      ...DEFAULT_PERSONAL_PROFILE,
      ...personalProfile,
      designation: personalProfile.designation || user.designation || '',
      dob: personalProfile?.dob ? String(personalProfile.dob).slice(0, 10) : ''
    },
    academicProfile: {
      ...DEFAULT_ACADEMIC_PROFILE,
      ...academicProfile,
      programId: academicProfile?.programId || '',
      batchId: academicProfile?.batchId || '',
      semester:
        academicProfile?.semester === null || academicProfile?.semester === undefined
          ? ''
          : String(academicProfile.semester),
      admissionYear:
        academicProfile?.admissionYear === null || academicProfile?.admissionYear === undefined
          ? ''
          : String(academicProfile.admissionYear),
      tenth: {
        ...DEFAULT_ACADEMIC_PROFILE.tenth,
        ...(academicProfile?.tenth || {}),
        year:
          academicProfile?.tenth?.year === null || academicProfile?.tenth?.year === undefined
            ? ''
            : String(academicProfile.tenth.year)
      },
      twelfth: {
        ...DEFAULT_ACADEMIC_PROFILE.twelfth,
        ...(academicProfile?.twelfth || {}),
        year:
          academicProfile?.twelfth?.year === null || academicProfile?.twelfth?.year === undefined
            ? ''
            : String(academicProfile.twelfth.year)
      },
      diploma: {
        ...DEFAULT_ACADEMIC_PROFILE.diploma,
        ...(academicProfile?.diploma || {}),
        year:
          academicProfile?.diploma?.year === null || academicProfile?.diploma?.year === undefined
            ? ''
            : String(academicProfile.diploma.year)
      }
    },
    teacherProfile: {
      ...DEFAULT_TEACHER_PROFILE,
      ...linkedTeacher
    },
    linked: payload.linked || { teacherAssignments: [] }
  };
};

const normalizePayloadForSave = (form) => {
  const normalized = {
    user: {
      name: form.user.name?.trim() || '',
      email: form.user.email?.trim() || '',
      username: form.user.username?.trim() || '',
      role: form.user.role,
      roleKey: form.user.roleKey || form.user.role,
      isActive: Boolean(form.user.isActive),
      mobileNo: form.user.mobileNo?.trim() || ''
    },
    personalProfile: {
      ...form.personalProfile,
      fullName: form.personalProfile.fullName?.trim() || '',
      email: form.personalProfile.email?.trim() || '',
      phone: form.personalProfile.phone?.trim() || '',
      dob: form.personalProfile.dob || null,
      gender: form.personalProfile.gender?.trim() || '',
      bloodGroup: form.personalProfile.bloodGroup?.trim() || '',
      category: form.personalProfile.category?.trim() || '',
      motherTongue: form.personalProfile.motherTongue?.trim() || '',
      aadhaarMasked: form.personalProfile.aadhaarMasked?.trim() || '',
      panMasked: form.personalProfile.panMasked?.trim() || '',
      addressPermanent: form.personalProfile.addressPermanent?.trim() || '',
      addressCorrespondence: form.personalProfile.addressCorrespondence?.trim() || '',
      state: form.personalProfile.state?.trim() || '',
      city: form.personalProfile.city?.trim() || '',
      pin: form.personalProfile.pin?.trim() || '',
      photoUrl: form.personalProfile.photoUrl?.trim() || ''
    },
    academicProfile: {
      ...form.academicProfile,
      programId: form.academicProfile.programId || null,
      programCode: form.academicProfile.programCode?.trim() || '',
      stream: form.academicProfile.stream?.trim() || '',
      batchId: form.academicProfile.batchId || null,
      rollNumber: form.academicProfile.rollNumber?.trim() || '',
      semester: form.academicProfile.semester === '' ? null : Number(form.academicProfile.semester),
      stage: form.academicProfile.stage?.trim() || '',
      status: form.academicProfile.status?.trim() || '',
      admissionYear:
        form.academicProfile.admissionYear === '' ? null : Number(form.academicProfile.admissionYear),
      tenth: {
        board: form.academicProfile.tenth?.board?.trim() || '',
        marks: form.academicProfile.tenth?.marks?.trim() || '',
        year: form.academicProfile.tenth?.year === '' ? null : Number(form.academicProfile.tenth?.year)
      },
      twelfth: {
        board: form.academicProfile.twelfth?.board?.trim() || '',
        marks: form.academicProfile.twelfth?.marks?.trim() || '',
        year: form.academicProfile.twelfth?.year === '' ? null : Number(form.academicProfile.twelfth?.year)
      },
      diploma: {
        board: form.academicProfile.diploma?.board?.trim() || '',
        marks: form.academicProfile.diploma?.marks?.trim() || '',
        year: form.academicProfile.diploma?.year === '' ? null : Number(form.academicProfile.diploma?.year)
      }
    },
    teacherProfile: {
      ...form.teacherProfile,
      teacherId: form.teacherProfile.teacherId?.trim() || '',
      employeeId: form.teacherProfile.employeeId?.trim() || '',
      department: form.teacherProfile.department?.trim() || '',
      designation: form.teacherProfile.designation?.trim() || '',
      qualification: form.teacherProfile.qualification?.trim() || '',
      specialization: form.teacherProfile.specialization?.trim() || '',
      experience: form.teacherProfile.experience?.trim() || '',
      profTitle: form.teacherProfile.profTitle?.trim() || '',
      profDesc: form.teacherProfile.profDesc?.trim() || '',
      googleScholarLink: form.teacherProfile.googleScholarLink?.trim() || '',
      scopusLink: form.teacherProfile.scopusLink?.trim() || '',
      linkedInLink: form.teacherProfile.linkedInLink?.trim() || ''
    }
  };

  if (!normalized.user.username) {
    delete normalized.user.username;
  }

  return normalized;
};

const USER_MANAGEMENT_SECTIONS = [
  { id: 'student', label: 'Student' },
  { id: 'teacher', label: 'Teacher' },
  { id: 'executive', label: 'Executive Staff' }
];

const STUDENT_MODE_OPTIONS = [
  { id: MODE_OF_DELIVERY.REGULAR, label: 'Regular' },
  { id: MODE_OF_DELIVERY.ONLINE, label: 'Online' },
  { id: MODE_OF_DELIVERY.WILP, label: 'WILP' }
];

const currentYearString = () => String(new Date().getFullYear());

const VALID_USER_SECTIONS = ['student', 'teacher', 'executive'];

const UserManagement = () => {
  const navigate = useNavigate();
  const { userId: routeUserId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roleKey: 'student',
    mobileNo: '',
    employeeId: '',
    designation: '',
    studentType: 'regular',
    studentMode: MODE_OF_DELIVERY.REGULAR,
    rollNumber: '',
    enrollmentNumber: '',
    programId: '',
    batchId: '',
    admissionYear: currentYearString(),
    sessionCode: 'SP'
  });
  const [activeUserSection, setActiveUserSection] = useState(() => {
    const sectionFromUrl = searchParams.get('section');
    return VALID_USER_SECTIONS.includes(sectionFromUrl) ? sectionFromUrl : 'student';
  });
  const [studentModeSelection, setStudentModeSelection] = useState(MODE_OF_DELIVERY.REGULAR);
  const [studentModeFilter, setStudentModeFilter] = useState('');
  const [createContext, setCreateContext] = useState({
    flow: 'generic',
    roleLocked: false,
  });
  const [studentImportModalConfig, setStudentImportModalConfig] = useState({
    open: false,
    variant: 'regular_bulk',
    studentMode: MODE_OF_DELIVERY.REGULAR
  });
  const [roleOptions, setRoleOptions] = useState([]);
  const [roleOptionsError, setRoleOptionsError] = useState('');
  const [rolesLoading, setRolesLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState(null);
  const [filterProgramId, setFilterProgramId] = useState('');
  const [filterBatchId, setFilterBatchId] = useState('');
  const [programsList, setProgramsList] = useState([]);
  const [batchesList, setBatchesList] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNext: false,
    hasPrev: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Detail drawer state
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailSaveError, setDetailSaveError] = useState('');
  const [detailSaveSuccess, setDetailSaveSuccess] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [detailTab, setDetailTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    return ['personal', 'academic', 'security'].includes(tabFromUrl) ? tabFromUrl : 'personal';
  });
  const [detailForm, setDetailForm] = useState(null);
  const [detailBaseline, setDetailBaseline] = useState('');
  const [profilePrograms, setProfilePrograms] = useState([]);
  const [profileBatches, setProfileBatches] = useState([]);
  const [createBatches, setCreateBatches] = useState([]);
  const [createBatchesLoading, setCreateBatchesLoading] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [resetModal, setResetModal] = useState({ open: false, mode: 'manual' });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetResult, setResetResult] = useState(null);

  // Sync activeUserSection & detailTab to URL so tabs persist on refresh
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('section', activeUserSection);
      if (selectedUserId) {
        next.set('tab', detailTab);
      } else {
        next.delete('tab');
      }
      return next;
    }, { replace: true });
  }, [activeUserSection, detailTab, selectedUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const roleOptionsByKey = useMemo(
    () =>
      new Map(
        (roleOptions || []).map((role) => [
          String(role?.key || '')
            .trim()
            .toLowerCase(),
          role
        ])
      ),
    [roleOptions]
  );

  const getRoleAccessRole = useCallback(
    (roleKey) => {
      const normalized = String(roleKey || '')
        .trim()
        .toLowerCase();
      if (!normalized) return '';
      const role = roleOptionsByKey.get(normalized);
      return String(role?.accessRole || normalized)
        .trim()
        .toLowerCase();
    },
    [roleOptionsByKey]
  );

  const resolveDefaultRoleKey = useCallback(
    (preferredAccessRole = 'student') => {
      const preferred = String(preferredAccessRole || 'student')
        .trim()
        .toLowerCase();
      if (preferred === 'admin') {
        const nonAdminRole = roleOptions.find((role) => {
          const key = String(role?.key || '').trim().toLowerCase();
          const accessRole = String(role?.accessRole || '').trim().toLowerCase();
          return accessRole === 'admin' && key && key !== 'admin';
        });
        if (nonAdminRole?.key) {
          return String(nonAdminRole.key).toLowerCase();
        }
      }
      const exact = roleOptions.find((role) => String(role?.key || '').toLowerCase() === preferred);
      if (exact?.key) return String(exact.key).toLowerCase();
      const byAccess = roleOptions.find(
        (role) => String(role?.accessRole || '').toLowerCase() === preferred
      );
      if (byAccess?.key) return String(byAccess.key).toLowerCase();
      return String(roleOptions[0]?.key || preferred).toLowerCase();
    },
    [roleOptions]
  );

  const selectedCreateAccessRole = useMemo(
    () => getRoleAccessRole(formData.roleKey),
    [formData.roleKey, getRoleAccessRole]
  );

  const selectedCreateRoleOption = useMemo(() => {
    const key = String(formData.roleKey || '').trim().toLowerCase();
    return roleOptionsByKey.get(key) || null;
  }, [formData.roleKey, roleOptionsByKey]);

  const isStudentSectionActive = activeUserSection === 'student';

  const onlinePrograms = useMemo(
    () =>
      profilePrograms.filter(
        (program) =>
          normalizeModeOfDeliveryValue(program?.modeOfDelivery) === MODE_OF_DELIVERY.ONLINE
      ),
    [profilePrograms]
  );

  const isDetailDirty = useMemo(() => {
    if (!detailForm || !detailBaseline) return false;
    return JSON.stringify(detailForm) !== detailBaseline;
  }, [detailForm, detailBaseline]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchRoleOptions = useCallback(async () => {
    setRolesLoading(true);
    setRoleOptionsError('');
    try {
      const payload = await listRoles();
      const rows = Array.isArray(payload?.roles) ? payload.roles : [];
      setRoleOptions(rows);
    } catch (err) {
      setRoleOptions([]);
      setRoleOptionsError(err?.response?.data?.error || err?.message || 'Failed to load roles');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoleOptions();
  }, [fetchRoleOptions]);

  useEffect(() => {
    if (!showUserModal || isEditMode) return;
    if (createContext.flow === 'executive_add') return;
    if ((formData.roleKey || '').trim()) return;
    const nextRoleKey = resolveDefaultRoleKey('student');
    setFormData((prev) => ({ ...prev, roleKey: nextRoleKey }));
  }, [showUserModal, isEditMode, formData.roleKey, resolveDefaultRoleKey, createContext.flow]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit,
        sort:
          activeUserSection === 'student'
            ? 'rollNo_asc'
            : 'employeeId_asc'
      };
      if (activeUserSection === 'teacher') {
        params.userType = 'teacher';
      } else if (activeUserSection === 'executive') {
        params.userType = 'executive_staff';
      } else {
        params.userType = 'student';
      }
      if (debouncedSearch) params.search = debouncedSearch;
      if (isStudentSectionActive && filterProgramId) params.program = filterProgramId;
      if (isStudentSectionActive && filterBatchId) params.batch = filterBatchId;
      if (isStudentSectionActive && studentModeFilter) {
        params.mode = studentModeFilter;
      }
      const data = await listUsers(params);
      setUsers(data.users || []);
      setPagination(
        data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalUsers: 0,
          hasNext: false,
          hasPrev: false
        }
      );
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    activeUserSection,
    debouncedSearch,
    filterProgramId,
    filterBatchId,
    isStudentSectionActive,
    studentModeFilter
  ]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
    if (!isStudentSectionActive) {
      setFilterProgramId('');
      setFilterBatchId('');
    }
  }, [isStudentSectionActive]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedUsers([]);
    if (activeUserSection !== 'student') {
      setStudentModeFilter('');
    }
  }, [activeUserSection]);

  useEffect(() => {
    if (isStudentSectionActive) {
      getProgramsDropdown()
        .then((data) => setProgramsList(data || []))
        .catch(() => {});
    }
  }, [isStudentSectionActive]);

  useEffect(() => {
    if (filterProgramId) {
      getBatchesDropdown(filterProgramId)
        .then((data) => setBatchesList(data || []))
        .catch(() => {});
    } else {
      setBatchesList([]);
      setFilterBatchId('');
    }
  }, [filterProgramId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [studentModeFilter]);

  useEffect(() => {
    getProgramsDropdown()
      .then((data) => setProfilePrograms(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const programId = detailForm?.academicProfile?.programId;
    if (!showDetailDrawer) return;
    if (!programId) {
      setProfileBatches([]);
      return;
    }
    getBatchesDropdown(programId)
      .then((data) => setProfileBatches(data || []))
      .catch(() => setProfileBatches([]));
  }, [showDetailDrawer, detailForm?.academicProfile?.programId]);

  useEffect(() => {
    if (!showUserModal || isEditMode || selectedCreateAccessRole !== 'student') return;
    if (!formData.programId) {
      setCreateBatches([]);
      return;
    }

    let cancelled = false;
    setCreateBatchesLoading(true);
    getBatchesDropdown(formData.programId)
      .then((data) => {
        if (cancelled) return;
        setCreateBatches(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setCreateBatches([]);
      })
      .finally(() => {
        if (!cancelled) setCreateBatchesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showUserModal, isEditMode, selectedCreateAccessRole, formData.programId]);

  const resetUserForm = ({
    preferredAccessRole = 'student',
    roleKey = '',
    roleLocked = false,
    flow = 'generic',
    studentType = 'regular',
    studentMode = MODE_OF_DELIVERY.REGULAR
  } = {}) => {
    const defaultRoleKey =
      flow === 'executive_add'
        ? String(roleKey || '').toLowerCase()
        : String(roleKey || resolveDefaultRoleKey(preferredAccessRole)).toLowerCase();
    setCreateContext({
      flow,
      roleLocked
    });
    setFormData({
      name: '',
      email: '',
      roleKey: defaultRoleKey,
      mobileNo: '',
      employeeId: '',
      designation: '',
      studentType,
      studentMode,
      rollNumber: '',
      enrollmentNumber: '',
      programId: '',
      batchId: '',
      admissionYear: currentYearString(),
      sessionCode: 'SP'
    });
    setCreateBatches([]);
    setFormError('');
    setEditingUserId(null);
    setIsEditMode(false);
  };

  const openCreateUserModal = (config = {}) => {
    resetUserForm(config);
    setShowUserModal(true);
  };

  const openStudentSingleImport = () => {
    const normalizedSelectedMode =
      normalizeModeOfDeliveryValue(studentModeSelection) || MODE_OF_DELIVERY.REGULAR;
    if (normalizedSelectedMode === MODE_OF_DELIVERY.ONLINE) {
      return;
    }
    openCreateUserModal({
      preferredAccessRole: 'student',
      roleLocked: true,
      flow:
        normalizedSelectedMode === MODE_OF_DELIVERY.WILP
        ? 'student_wilp_single'
        : 'student_regular_single',
      studentType: 'regular',
      studentMode: normalizedSelectedMode
    });
  };

  const openTeacherAdd = () => {
    openCreateUserModal({
      preferredAccessRole: 'teacher',
      roleLocked: true,
      flow: 'teacher_add'
    });
  };

  const openExecutiveAdd = () => {
    openCreateUserModal({
      preferredAccessRole: 'admin',
      roleKey: '',
      roleLocked: true,
      flow: 'executive_add'
    });
  };

  const openRegularBulkImport = () => {
    const normalizedSelectedMode =
      normalizeModeOfDeliveryValue(studentModeSelection) || MODE_OF_DELIVERY.REGULAR;
    if (normalizedSelectedMode === MODE_OF_DELIVERY.ONLINE) {
      return;
    }
    setStudentImportModalConfig({
      open: true,
      variant: 'regular_bulk',
      studentMode: normalizedSelectedMode
    });
  };

  const openOnlineCrmImport = () => {
    const normalizedSelectedMode =
      normalizeModeOfDeliveryValue(studentModeSelection) || MODE_OF_DELIVERY.REGULAR;
    if (normalizedSelectedMode !== MODE_OF_DELIVERY.ONLINE) {
      return;
    }
    setStudentImportModalConfig({
      open: true,
      variant: 'online_crm',
      studentMode: MODE_OF_DELIVERY.ONLINE
    });
  };

  const openEditUserModal = (user) => {
    setIsEditMode(true);
    setCreateContext({
      flow: 'edit',
      roleLocked: true
    });
    setEditingUserId(user._id);
    const currentRoleKey = String(user.roleKey || user.role || '').trim().toLowerCase() || resolveDefaultRoleKey('student');
    const detectedMode =
      normalizeModeOfDeliveryValue(
        user.studentInfo?.program?.modeOfDelivery || user.studentInfo?.mode
      ) || MODE_OF_DELIVERY.REGULAR;
    setFormData({
      name: user.name || '',
      email: user.email || '',
      roleKey: currentRoleKey,
      mobileNo: user.mobileNo || '',
      employeeId: user.teacherInfo?.employeeId || '',
      designation: user.designation || '',
      studentType: detectedMode === MODE_OF_DELIVERY.ONLINE ? 'online' : 'regular',
      studentMode: detectedMode,
      rollNumber: user.studentInfo?.rollNumber || '',
      enrollmentNumber: user.studentInfo?.enrollmentNumber || '',
      programId: user.studentInfo?.program?._id || '',
      batchId: user.studentInfo?.batch?._id || '',
      admissionYear: currentYearString(),
      sessionCode: 'SP'
    });
    setFormError('');
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    if (formSubmitting) return;
    setShowUserModal(false);
    resetUserForm();
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'studentType') {
        if (value === 'online') {
          next.studentMode = MODE_OF_DELIVERY.ONLINE;
          next.rollNumber = '';
          next.batchId = '';
        } else if (prev.studentMode === MODE_OF_DELIVERY.ONLINE) {
          next.studentMode = MODE_OF_DELIVERY.REGULAR;
          next.programId = '';
          next.batchId = '';
          next.enrollmentNumber = '';
        }
      }
      if (field === 'studentMode') {
        next.studentType = value === MODE_OF_DELIVERY.ONLINE ? 'online' : 'regular';
      }
      if (field === 'programId' && value !== prev.programId) {
        next.batchId = '';
        // Auto-set studentMode from the selected program's modeOfDelivery
        if (value) {
          const selectedProgram = profilePrograms.find((p) => p._id === value);
          const programMode = normalizeModeOfDeliveryValue(selectedProgram?.modeOfDelivery);
          if (programMode) {
            next.studentMode = programMode;
          }
        }
      }
      return next;
    });
    setFormError('');
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    setFeedbackBanner(null);

    try {
      if (!formData.name.trim() || !formData.email.trim()) {
        throw new Error('Name and email are required');
      }

      const isExecutiveCreate = !isEditMode && createContext.flow === 'executive_add';
      const selectedRoleKey = String(formData.roleKey || '').trim().toLowerCase();
      if (!isEditMode && !isExecutiveCreate && !selectedRoleKey) {
        throw new Error('Role is required');
      }
      const mappedAccessRole = isExecutiveCreate ? 'admin' : getRoleAccessRole(selectedRoleKey);

      if (!isEditMode) {
        if (createContext.flow === 'executive_add' && selectedRoleKey === 'admin') {
          throw new Error('Executive Staff cannot be created with ADMIN role.');
        }
        if (mappedAccessRole === 'teacher' && !formData.employeeId.trim()) {
          throw new Error('Employee ID is required for teacher accounts');
        }
        if (createContext.flow === 'executive_add' && !formData.employeeId.trim()) {
          throw new Error('Employee ID is required for executive staff accounts');
        }
        if (mappedAccessRole === 'student') {
          if (formData.studentType === 'online') {
            if (!formData.programId) {
              throw new Error('Program is required for online student enrollment');
            }
            const parsedAdmissionYear = Number.parseInt(String(formData.admissionYear || ''), 10);
            if (!Number.isInteger(parsedAdmissionYear) || parsedAdmissionYear < 1900 || parsedAdmissionYear > 2100) {
              throw new Error('Admission Year is required for online student enrollment');
            }
            const normalizedSession = String(formData.sessionCode || '').trim().toUpperCase();
            if (!['AU', 'SP'].includes(normalizedSession)) {
              throw new Error('Session Code must be AU or SP for online student enrollment');
            }
          }
          if (formData.studentType !== 'online') {
            if (!formData.programId) {
              throw new Error('Program is required for student accounts');
            }
            if (!formData.batchId) {
              throw new Error('Batch is required for student accounts');
            }
            if (!formData.rollNumber.trim()) {
              throw new Error('Roll Number is required for student accounts');
            }
          }
        }
      }

      if (isEditMode) {
        await updateUser(editingUserId, {
          name: formData.name.trim(),
          mobileNo: formData.mobileNo.trim() || undefined
        });
      } else {
        const normalizedStudentMode =
          formData.studentType === 'online'
            ? MODE_OF_DELIVERY.ONLINE
            : formData.studentMode || MODE_OF_DELIVERY.REGULAR;
        const normalizedSessionCode = String(formData.sessionCode || '').trim().toUpperCase();
        const parsedAdmissionYear = Number.parseInt(String(formData.admissionYear || ''), 10);
        const resolvedUserType =
          mappedAccessRole === 'teacher'
            ? 'teacher'
            : mappedAccessRole === 'admin'
            ? 'executive_staff'
            : 'student';
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          userType: resolvedUserType,
          ...(isExecutiveCreate ? {} : { roleKey: selectedRoleKey }),
          mobileNo: formData.mobileNo.trim() || undefined,
          employeeId: formData.employeeId.trim() || undefined,
          designation:
            createContext.flow === 'executive_add'
              ? formData.designation.trim() || undefined
              : undefined,
          studentType: mappedAccessRole === 'student' ? formData.studentType : undefined,
          modeOfDelivery: mappedAccessRole === 'student' ? normalizedStudentMode : undefined,
          mode: mappedAccessRole === 'student' ? normalizedStudentMode : undefined,
          programId: mappedAccessRole === 'student' ? formData.programId || undefined : undefined,
          batchId:
            mappedAccessRole === 'student' && formData.studentType !== 'online'
              ? formData.batchId || undefined
              : undefined,
          admissionYear:
            mappedAccessRole === 'student' &&
            formData.studentType === 'online' &&
            Number.isInteger(parsedAdmissionYear)
              ? parsedAdmissionYear
              : undefined,
          sessionCode:
            mappedAccessRole === 'student' && formData.studentType === 'online'
              ? normalizedSessionCode || undefined
              : undefined,
          rollNumber: mappedAccessRole === 'student' ? formData.rollNumber.trim() || undefined : undefined,
          enrollmentNumber:
            mappedAccessRole === 'student' ? formData.enrollmentNumber.trim() || undefined : undefined
        };
        const response = await createUser(payload);
        const emailSent = response?.emailStatus === 'SENT';
        const generatedEnrollmentNo =
          response?.generatedEnrollmentNumber ||
          (response?.userIdMapping?.source === 'Enrollment Number'
            ? response?.userIdMapping?.userId
            : '');
        setFeedbackBanner({
          type: emailSent ? 'success' : response?.emailStatus === 'FAILED' ? 'error' : 'success',
          text: emailSent
            ? `User created and credentials email sent.${
                generatedEnrollmentNo ? ` Enrollment No: ${generatedEnrollmentNo}.` : ''
              }`
            : response?.emailStatus === 'FAILED'
            ? `User created but credentials email failed. ${
                response?.emailMessage || 'Use Reset Password to resend credentials.'
              }${generatedEnrollmentNo ? ` Enrollment No: ${generatedEnrollmentNo}.` : ''}`
            : `User created. ${response?.emailMessage || 'Credentials email skipped.'}${
                generatedEnrollmentNo ? ` Enrollment No: ${generatedEnrollmentNo}.` : ''
              }`
        });
      }

      await fetchUsers();
      closeUserModal();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Failed to save user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === users.length ? [] : users.map((user) => user._id)
    );
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This will remove all related data.')) {
      return;
    }
    setDeleting(userId);
    try {
      await deleteUser(userId);
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
      await fetchUsers();
      if (selectedUserId === userId) {
        setShowDetailDrawer(false);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} users? This cannot be undone.`)) {
      return;
    }
    setBulkDeleting(true);
    try {
      await bulkDeleteUsers(selectedUsers);
      setSelectedUsers([]);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete users');
    } finally {
      setBulkDeleting(false);
    }
  };

  const openUserDetail = async (userId) => {
    if (isDetailDirty) {
      const shouldContinue = window.confirm(
        'You have unsaved changes. Discard them and open another profile?'
      );
      if (!shouldContinue) return;
    }

    setShowDetailDrawer(true);
    setSelectedUserId(userId);
    setDetailLoading(true);
    setDetailError('');
    setDetailSaveError('');
    setDetailSaveSuccess('');
    setResetError('');
    setResetResult(null);
    setPasswordInput('');
    setPasswordCopied(false);
    setDetailTab('personal');

    try {
      const response = await getUserDetails(userId);
      const nextForm = createDetailForm(response);
      setDetailForm(nextForm);
      setDetailBaseline(JSON.stringify(nextForm));
    } catch (err) {
      setDetailError(err.response?.data?.error || err.message || 'Failed to load user profile');
      setDetailForm(null);
      setDetailBaseline('');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!routeUserId) return;
    if (showDetailDrawer && selectedUserId === routeUserId) return;
    openUserDetail(routeUserId);
  }, [routeUserId, showDetailDrawer, selectedUserId]);

  const closeDetailDrawer = () => {
    if (detailSaving || resetLoading) return;
    if (isDetailDirty) {
      const shouldClose = window.confirm('You have unsaved changes. Close without saving?');
      if (!shouldClose) return;
    }
    setShowDetailDrawer(false);
    setSelectedUserId('');
    setDetailForm(null);
    setDetailBaseline('');
    setDetailError('');
    setDetailSaveError('');
    setDetailSaveSuccess('');
    setResetResult(null);
    setResetError('');
    setPasswordInput('');
    setProfileBatches([]);
    if (routeUserId) {
      navigate('/users', { replace: true });
    }
  };

  const handleDetailFieldChange = (section, field, value) => {
    setDetailSaveError('');
    setDetailSaveSuccess('');
    setDetailForm((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };

      if (section === 'personalProfile' && field === 'fullName') {
        next.user = { ...next.user, name: value };
      }
      if (section === 'personalProfile' && field === 'email') {
        next.user = { ...next.user, email: value };
      }
      if (section === 'personalProfile' && field === 'phone') {
        next.user = { ...next.user, mobileNo: value };
      }

      if (section === 'user' && field === 'name') {
        next.personalProfile = { ...next.personalProfile, fullName: value };
      }
      if (section === 'user' && field === 'email') {
        next.personalProfile = { ...next.personalProfile, email: value };
      }
      if (section === 'user' && field === 'mobileNo') {
        next.personalProfile = { ...next.personalProfile, phone: value };
      }

      if (
        section === 'user' &&
        (field === 'role' || field === 'roleKey') &&
        getRoleAccessRole(value) !== 'student'
      ) {
        next.academicProfile = {
          ...next.academicProfile,
          programId: '',
          batchId: '',
          rollNumber: ''
        };
      }

      if (section === 'academicProfile' && field === 'programId' && value !== prev.academicProfile.programId) {
        next.academicProfile = {
          ...next.academicProfile,
          programId: value,
          batchId: ''
        };
      }

      return next;
    });
  };

  const handleDetailRoleChange = (roleKeyValue) => {
    const normalizedRoleKey = String(roleKeyValue || '')
      .trim()
      .toLowerCase();
    const accessRole = getRoleAccessRole(normalizedRoleKey);
    const selectedRole = roleOptionsByKey.get(normalizedRoleKey);

    setDetailSaveError('');
    setDetailSaveSuccess('');
    setDetailForm((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        user: {
          ...prev.user,
          roleKey: normalizedRoleKey,
          role: accessRole,
          roleLabel: selectedRole?.label || prev.user.roleLabel || normalizedRoleKey
        }
      };
      if (accessRole !== 'student') {
        next.academicProfile = {
          ...next.academicProfile,
          programId: '',
          batchId: '',
          rollNumber: ''
        };
      }
      return next;
    });
  };

  const handleAcademicScoreChange = (level, field, value) => {
    setDetailSaveError('');
    setDetailSaveSuccess('');
    setDetailForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        academicProfile: {
          ...prev.academicProfile,
          [level]: {
            ...(prev.academicProfile[level] || {}),
            [field]: value
          }
        }
      };
    });
  };

  const handleSaveDetails = async () => {
    if (!selectedUserId || !detailForm) return;

    setDetailSaving(true);
    setDetailSaveError('');
    setDetailSaveSuccess('');

    try {
      const payload = normalizePayloadForSave(detailForm);
      const response = await updateUserDetails(selectedUserId, payload);
      const nextForm = createDetailForm(response);
      setDetailForm(nextForm);
      setDetailBaseline(JSON.stringify(nextForm));
      setDetailSaveSuccess('User profile updated successfully.');
      await fetchUsers();
    } catch (err) {
      setDetailSaveError(err.response?.data?.error || err.message || 'Failed to save user profile');
    } finally {
      setDetailSaving(false);
    }
  };

  const openResetConfirm = (mode) => {
    if (mode === 'manual' && !passwordInput.trim()) {
      setResetError('Enter a password before resetting.');
      return;
    }
    setResetError('');
    setResetModal({ open: true, mode });
  };

  const closeResetConfirm = () => {
    if (resetLoading) return;
    setResetModal({ open: false, mode: 'manual' });
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedUserId) return;

    setResetLoading(true);
    setResetError('');
    setResetResult(null);

    try {
      const payload =
        resetModal.mode === 'generate'
          ? { generateTemp: true }
          : { newPassword: passwordInput.trim() };

      const response = await resetUserPassword(selectedUserId, payload);
      setResetResult(response);
      setPasswordInput('');
      setPasswordCopied(false);
      setResetModal({ open: false, mode: 'manual' });

      setDetailForm((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          user: {
            ...prev.user,
            passwordResetAt: response.passwordResetAt || prev.user.passwordResetAt
          }
        };
      });
    } catch (err) {
      setResetError(err.response?.data?.error || err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyGeneratedPassword = async () => {
    if (!resetResult?.tempPassword) return;
    try {
      await navigator.clipboard.writeText(resetResult.tempPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 1500);
    } catch {
      setPasswordCopied(false);
    }
  };

  const getAccessRoleBadge = (roleTag) => {
    const config = {
      ADMIN: 'bg-red-100 text-red-800',
      DEAN: 'bg-amber-100 text-amber-800',
      ASSOCIATE_DEAN: 'bg-orange-100 text-orange-800',
      PROGRAM_COORDINATOR: 'bg-emerald-100 text-emerald-800',
      COURSE_COORDINATOR: 'bg-sky-100 text-sky-800',
      TEACHER: 'bg-blue-100 text-blue-800',
      TA: 'bg-indigo-100 text-indigo-800',
      STUDENT: 'bg-violet-100 text-violet-800'
    };
    return config[String(roleTag || '').trim().toUpperCase()] || 'bg-gray-100 text-gray-700';
  };

  const getStatusBadge = (isActive) => {
    return isActive === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  };

  const getSourceBadge = (targetUser) => {
    const raw =
      targetUser?.studentInfo?.sourceType ||
      targetUser?.sourceType ||
      '';
    const normalized = String(raw).trim().toUpperCase();

    if (normalized === 'CRM') {
      return {
        label: 'CRM',
        className: 'bg-indigo-100 text-indigo-800'
      };
    }
    if (normalized === 'BULK_UPLOAD' || normalized === 'BULK') {
      return {
        label: 'Bulk Upload',
        className: 'bg-amber-100 text-amber-800'
      };
    }
    return {
      label: 'Manual',
      className: 'bg-slate-100 text-slate-700'
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserIdDisplayInfo = (targetUser) => {
    if (!targetUser) return { label: 'User ID', value: '—' };
    const accessRole = String(targetUser.roleAccessRole || targetUser.role || '')
      .trim()
      .toLowerCase();

    if (accessRole === 'teacher') {
      const value =
        targetUser.userId ||
        targetUser.teacherInfo?.employeeId ||
        targetUser.employeeId ||
        '';
      return { label: 'Employee ID / User ID', value: value || '—' };
    }

    if (accessRole === 'student') {
      const mode = String(
        targetUser.studentInfo?.program?.modeOfDelivery || targetUser.studentInfo?.mode || ''
      )
        .trim()
        .toLowerCase();
      if (mode === 'online') {
        return {
          label: 'Enrollment Number / User ID',
          value:
            targetUser.userId ||
            targetUser.studentInfo?.enrollmentNumber ||
            '—'
        };
      }
      return {
        label: 'Roll Number / User ID',
        value: targetUser.userId || targetUser.studentInfo?.rollNumber || '—'
      };
    }

    return { label: 'User ID', value: targetUser.userId || targetUser.username || targetUser.email || '—' };
  };

  const getTabPrimaryIdentifierInfo = (targetUser) => {
    if (!targetUser) return { label: 'Identifier', value: '—' };

    if (activeUserSection === 'student') {
      const value =
        targetUser.studentInfo?.rollNumber ||
        targetUser.academicProfile?.rollNumber ||
        targetUser.rollNumber ||
        targetUser.rollNo ||
        '—';
      return { label: 'Roll No', value: value || '—' };
    }

    const employeeId =
      targetUser.teacherInfo?.employeeId ||
      targetUser.employeeId ||
      targetUser.userId ||
      '—';
    return { label: 'Employee ID', value: employeeId || '—' };
  };

  const renderPageButtons = () => {
    const pages = [];
    const total = pagination.totalPages;
    const current = pagination.currentPage;

    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    if (end < total) {
      if (end < total - 1) pages.push('...');
      pages.push(total);
    }

    return pages;
  };

  const tabs = [
    { id: 'personal', label: 'Personal Details' },
    { id: 'academic', label: 'Academic Details' },
    { id: 'security', label: 'Account & Security' }
  ];
  const listEntityLabel =
    activeUserSection === 'student'
      ? 'students'
      : activeUserSection === 'teacher'
      ? 'teachers'
      : activeUserSection === 'executive'
      ? 'executive users'
      : 'users';
  const normalizedSelectedStudentMode =
    normalizeModeOfDeliveryValue(studentModeSelection) || MODE_OF_DELIVERY.REGULAR;
  const isOnlineModeSelected = normalizedSelectedStudentMode === MODE_OF_DELIVERY.ONLINE;
  const bulkSingleAllowedForMode = !isOnlineModeSelected;
  const crmAllowedForMode = isOnlineModeSelected;
  const isSingleImportRegularWilpFlow =
    createContext.flow === 'student_regular_single' ||
    createContext.flow === 'student_wilp_single';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">{pagination.totalUsers} total users</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {USER_MANAGEMENT_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveUserSection(section.id)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  activeUserSection === section.id
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeUserSection === 'student' && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-800">Import Student</div>
                <div className="text-sm text-gray-600">
                  Choose mode first. Regular/WILP support Bulk + Single. Online supports CRM Pull only.
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Mode</div>
                <div className="flex flex-wrap gap-2">
                  {STUDENT_MODE_OPTIONS.map((modeOption) => (
                    <button
                      key={modeOption.id}
                      type="button"
                      onClick={() => setStudentModeSelection(modeOption.id)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        studentModeSelection === modeOption.id
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {modeOption.label}
                    </button>
                  ))}
                </div>
              </div>
              {isOnlineModeSelected && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  Online students are onboarded only via CRM Pull. Bulk/Single import is not available.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openRegularBulkImport}
                  disabled={!bulkSingleAllowedForMode}
                  className={`inline-flex items-center rounded-lg border px-3 py-2 text-sm ${
                    bulkSingleAllowedForMode
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-100'
                  }`}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  Open Bulk Import
                </button>
                <button
                  type="button"
                  onClick={openStudentSingleImport}
                  disabled={!bulkSingleAllowedForMode}
                  className={`inline-flex items-center rounded-lg px-3 py-2 text-sm ${
                    bulkSingleAllowedForMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-white cursor-not-allowed'
                  }`}
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Open Single Import
                </button>
                <button
                  type="button"
                  onClick={openOnlineCrmImport}
                  disabled={!crmAllowedForMode}
                  className={`inline-flex items-center rounded-lg border px-3 py-2 text-sm ${
                    crmAllowedForMode
                      ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      : 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-100'
                  }`}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  CRM Pull
                </button>
              </div>
            </div>
          )}

          {activeUserSection === 'teacher' && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-800">Teacher Add</div>
                <div className="text-sm text-gray-600">
                  Required fields: Employee ID, Name, Email.
                </div>
              </div>
              <button
                type="button"
                onClick={openTeacherAdd}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Teacher
              </button>
            </div>
          )}

          {activeUserSection === 'executive' && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-800">Executive Staff Add</div>
                <div className="text-sm text-gray-600">
                  Adds executive staff with Employee ID, Name, Email, and Designation.
                </div>
              </div>
              <button
                type="button"
                onClick={openExecutiveAdd}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </button>
            </div>
          )}
        </div>

        {activeUserSection === 'student' && (
          <div className="text-sm font-semibold text-gray-800">Student List</div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or mobile..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {activeUserSection === 'student' && (
            <select
              value={studentModeFilter}
              onChange={(e) => setStudentModeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Modes</option>
              <option value={MODE_OF_DELIVERY.REGULAR}>Regular</option>
              <option value={MODE_OF_DELIVERY.ONLINE}>Online</option>
              <option value={MODE_OF_DELIVERY.WILP}>WILP</option>
            </select>
          )}

          {isStudentSectionActive && (
            <>
              <select
                value={filterProgramId}
                onChange={(e) => {
                  setFilterProgramId(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Programs</option>
                {programsList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
              <select
                value={filterBatchId}
                onChange={(e) => {
                  setFilterBatchId(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={!filterProgramId}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              >
                <option value="">All Batches</option>
                {batchesList.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        {roleOptionsError && (
          <p className="mt-2 text-sm text-red-600">{roleOptionsError}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchUsers}
              className="px-3 py-1 text-sm text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {feedbackBanner && (
        <div
          className={`rounded-lg border p-4 ${
            feedbackBanner.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">{feedbackBanner.text}</p>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-xs underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {loading && !error && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                  {selectedUsers.length > 0
                    ? `${selectedUsers.length} selected`
                    : `${users.length} ${listEntityLabel} on this page`}
                </span>
              </div>

              {selectedUsers.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="px-3 py-1 text-sm text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50"
                >
                  {bulkDeleting ? 'Deleting...' : `Delete ${selectedUsers.length} Users`}
                </button>
              )}
            </div>
          </div>

          {users.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">No users found.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/users/${user._id}/profile`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => handleSelectUser(user._id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />

                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-sm">{getInitials(user.name)}</span>
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{user.name}</h3>
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {getTabPrimaryIdentifierInfo(user).label}: {getTabPrimaryIdentifierInfo(user).value}
                        </div>
                        {getUserIdDisplayInfo(user).value !== getTabPrimaryIdentifierInfo(user).value && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {getUserIdDisplayInfo(user).label}: {getUserIdDisplayInfo(user).value}
                          </div>
                        )}
                        {user.designation && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Designation: {user.designation}
                          </div>
                        )}
                        {user.mobileNo && (
                          <div className="flex items-center text-sm text-gray-500 mt-0.5">
                            <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                            {user.mobileNo}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="flex flex-wrap items-center justify-end gap-1 max-w-[260px]">
                        {Array.isArray(user.accessRoles) && user.accessRoles.length > 0 ? (
                          [...new Set(user.accessRoles
                            .map((tag) => String(tag || '').trim().toUpperCase())
                            .filter(Boolean))]
                            .map((tag) => (
                              <span
                                key={`${user._id}-${tag}`}
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getAccessRoleBadge(
                                  tag
                                )}`}
                              >
                                {tag}
                              </span>
                            ))
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            No Tags
                          </span>
                        )}
                      </div>

                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          getSourceBadge(user).className
                        }`}
                      >
                        Source: {getSourceBadge(user).label}
                      </span>

                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                          user.isActive
                        )}`}
                      >
                        {user.isActive === false ? 'Inactive' : 'Active'}
                      </span>

                      <div className="text-sm text-gray-500 hidden md:flex flex-col items-end">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(user.createdAt)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user._id);
                          }}
                          disabled={deleting === user._id}
                          className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                          title="Delete User"
                        >
                          <Trash2 className={`w-4 h-4 ${deleting === user._id ? 'animate-pulse' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalUsers} total)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={!pagination.hasPrev}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-3 py-1 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {renderPageButtons().map((page, idx) =>
                    page === '...' ? (
                      <span key={`dots-${idx}`} className="px-2 text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded-lg ${
                          currentPage === page
                            ? 'text-white bg-blue-600'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    disabled={!pagination.hasNext}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3 py-1 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="shrink-0 border-b border-gray-200 px-5 py-4">
              <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{isEditMode ? 'Edit User' : 'Add User'}</h2>
              <button
                onClick={closeUserModal}
                className="text-gray-400 hover:text-gray-600"
                disabled={formSubmitting}
              >
                <X className="h-5 w-5" />
              </button>
              </div>
            </div>

            <form onSubmit={handleSubmitUser} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {formError && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
                <input
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter full name"
                  disabled={formSubmitting}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                  placeholder="Enter email"
                  disabled={formSubmitting || isEditMode}
                  required
                />
              </div>

              {!isEditMode && createContext.flow !== 'executive_add' && (
                <>
                  {createContext.roleLocked ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                      <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                        {selectedCreateRoleOption?.label || formData.roleKey || '—'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Role *</label>
                      <select
                        value={formData.roleKey}
                        onChange={(e) => handleFormChange('roleKey', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                        disabled={formSubmitting || isEditMode || rolesLoading}
                      >
                        {roleOptions.length === 0 ? (
                          <option value="">No roles available</option>
                        ) : (
                          roleOptions.map((role) => (
                            <option key={role._id || role.key} value={String(role.key || '').toLowerCase()}>
                              {role.label}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}
                </>
              )}

              {!isEditMode &&
                (selectedCreateAccessRole === 'teacher' || createContext.flow === 'executive_add') && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Employee ID *</label>
                  <input
                    value={formData.employeeId}
                    onChange={(e) => handleFormChange('employeeId', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="Enter employee ID"
                    disabled={formSubmitting}
                    required
                  />
                </div>
              )}

              {!isEditMode && createContext.flow === 'executive_add' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Designation</label>
                  <input
                    value={formData.designation}
                    onChange={(e) => handleFormChange('designation', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    placeholder="Enter designation"
                    disabled={formSubmitting}
                  />
                </div>
              )}

              {!isEditMode && selectedCreateAccessRole === 'student' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Student Type *</label>
                    <select
                      value={formData.studentType}
                      onChange={(e) => handleFormChange('studentType', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                      disabled={formSubmitting || isSingleImportRegularWilpFlow}
                    >
                      <option value="regular">Regular Student</option>
                      {!isSingleImportRegularWilpFlow && (
                        <option value="online">Online Student</option>
                      )}
                    </select>
                  </div>
                  {isSingleImportRegularWilpFlow && (
                    <p className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      Online onboarding is available only via CRM Pull.
                    </p>
                  )}

                  {formData.studentType === 'online' ? (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Program *</label>
                        <select
                          value={formData.programId}
                          onChange={(e) => handleFormChange('programId', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          disabled={formSubmitting}
                        >
                          <option value="">Select online program</option>
                          {onlinePrograms.map((program) => (
                            <option key={program._id} value={program._id}>
                              {program.name} ({program.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Admission Year *
                          </label>
                          <input
                            type="number"
                            min="1900"
                            max="2100"
                            value={formData.admissionYear}
                            onChange={(e) => handleFormChange('admissionYear', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            placeholder="2025"
                            disabled={formSubmitting}
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Session Code *
                          </label>
                          <select
                            value={formData.sessionCode}
                            onChange={(e) => handleFormChange('sessionCode', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            disabled={formSubmitting}
                          >
                            <option value="SP">SP (Spring)</option>
                            <option value="AU">AU (Autumn)</option>
                          </select>
                        </div>
                      </div>
                      <p className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                        Enrollment Number and User ID will be auto-generated after create.
                      </p>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Program *</label>
                        <select
                          value={formData.programId}
                          onChange={(e) => handleFormChange('programId', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          disabled={formSubmitting}
                        >
                          <option value="">Select program</option>
                          {profilePrograms.map((program) => (
                            <option key={program._id} value={program._id}>
                              {program.name} ({program.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Batch *</label>
                        <select
                          value={formData.batchId}
                          onChange={(e) => handleFormChange('batchId', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
                          disabled={formSubmitting || !formData.programId || createBatchesLoading}
                        >
                          <option value="">
                            {createBatchesLoading ? 'Loading batches...' : 'Select batch'}
                          </option>
                          {createBatches.map((batch) => (
                            <option key={batch._id} value={batch._id}>
                              {batch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Mode of Delivery
                        </label>
                        <select
                          value={formData.studentMode}
                          onChange={(e) => handleFormChange('studentMode', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-gray-50 text-gray-600 focus:outline-none"
                          disabled
                        >
                          {STUDENT_MODE_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Roll Number *</label>
                        <input
                          value={formData.rollNumber}
                          onChange={(e) => handleFormChange('rollNumber', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          placeholder="Enter roll number"
                          disabled={formSubmitting}
                          required
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                <input
                  value={formData.mobileNo}
                  onChange={(e) => handleFormChange('mobileNo', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Optional mobile number"
                  disabled={formSubmitting}
                />
              </div>
              </div>

              <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-3">
                <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={
                    formSubmitting ||
                    (!isEditMode &&
                      createContext.flow !== 'executive_add' &&
                      !formData.roleKey)
                  }
                >
                  {formSubmitting ? 'Saving...' : isEditMode ? 'Update User' : 'Create User'}
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailDrawer && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetailDrawer} />

          <div className="relative ml-auto h-full w-full max-w-5xl bg-white shadow-2xl flex flex-col">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {detailForm?.user?.name || 'Loading...'}
                    {detailForm?.user?.email ? ` • ${detailForm.user.email}` : ''}
                  </p>
                </div>
                <button
                  onClick={closeDetailDrawer}
                  className="rounded p-2 text-gray-500 hover:bg-gray-100"
                  disabled={detailSaving || resetLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      detailTab === tab.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {detailLoading && (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                </div>
              )}

              {!detailLoading && detailError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                  {detailError}
                </div>
              )}

              {!detailLoading && !detailError && detailForm && (
                <>
                  {detailSaveError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                      {detailSaveError}
                    </div>
                  )}
                  {detailSaveSuccess && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700 text-sm">
                      {detailSaveSuccess}
                    </div>
                  )}

                  {detailTab === 'personal' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                          <input
                            value={detailForm.personalProfile.fullName}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'fullName', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            value={detailForm.personalProfile.email}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'email', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
                          <input
                            value={detailForm.user.username}
                            onChange={(e) => handleDetailFieldChange('user', 'username', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            placeholder="Optional username"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                          <input
                            value={detailForm.personalProfile.phone}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'phone', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        {detailForm.user.role === 'admin' && (
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Designation</label>
                            <input
                              value={detailForm.user.designation || detailForm.personalProfile.designation || ''}
                              readOnly
                              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700"
                            />
                          </div>
                        )}
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Date of Birth</label>
                          <input
                            type="date"
                            value={detailForm.personalProfile.dob}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'dob', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Gender</label>
                          <input
                            value={detailForm.personalProfile.gender}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'gender', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Blood Group</label>
                          <input
                            value={detailForm.personalProfile.bloodGroup}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'bloodGroup', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                          <input
                            value={detailForm.personalProfile.category}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'category', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Mother Tongue</label>
                          <input
                            value={detailForm.personalProfile.motherTongue}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'motherTongue', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Aadhaar (masked)</label>
                          <input
                            value={detailForm.personalProfile.aadhaarMasked}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'aadhaarMasked', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">PAN/Passport (masked)</label>
                          <input
                            value={detailForm.personalProfile.panMasked}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'panMasked', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Photo URL</label>
                          <input
                            value={detailForm.personalProfile.photoUrl}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'photoUrl', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Permanent Address
                          </label>
                          <textarea
                            value={detailForm.personalProfile.addressPermanent}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'addressPermanent', e.target.value)
                            }
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Correspondence Address
                          </label>
                          <textarea
                            value={detailForm.personalProfile.addressCorrespondence}
                            onChange={(e) =>
                              handleDetailFieldChange(
                                'personalProfile',
                                'addressCorrespondence',
                                e.target.value
                              )
                            }
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
                          <input
                            value={detailForm.personalProfile.state}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'state', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                          <input
                            value={detailForm.personalProfile.city}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'city', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">PIN</label>
                          <input
                            value={detailForm.personalProfile.pin}
                            onChange={(e) =>
                              handleDetailFieldChange('personalProfile', 'pin', e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {detailTab === 'academic' && (
                    <div className="space-y-5">
                      {detailForm.user.role === 'teacher' ? (
                        <>
                          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800 text-sm">
                            Teacher role selected. Showing teacher professional details.
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Teacher ID</label>
                              <input
                                value={detailForm.teacherProfile.teacherId}
                                onChange={(e) =>
                                  handleDetailFieldChange('teacherProfile', 'teacherId', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Employee ID</label>
                              <input
                                value={detailForm.teacherProfile.employeeId}
                                onChange={(e) =>
                                  handleDetailFieldChange('teacherProfile', 'employeeId', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Department</label>
                              <input
                                value={detailForm.teacherProfile.department}
                                onChange={(e) =>
                                  handleDetailFieldChange('teacherProfile', 'department', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Designation</label>
                              <input
                                value={detailForm.teacherProfile.designation}
                                onChange={(e) =>
                                  handleDetailFieldChange('teacherProfile', 'designation', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Qualification</label>
                              <input
                                value={detailForm.teacherProfile.qualification}
                                onChange={(e) =>
                                  handleDetailFieldChange('teacherProfile', 'qualification', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Specialization</label>
                              <input
                                value={detailForm.teacherProfile.specialization}
                                onChange={(e) =>
                                  handleDetailFieldChange('teacherProfile', 'specialization', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Google Scholar</label>
                              <input
                                value={detailForm.teacherProfile.googleScholarLink}
                                onChange={(e) =>
                                  handleDetailFieldChange(
                                    'teacherProfile',
                                    'googleScholarLink',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Scopus</label>
                              <input
                                value={detailForm.teacherProfile.scopusLink}
                                onChange={(e) =>
                                  handleDetailFieldChange('teacherProfile', 'scopusLink', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">LinkedIn</label>
                              <input
                                value={detailForm.teacherProfile.linkedInLink}
                                onChange={(e) =>
                                  handleDetailFieldChange('teacherProfile', 'linkedInLink', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Profile Title</label>
                            <input
                              value={detailForm.teacherProfile.profTitle}
                              onChange={(e) =>
                                handleDetailFieldChange('teacherProfile', 'profTitle', e.target.value)
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Profile Description</label>
                            <textarea
                              rows={3}
                              value={detailForm.teacherProfile.profDesc}
                              onChange={(e) =>
                                handleDetailFieldChange('teacherProfile', 'profDesc', e.target.value)
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            />
                          </div>

                          <div className="rounded-lg border border-gray-200 p-4">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">Current Teaching Assignments</h4>
                            {detailForm.linked?.teacherAssignments?.length ? (
                              <div className="space-y-2 text-sm">
                                {detailForm.linked.teacherAssignments.map((assignment) => (
                                  <div
                                    key={assignment.assignmentId}
                                    className="rounded border border-gray-200 px-3 py-2"
                                  >
                                    <div className="font-medium text-gray-900">
                                      {assignment.course?.title || 'Untitled Course'} ({assignment.course?.courseCode || '—'})
                                    </div>
                                    <div className="text-gray-600">
                                      {assignment.batch?.name || 'No batch'} • {assignment.semester?.name || 'No semester'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No assignments found.</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Program</label>
                              <select
                                value={detailForm.academicProfile.programId}
                                onChange={(e) =>
                                  handleDetailFieldChange('academicProfile', 'programId', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              >
                                <option value="">Select program</option>
                                {profilePrograms.map((program) => (
                                  <option key={program._id} value={program._id}>
                                    {program.name} ({program.code})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Batch</label>
                              <select
                                value={detailForm.academicProfile.batchId}
                                onChange={(e) =>
                                  handleDetailFieldChange('academicProfile', 'batchId', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                                disabled={!detailForm.academicProfile.programId}
                              >
                                <option value="">Select batch</option>
                                {profileBatches.map((batch) => (
                                  <option key={batch._id} value={batch._id}>
                                    {batch.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Program Code</label>
                              <input
                                value={detailForm.academicProfile.programCode}
                                onChange={(e) =>
                                  handleDetailFieldChange('academicProfile', 'programCode', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Roll Number</label>
                              <input
                                value={detailForm.academicProfile.rollNumber}
                                onChange={(e) =>
                                  handleDetailFieldChange('academicProfile', 'rollNumber', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Stream</label>
                              <input
                                value={detailForm.academicProfile.stream}
                                onChange={(e) =>
                                  handleDetailFieldChange('academicProfile', 'stream', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">{getPeriodLabel(profilePrograms.find(p => p._id === detailForm.academicProfile.programId)?.periodType)}</label>
                              <input
                                type="number"
                                value={detailForm.academicProfile.semester}
                                onChange={(e) =>
                                  handleDetailFieldChange('academicProfile', 'semester', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Stage</label>
                              <input
                                value={detailForm.academicProfile.stage}
                                onChange={(e) =>
                                  handleDetailFieldChange('academicProfile', 'stage', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                              <input
                                value={detailForm.academicProfile.status}
                                onChange={(e) =>
                                  handleDetailFieldChange('academicProfile', 'status', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Admission Year</label>
                              <input
                                type="number"
                                value={detailForm.academicProfile.admissionYear}
                                onChange={(e) =>
                                  handleDetailFieldChange('academicProfile', 'admissionYear', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
                            <h4 className="text-sm font-semibold text-gray-800">Academic History</h4>
                            {['tenth', 'twelfth', 'diploma'].map((level) => (
                              <div key={level} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                  value={detailForm.academicProfile[level]?.board || ''}
                                  onChange={(e) => handleAcademicScoreChange(level, 'board', e.target.value)}
                                  placeholder={`${level} board`}
                                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                                />
                                <input
                                  value={detailForm.academicProfile[level]?.marks || ''}
                                  onChange={(e) => handleAcademicScoreChange(level, 'marks', e.target.value)}
                                  placeholder={`${level} marks`}
                                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                                />
                                <input
                                  type="number"
                                  value={detailForm.academicProfile[level]?.year || ''}
                                  onChange={(e) => handleAcademicScoreChange(level, 'year', e.target.value)}
                                  placeholder={`${level} year`}
                                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {detailTab === 'security' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                          <select
                            value={detailForm.user.roleKey || detailForm.user.role}
                            onChange={(e) => handleDetailRoleChange(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          >
                            {roleOptions.length === 0 ? (
                              <option value={detailForm.user.roleKey || detailForm.user.role}>
                                {detailForm.user.roleLabel || detailForm.user.roleKey || detailForm.user.role}
                              </option>
                            ) : (
                              roleOptions.map((role) => (
                                <option key={role._id || role.key} value={String(role.key || '').toLowerCase()}>
                                  {role.label}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Account Status</label>
                          <button
                            type="button"
                            onClick={() =>
                              handleDetailFieldChange('user', 'isActive', !detailForm.user.isActive)
                            }
                            className={`w-full rounded-lg border px-3 py-2 text-left ${
                              detailForm.user.isActive
                                ? 'border-green-300 bg-green-50 text-green-800'
                                : 'border-red-300 bg-red-50 text-red-800'
                            }`}
                          >
                            {detailForm.user.isActive ? 'Active (click to deactivate)' : 'Inactive (click to activate)'}
                          </button>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Primary Email</label>
                          <input
                            type="email"
                            value={detailForm.user.email}
                            onChange={(e) => handleDetailFieldChange('user', 'email', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
                          <input
                            value={detailForm.user.username}
                            onChange={(e) => handleDetailFieldChange('user', 'username', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            placeholder="Optional username"
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                        <div className="flex items-center text-gray-800">
                          <Shield className="w-4 h-4 mr-2" />
                          <span className="font-medium">Reset Password</span>
                        </div>

                        {resetError && (
                          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {resetError}
                          </div>
                        )}

                        {resetResult?.tempPassword && (
                          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-3">
                            <p className="text-sm font-medium text-amber-900">Temporary password generated</p>
                            <p className="mt-1 break-all font-mono text-sm text-amber-800">
                              {resetResult.tempPassword}
                            </p>
                            <button
                              type="button"
                              onClick={handleCopyGeneratedPassword}
                              className="mt-2 inline-flex items-center rounded border border-amber-300 px-2 py-1 text-xs text-amber-800 hover:bg-amber-100"
                            >
                              {passwordCopied ? (
                                <>
                                  <Check className="mr-1 h-3.5 w-3.5" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-1 h-3.5 w-3.5" />
                                  Copy password
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {!resetResult?.tempPassword && resetResult?.success && (
                          <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                            Password reset completed.
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openResetConfirm('manual')}
                              className="flex-1 inline-flex items-center justify-center rounded bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700"
                              disabled={resetLoading}
                            >
                              <KeyRound className="w-4 h-4 mr-1.5" />
                              Set Password
                            </button>
                            <button
                              type="button"
                              onClick={() => openResetConfirm('generate')}
                              className="flex-1 inline-flex items-center justify-center rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              disabled={resetLoading}
                            >
                              Generate Temp
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-gray-500">
                          Changing email/username can affect login identifiers. Confirm policy before saving.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-500 flex items-center">
                {isDetailDirty ? (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-500" />
                    Unsaved changes
                  </>
                ) : (
                  'All changes saved'
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeDetailDrawer}
                  className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  disabled={detailSaving || resetLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={!detailForm || detailSaving || detailLoading || resetLoading || !isDetailDirty}
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {detailSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <StudentImportModal
        open={studentImportModalConfig.open}
        variant={studentImportModalConfig.variant}
        studentMode={studentImportModalConfig.studentMode}
        onClose={() =>
          setStudentImportModalConfig({
            open: false,
            variant: 'regular_bulk',
            studentMode: MODE_OF_DELIVERY.REGULAR
          })
        }
        onImported={() => fetchUsers()}
      />

      {resetModal.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Password Reset</h3>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700">
              {resetModal.mode === 'generate'
                ? 'Generate a temporary password for this user and reveal it once?'
                : 'Reset this user password to the value entered above?'}
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeResetConfirm}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                disabled={resetLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={resetLoading}
              >
                {resetLoading ? 'Processing...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
