import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  Shield,
  Save,
  RotateCcw,
  Plus,
  CheckCircle,
  X,
  AlertTriangle,
  Search,
  Eye,
  Trash2,
  ChevronDown,
  Users,
  Grid3X3,
  GitBranch
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  listRoles,
  getRoleFeatures,
  createRole,
  deleteRole as deleteRoleApi,
  actAsRolePreview,
  clearActAsRolePreview
} from '../services/role.service';

const SYSTEM_ROLE_COLOR_MAP = {
  admin: 'bg-red-500',
  dean: 'bg-orange-500',
  associate_dean: 'bg-yellow-500',
  program_coordinator: 'bg-emerald-500',
  course_coordinator: 'bg-green-500',
  teacher: 'bg-cyan-500',
  ta: 'bg-blue-500',
  student: 'bg-purple-500'
};

const SYSTEM_ROLE_LEVEL_MAP = {
  admin: 6,
  dean: 5,
  associate_dean: 4,
  program_coordinator: 3,
  course_coordinator: 3,
  teacher: 2,
  ta: 2,
  student: 1
};

const SYSTEM_ROLE_SHORT_MAP = {
  admin: 'A',
  dean: 'D',
  associate_dean: 'AD',
  program_coordinator: 'PC',
  course_coordinator: 'CC',
  teacher: 'T',
  ta: 'TA',
  student: 'S'
};

const CUSTOM_ROLE_COLORS = [
  'bg-indigo-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-lime-500',
  'bg-fuchsia-500',
  'bg-sky-500'
];

const features = [
  { id: 1, name: 'Program/Course Design', category: 'Academic', description: 'Create and modify academic programs' },
  { id: 2, name: 'Allotments', category: 'Management', description: 'Manage teacher-course assignments' },
  { id: 3, name: 'Course Content', category: 'Academic', description: 'Manage course materials and content' },
  { id: 4, name: 'Scheduling/Timetable', category: 'Management', description: 'Create and manage schedules' },
  { id: 5, name: 'Assessments', category: 'Academic', description: 'Create and grade assessments' },
  { id: 6, name: 'Certificates', category: 'Administrative', description: 'Issue and manage certificates' },
  { id: 7, name: 'Forums/Gamification', category: 'Engagement', description: 'Manage forums and gamification' },
  { id: 8, name: 'Audit/Analytics', category: 'Analytics', description: 'View system analytics and audit logs' }
];

const actions = [
  { id: 'view', name: 'View', description: 'Read access to resources' },
  { id: 'create', name: 'Create', description: 'Create new resources' },
  { id: 'update', name: 'Update', description: 'Modify existing resources' },
  { id: 'delete', name: 'Delete', description: 'Remove resources' },
  { id: 'operate', name: 'Operate', description: 'Perform operations' },
  { id: 'approve', name: 'Approve', description: 'Approve or reject actions' },
  { id: 'impersonate', name: 'Impersonate', description: 'Act as another user' }
];

const scopes = [
  { id: 'university', name: 'University', level: 6 },
  { id: 'school', name: 'School', level: 5 },
  { id: 'department', name: 'Department', level: 4 },
  { id: 'program', name: 'Program', level: 3 },
  { id: 'course', name: 'Course', level: 2 },
  { id: 'batch', name: 'Batch', level: 1 }
];

const toRoleKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const getPermissionKey = (roleId, featureId, actionId, scopeId) =>
  `${roleId}-${featureId}-${actionId}-${scopeId}`;

const toActionLabel = (actionKey) =>
  String(actionKey || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const getDefaultPermissionForRole = (role, feature, action, scope) => {
  if (role.isCustom) {
    return action.id === 'view';
  }

  if (role.level >= 5) {
    return true;
  }

  if (role.key === 'associate_dean') {
    return action.id === 'view';
  }

  if (role.key === 'program_coordinator' || role.key === 'course_coordinator') {
    if (feature.name === 'Course Content' && scope.level <= 2) {
      return true;
    }
    return action.id === 'view';
  }

  if (role.key === 'teacher' || role.key === 'ta') {
    if (feature.name === 'Course Content' && (action.id === 'view' || action.id === 'create')) {
      return true;
    }
    return action.id === 'view';
  }

  return action.id === 'view' && feature.category !== 'Management';
};

const getDefaultPermissionsForRoles = (roles) => {
  const defaults = {};
  roles.forEach((role) => {
    features.forEach((feature) => {
      actions.forEach((action) => {
        scopes.forEach((scope) => {
          const key = getPermissionKey(role.id, feature.id, action.id, scope.id);
          defaults[key] = getDefaultPermissionForRole(role, feature, action, scope);
        });
      });
    });
  });
  return defaults;
};

const getRealRole = (user) => {
  const actual = String(user?.actualRole || '').trim().toLowerCase();
  if (actual) return actual;
  const fromRole = String(user?.role || '').trim().toLowerCase();
  return fromRole;
};

const ADMIN_FEATURE_ACCESS_ROLES = [
  'ADMIN',
  'DEAN',
  'ASSOCIATE_DEAN',
  'PROGRAM_COORDINATOR',
  'COURSE_COORDINATOR',
];

const normalizeAccessRoleTag = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const normalizeAccessRoles = (values) => {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const normalized = [];
  values.forEach((value) => {
    const roleTag = normalizeAccessRoleTag(value);
    if (!roleTag || seen.has(roleTag)) return;
    seen.add(roleTag);
    normalized.push(roleTag);
  });
  return normalized;
};

const CollapsibleSection = ({ id, title, subtitle, icon: Icon, badge, defaultOpen = true, children, headerRight }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(defaultOpen ? 'auto' : '0px');

  useEffect(() => {
    if (!contentRef.current) return;
    if (isOpen) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(`${height}px`);
      const timer = setTimeout(() => setContentHeight('auto'), 300);
      return () => clearTimeout(timer);
    } else {
      setContentHeight(`${contentRef.current.scrollHeight}px`);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setContentHeight('0px'));
      });
    }
  }, [isOpen]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-blue-600 flex-shrink-0" />}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              {badge != null && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {headerRight && <div onClick={(e) => e.stopPropagation()}>{headerRight}</div>}
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? '' : '-rotate-90'}`} />
        </div>
      </button>
      <div
        ref={contentRef}
        style={{ maxHeight: contentHeight }}
        className={`transition-[max-height] duration-300 ease-in-out ${contentHeight === 'auto' ? '' : 'overflow-hidden'}`}
      >
        <div className="border-t border-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
};

const RBACManager = () => {
  const { user, updateUser } = useAuth();

  const [permissions, setPermissions] = useState({});
  const [originalPermissions, setOriginalPermissions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState('');
  const [apiRoles, setApiRoles] = useState([]);

  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [addRoleError, setAddRoleError] = useState('');
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featuresError, setFeaturesError] = useState('');
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [matrixSearchTerm, setMatrixSearchTerm] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState({});
  const [deleteRoleError, setDeleteRoleError] = useState('');
  const [deletingRoleId, setDeletingRoleId] = useState('');
  const [newRoleForm, setNewRoleForm] = useState({
    label: '',
    key: '',
    shortTitle: '',
    description: '',
    parentRoleId: '',
    childRoleIds: []
  });
  const [keyTouched, setKeyTouched] = useState(false);

  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [toastState, setToastState] = useState(null);
  const [expandedFeatures, setExpandedFeatures] = useState(new Set());
  const [visibleRoleIds, setVisibleRoleIds] = useState(null); // null = show all
  const [expandedRoleIds, setExpandedRoleIds] = useState(new Set()); // which role columns are expanded

  const realRole = getRealRole(user);
  const accessRoles = useMemo(() => normalizeAccessRoles(user?.accessRoles), [user?.accessRoles]);
  const hasAdminFeatureRole = useMemo(
    () => accessRoles.some((roleTag) => ADMIN_FEATURE_ACCESS_ROLES.includes(roleTag)),
    [accessRoles]
  );
  const isAdminUser = realRole === 'admin' || hasAdminFeatureRole;
  const effectiveRole = String(user?.effectiveRole || '').trim().toLowerCase();
  const isPreviewActive = Boolean(effectiveRole && effectiveRole !== realRole);

  const roles = useMemo(() => {
    const sorted = [...apiRoles].sort((a, b) => {
      const aSystem = a?.isSystemRole === true ? 1 : 0;
      const bSystem = b?.isSystemRole === true ? 1 : 0;
      if (aSystem !== bSystem) return bSystem - aSystem;
      const aOrder = Number.isFinite(Number(a?.order)) ? Number(a.order) : 9999;
      const bOrder = Number.isFinite(Number(b?.order)) ? Number(b.order) : 9999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a?.label || a?.key || '').localeCompare(String(b?.label || b?.key || ''));
    });

    let customColorIndex = 0;
    return sorted.map((role) => {
      const key = toRoleKey(role?.key);
      const isSystemRole = role?.isSystemRole === true;
      const color = SYSTEM_ROLE_COLOR_MAP[key]
        ? SYSTEM_ROLE_COLOR_MAP[key]
        : CUSTOM_ROLE_COLORS[customColorIndex++ % CUSTOM_ROLE_COLORS.length];

      const name = role?.label || role?.key || 'Role';
      // Short title: system map > API shortTitle > first letters of words
      const shortTitle = SYSTEM_ROLE_SHORT_MAP[key]
        || String(role?.shortTitle || '').trim()
        || name.split(/\s+/).map(w => w[0]?.toUpperCase()).join('');

      return {
        id: role?._id || key,
        key,
        name,
        shortTitle,
        level: SYSTEM_ROLE_LEVEL_MAP[key] || 1,
        color,
        description: role?.description || (isSystemRole ? 'System role' : 'Custom role'),
        isCustom: !isSystemRole,
        raw: role
      };
    });
  }, [apiRoles]);

  const customRoles = useMemo(
    () => apiRoles.filter((role) => role?.isSystemRole !== true),
    [apiRoles]
  );

  const roleHierarchyDisplay = useMemo(
    () => roles.map((role) => ({ name: role.name, color: role.color })),
    [roles]
  );

  const matrixActionColumns = useMemo(() => {
    const actionSet = new Set();
    availableFeatures.forEach((feature) => {
      (feature?.actions || []).forEach((action) => {
        const normalized = String(action || '').trim().toLowerCase();
        if (normalized) actionSet.add(normalized);
      });
    });
    return Array.from(actionSet);
  }, [availableFeatures]);

  const filteredAvailableFeatures = useMemo(() => {
    const query = String(matrixSearchTerm || '').trim().toLowerCase();
    if (!query) return availableFeatures;
    return availableFeatures.filter((feature) => {
      const name = String(feature?.featureName || '').toLowerCase();
      const key = String(feature?.featureKey || '').toLowerCase();
      return name.includes(query) || key.includes(query);
    });
  }, [availableFeatures, matrixSearchTerm]);

  const selectedFeatureCount = useMemo(
    () =>
      Object.values(newRolePermissions).filter(
        (actionsList) => Array.isArray(actionsList) && actionsList.length > 0
      ).length,
    [newRolePermissions]
  );

  const selectedPermissionCount = useMemo(
    () =>
      Object.values(newRolePermissions).reduce((sum, actionsList) => {
        if (!Array.isArray(actionsList)) return sum;
        return sum + actionsList.length;
      }, 0),
    [newRolePermissions]
  );

  const showToast = (type, message) => {
    setToastState({ type, message });
    window.setTimeout(() => {
      setToastState((prev) => (prev?.message === message ? null : prev));
    }, 3000);
  };

  useEffect(() => {
    const defaults = getDefaultPermissionsForRoles(roles);

    setPermissions((prev) => {
      if (!prev || Object.keys(prev).length === 0) return defaults;
      const merged = { ...prev };
      Object.keys(defaults).forEach((key) => {
        if (merged[key] === undefined) merged[key] = defaults[key];
      });
      return merged;
    });

    setOriginalPermissions((prev) => {
      if (!prev || Object.keys(prev).length === 0) return defaults;
      const merged = { ...prev };
      Object.keys(defaults).forEach((key) => {
        if (merged[key] === undefined) merged[key] = defaults[key];
      });
      return merged;
    });
  }, [roles]);

  useEffect(() => {
    const changed = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);
    setHasChanges(changed);
  }, [permissions, originalPermissions]);

  const loadRoles = async () => {
    setRolesLoading(true);
    setRolesError('');
    try {
      const payload = await listRoles();
      const rows = Array.isArray(payload?.roles) ? payload.roles : [];
      setApiRoles(rows);
      setDeleteRoleError('');
    } catch (error) {
      setRolesError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Failed to load roles'
      );
      setApiRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  const loadFeatures = async () => {
    setFeaturesLoading(true);
    setFeaturesError('');
    try {
      const payload = await getRoleFeatures();
      const rows = Array.isArray(payload?.features) ? payload.features : [];
      const normalized = rows.map((feature) => ({
        featureKey: String(feature?.featureKey || '').trim().toLowerCase(),
        featureName: String(feature?.featureName || feature?.featureKey || '').trim(),
        actions: Array.isArray(feature?.actions)
          ? [...new Set(feature.actions.map((action) => String(action || '').trim().toLowerCase()).filter(Boolean))]
          : []
      }));
      setAvailableFeatures(normalized);
    } catch (error) {
      setFeaturesError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Failed to load feature permissions'
      );
      setAvailableFeatures([]);
    } finally {
      setFeaturesLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminUser) return;
    loadRoles();
    loadFeatures();
  }, [isAdminUser]);

  const togglePermission = (roleId, featureId, actionId, scopeId) => {
    const key = getPermissionKey(roleId, featureId, actionId, scopeId);
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setOriginalPermissions(permissions);
      setShowSaveModal(false);
    } finally {
      setSaving(false);
    }
  };

  const updateSessionAfterPreview = (payload) => {
    if (!payload?.token) return;

    localStorage.setItem('token', payload.token);

    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    const nextUser = {
      ...stored,
      ...(user || {}),
      ...(payload.user || {})
    };

    if (payload.effectiveRole) {
      nextUser.effectiveRole = payload.effectiveRole;
      nextUser.effectiveRoleLabel = payload.effectiveRoleLabel || payload.effectiveRole;
    } else {
      delete nextUser.effectiveRole;
      delete nextUser.effectiveRoleLabel;
    }

    if (!nextUser.actualRole) {
      const inferred = getRealRole(nextUser);
      if (inferred) nextUser.actualRole = inferred;
    }

    localStorage.setItem('user', JSON.stringify(nextUser));
    updateUser(nextUser);
  };

  const handleExitPreview = async () => {
    setPreviewBusy(true);
    setPreviewError('');
    try {
      const payload = await clearActAsRolePreview();
      updateSessionAfterPreview(payload);
    } catch (error) {
      setPreviewError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Failed to clear preview mode'
      );
    } finally {
      setPreviewBusy(false);
    }
  };

  const handlePreviewRoleChange = async (event) => {
    const roleKey = event.target.value;
    if (!roleKey) {
      await handleExitPreview();
      return;
    }

    setPreviewBusy(true);
    setPreviewError('');
    try {
      const payload = await actAsRolePreview(roleKey);
      updateSessionAfterPreview(payload);
    } catch (error) {
      setPreviewError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Failed to switch preview role'
      );
    } finally {
      setPreviewBusy(false);
    }
  };

  const handleReset = async () => {
    setPermissions(originalPermissions);
    if (isPreviewActive) {
      await handleExitPreview();
    }
  };

  const handleRoleLabelChange = (value) => {
    setNewRoleForm((prev) => ({
      ...prev,
      label: value,
      key: keyTouched ? prev.key : toRoleKey(value)
    }));
  };

  const toggleMatrixPermission = (featureKey, action) => {
    setNewRolePermissions((prev) => {
      const currentActions = Array.isArray(prev[featureKey]) ? prev[featureKey] : [];
      const exists = currentActions.includes(action);
      const nextActions = exists
        ? currentActions.filter((entry) => entry !== action)
        : [...currentActions, action];

      const next = { ...prev };
      if (nextActions.length === 0) {
        delete next[featureKey];
      } else {
        next[featureKey] = nextActions;
      }
      return next;
    });
  };

  const setAllFeatureActions = (featureKey, actionsList, checked) => {
    const normalizedActions = Array.isArray(actionsList) ? actionsList : [];
    setNewRolePermissions((prev) => {
      const next = { ...prev };
      if (!checked || normalizedActions.length === 0) {
        delete next[featureKey];
      } else {
        next[featureKey] = [...new Set(normalizedActions)];
      }
      return next;
    });
  };

  const setAllActionColumn = (action, checked) => {
    setNewRolePermissions((prev) => {
      const next = { ...prev };
      availableFeatures.forEach((feature) => {
        const featureKey = String(feature?.featureKey || '').trim().toLowerCase();
        const featureActions = Array.isArray(feature?.actions) ? feature.actions : [];
        if (!featureKey || !featureActions.includes(action)) return;

        const existing = Array.isArray(next[featureKey]) ? next[featureKey] : [];
        if (checked) {
          next[featureKey] = [...new Set([...existing, action])];
        } else {
          const reduced = existing.filter((entry) => entry !== action);
          if (reduced.length === 0) delete next[featureKey];
          else next[featureKey] = reduced;
        }
      });
      return next;
    });
  };

  const submitCreateRole = async () => {
    const label = String(newRoleForm.label || '').trim();
    const key = toRoleKey(newRoleForm.key || label);
    const shortTitle = String(newRoleForm.shortTitle || '').trim().toUpperCase().slice(0, 4);
    const description = String(newRoleForm.description || '').trim();
    const parentRoleId = String(newRoleForm.parentRoleId || '').trim();
    const childRoleIds = Array.isArray(newRoleForm.childRoleIds)
      ? newRoleForm.childRoleIds.filter((id) => id && id !== parentRoleId)
      : [];

    if (!label) {
      setAddRoleError('Role Name is required');
      return;
    }
    if (!key) {
      setAddRoleError('Role Code is required');
      return;
    }

    const permissions = Object.entries(newRolePermissions)
      .map(([featureKey, actionsList]) => ({
        featureKey,
        actions: Array.isArray(actionsList)
          ? [...new Set(actionsList.map((action) => String(action || '').trim().toLowerCase()).filter(Boolean))]
          : []
      }))
      .filter((entry) => entry.actions.length > 0);

    setAddingRole(true);
    setAddRoleError('');
    try {
      await createRole({
        roleName: label,
        roleKey: key,
        shortTitle: shortTitle || undefined,
        description,
        parentRoleId: parentRoleId || undefined,
        childRoleIds,
        permissions
      });
      setShowAddRoleModal(false);
      setNewRoleForm({
        label: '',
        key: '',
        shortTitle: '',
        description: '',
        parentRoleId: '',
        childRoleIds: []
      });
      setNewRolePermissions({});
      setMatrixSearchTerm('');
      setKeyTouched(false);
      await loadRoles();
      showToast('success', 'Role created successfully');
    } catch (error) {
      setAddRoleError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Failed to create role'
      );
      showToast('error', 'Failed to create role');
    } finally {
      setAddingRole(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!role?._id || role?.isSystemRole === true) return;

    const roleName = role.label || role.key || 'this role';
    const confirmed = window.confirm(
      `Delete role "${roleName}"? This action deactivates the role from the active list.`
    );
    if (!confirmed) return;

    setDeletingRoleId(role._id);
    setDeleteRoleError('');
    try {
      await deleteRoleApi(role._id);
      if (isPreviewActive && String(role.key || '').trim().toLowerCase() === effectiveRole) {
        await handleExitPreview();
      }
      await loadRoles();
      showToast('success', 'Role deleted successfully');
    } catch (error) {
      setDeleteRoleError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Failed to delete role'
      );
      showToast('error', 'Failed to delete role');
    } finally {
      setDeletingRoleId('');
    }
  };

  const filteredFeatures = features.filter((feature) => {
    const matchesSearch = feature.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || feature.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(features.map((feature) => feature.category))];

  const toggleFeatureExpand = (featureId) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) next.delete(featureId);
      else next.add(featureId);
      return next;
    });
  };

  const displayedRoles = visibleRoleIds
    ? roles.filter((r) => visibleRoleIds.has(r.id))
    : roles;

  const toggleRoleVisibility = (roleId) => {
    setVisibleRoleIds((prev) => {
      if (!prev) {
        // First toggle: show all except this one
        const next = new Set(roles.map((r) => r.id));
        next.delete(roleId);
        return next;
      }
      const next = new Set(prev);
      if (next.has(roleId)) {
        if (next.size <= 1) return null; // Don't hide last role, reset to all
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const toggleRoleExpand = (roleId) => {
    setExpandedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const expandAllRoles = () => setExpandedRoleIds(new Set(roles.map((r) => r.id)));
  const collapseAllRoles = () => setExpandedRoleIds(new Set());

  // Count granted permissions per role per feature (across all actions & scopes)
  const getFeatureRoleSummary = (feature, role) => {
    let granted = 0;
    let total = 0;
    actions.forEach((action) => {
      scopes.forEach((scope) => {
        total++;
        const key = getPermissionKey(role.id, feature.id, action.id, scope.id);
        if (permissions[key]) granted++;
      });
    });
    return { granted, total };
  };

  if (!isAdminUser) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-900">Roles & Permissions</h1>
        <p className="text-sm text-red-600 mt-2">Access denied. Admin only feature.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {toastState && (
        <div
          className={`fixed right-6 top-6 z-[60] rounded-lg border px-4 py-2 text-sm shadow-lg ${
            toastState.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {toastState.message}
        </div>
      )}

      {/* ── Page Header — single compact row ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <h1 className="text-lg font-bold text-gray-900">Roles & Permissions</h1>
            {(rolesError || previewError || deleteRoleError) && (
              <span className="text-xs text-red-600">{rolesError || previewError || deleteRoleError}</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5" title="Temporarily view the system as another role — no DB changes">
              <Eye className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={isPreviewActive ? effectiveRole : ''}
                onChange={handlePreviewRoleChange}
                disabled={previewBusy || rolesLoading}
                className="bg-transparent text-xs text-gray-700 focus:outline-none"
              >
                <option value="">Preview (Off)</option>
                {apiRoles.map((role) => (
                  <option key={role._id} value={role.key}>{role.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setShowAddRoleModal(true);
                setAddRoleError('');
                setNewRoleForm({ label: '', key: '', shortTitle: '', description: '', parentRoleId: '', childRoleIds: [] });
                setNewRolePermissions({});
                setMatrixSearchTerm('');
                setKeyTouched(false);
                if (!featuresLoading && availableFeatures.length === 0) loadFeatures();
              }}
              className="flex items-center px-3 py-1.5 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Role
            </button>

            <button
              onClick={handleReset}
              disabled={!hasChanges && !isPreviewActive}
              className="flex items-center px-3 py-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </button>

            <button
              onClick={() => setShowSaveModal(true)}
              disabled={!hasChanges}
              className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Save
            </button>
          </div>
        </div>

        {isPreviewActive && (
          <div className="mt-2 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <span className="text-xs text-amber-900">
              Previewing as <strong>{user?.effectiveRoleLabel || effectiveRole}</strong> — no DB changes
            </span>
            <button
              onClick={handleExitPreview}
              disabled={previewBusy}
              className="px-2 py-1 text-xs rounded border border-amber-300 text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              Exit
            </button>
          </div>
        )}
      </div>



      {/* ── Custom Roles (Collapsible) ── */}
      {customRoles.length > 0 && (
        <CollapsibleSection
          id="custom-roles"
          title="Custom Roles"
          icon={Users}
          badge={customRoles.length}
          defaultOpen={false}
        >
          <div className="px-6 py-4 space-y-2">
            {customRoles.map((role) => {
              const isDeleting = deletingRoleId === role._id;
              return (
                <div
                  key={role._id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{role.label || role.key}</p>
                      <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{role.key}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>Parent: {role?.parentRole?.label || 'None'}</span>
                      <span>
                        Children:{' '}
                        {Array.isArray(role?.childRoles) && role.childRoles.length > 0
                          ? role.childRoles.map((child) => child.label || child.key).join(', ')
                          : 'None'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRole(role)}
                    disabled={isDeleting}
                    className="inline-flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors flex-shrink-0 ml-3"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Permission Matrix (Collapsible) ── */}
      <CollapsibleSection
        id="permission-matrix"
        title="Permission Matrix"
        subtitle="Click a feature to expand its actions. Toggle roles to show/hide columns."
        icon={Grid3X3}
        badge={`${filteredFeatures.length} features`}
        defaultOpen={true}
        headerRight={
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search features..."
                className="pl-8 pr-3 py-1.5 w-48 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <select
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        }
      >
        {/* Role visibility pills + expand/collapse controls */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 mr-1">Roles:</span>
          {roles.map((role) => {
            const isVisible = !visibleRoleIds || visibleRoleIds.has(role.id);
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleRoleVisibility(role.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                  isVisible
                    ? 'bg-white border-gray-300 text-gray-800 shadow-sm'
                    : 'bg-gray-100 border-transparent text-gray-400'
                }`}
              >
                <div className={`w-2 h-2 ${role.color} rounded-full ${isVisible ? '' : 'opacity-40'}`}></div>
                {role.name}
              </button>
            );
          })}
          <span className="text-gray-300 mx-1">|</span>
          {visibleRoleIds && (
            <button
              type="button"
              onClick={() => setVisibleRoleIds(null)}
              className="text-xs text-blue-600 hover:underline"
            >
              Show all
            </button>
          )}
          <button
            type="button"
            onClick={expandAllRoles}
            className="text-xs text-blue-600 hover:underline"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAllRoles}
            className="text-xs text-gray-500 hover:underline"
          >
            Collapse all
          </button>
        </div>

        {/* Scope legend — sticky */}
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-4 flex-wrap">
          <span className="text-xs font-medium text-blue-700">Scope levels:</span>
          {scopes.map((scope) => (
            <span key={scope.id} className="inline-flex items-center gap-1 text-xs text-blue-600">
              <span className="w-5 h-5 rounded bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">{scope.name.charAt(0)}</span>
              {scope.name}
            </span>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-3 h-3 bg-green-500 rounded inline-block"></span> Granted</span>
            <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-3 h-3 bg-gray-200 rounded inline-block"></span> Denied</span>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
          <table className="w-full border-collapse">
            {/* Column headers — click role to expand/collapse */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-3 font-medium text-gray-900 text-sm border-r border-gray-200 min-w-40 w-40 sticky left-0 bg-gray-50 z-20">
                  Feature
                </th>
                {displayedRoles.map((role) => {
                  const isRoleExpanded = expandedRoleIds.has(role.id);
                  return (
                    <th
                      key={role.id}
                      className={`p-2 border-r border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors ${isRoleExpanded ? 'min-w-44' : 'min-w-16 w-16'}`}
                      onClick={() => toggleRoleExpand(role.id)}
                      title={isRoleExpanded ? `Collapse ${role.name}` : `Click to expand ${role.name}`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <div className={`w-2.5 h-2.5 ${role.color} rounded-full flex-shrink-0`}></div>
                        <span className={`font-medium whitespace-nowrap ${isRoleExpanded ? 'text-gray-900 text-xs' : 'text-gray-500 text-[10px]'}`}>
                          {isRoleExpanded ? role.name : role.shortTitle}
                        </span>
                        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isRoleExpanded ? '' : '-rotate-90'}`} />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.map((feature) => {
                const isFeatureOpen = expandedFeatures.has(feature.id);
                return (
                  <React.Fragment key={feature.id}>
                    {/* Feature header row — always visible, clickable */}
                    <tr
                      className="border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleFeatureExpand(feature.id)}
                    >
                      <td className="p-3 border-r border-gray-200 sticky left-0 bg-white z-[5]">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isFeatureOpen ? '' : '-rotate-90'}`} />
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{feature.name}</div>
                            <div className="text-[11px] text-gray-400">{feature.category}</div>
                          </div>
                        </div>
                      </td>
                      {displayedRoles.map((role) => {
                        const isRoleExpanded = expandedRoleIds.has(role.id);
                        const { granted, total } = getFeatureRoleSummary(feature, role);
                        const pct = total > 0 ? Math.round((granted / total) * 100) : 0;
                        return (
                          <td key={role.id} className="p-2 border-r border-gray-200 text-center" onClick={(e) => e.stopPropagation()}>
                            {!isFeatureOpen ? (
                              isRoleExpanded ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${pct > 70 ? 'bg-green-500' : pct > 30 ? 'bg-amber-400' : 'bg-gray-300'}`}
                                      style={{ width: `${pct}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-mono">{granted}/{total}</span>
                                </div>
                              ) : (
                                <div
                                  className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[9px] font-bold ${
                                    pct > 70 ? 'bg-green-100 text-green-700' : pct > 30 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                                  }`}
                                  title={`${role.name}: ${granted}/${total} granted`}
                                >
                                  {pct > 0 ? `${pct}` : '0'}
                                </div>
                              )
                            ) : (
                              <span className="text-[10px] text-gray-300">&mdash;</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Expanded: action rows */}
                    {isFeatureOpen && actions.map((action) => (
                      <tr key={`${feature.id}-${action.id}`} className="border-b border-gray-100 bg-gray-50/30">
                        <td className="py-2 px-3 border-r border-gray-200 sticky left-0 bg-gray-50/80 z-[5]">
                          <div className="text-xs font-medium text-gray-600 pl-8">{action.name}</div>
                        </td>
                        {displayedRoles.map((role) => {
                          const isRoleExpanded = expandedRoleIds.has(role.id);
                          if (!isRoleExpanded) {
                            const grantedCount = scopes.filter((scope) => {
                              const permKey = getPermissionKey(role.id, feature.id, action.id, scope.id);
                              return permissions[permKey];
                            }).length;
                            return (
                              <td
                                key={role.id}
                                className="p-1.5 border-r border-gray-200 text-center"
                                title={`${role.name}: ${grantedCount}/${scopes.length} scopes granted for ${action.name}`}
                              >
                                <span className={`text-[10px] font-bold ${grantedCount === scopes.length ? 'text-green-600' : grantedCount > 0 ? 'text-amber-500' : 'text-gray-300'}`}>
                                  {grantedCount}/{scopes.length}
                                </span>
                              </td>
                            );
                          }
                          return (
                            <td key={role.id} className="p-1.5 border-r border-gray-200">
                              <div className="flex items-center justify-center gap-0.5 flex-wrap">
                                {scopes.map((scope) => {
                                  const permKey = getPermissionKey(role.id, feature.id, action.id, scope.id);
                                  const isGranted = permissions[permKey];
                                  return (
                                    <button
                                      key={scope.id}
                                      onClick={() => togglePermission(role.id, feature.id, action.id, scope.id)}
                                      className={`
                                        w-6 h-6 rounded text-[9px] font-semibold transition-all relative group/scope
                                        ${
                                          isGranted
                                            ? 'bg-green-500 text-white shadow-sm hover:bg-green-600'
                                            : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                        }
                                      `}
                                      title={`${scope.name}: ${action.name} — ${feature.name}`}
                                    >
                                      {scope.name.charAt(0)}
                                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-gray-900 text-white text-[9px] rounded whitespace-nowrap opacity-0 group-hover/scope:opacity-100 transition-opacity pointer-events-none z-20">
                                        {scope.name}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {rolesLoading && (
          <div className="px-4 py-3 text-center text-sm text-gray-500">Loading roles...</div>
        )}
      </CollapsibleSection>

      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Role</h3>
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {addRoleError && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {addRoleError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                  <input
                    type="text"
                    value={newRoleForm.label}
                    onChange={(event) => handleRoleLabelChange(event.target.value)}
                    placeholder="e.g. Content Reviewer"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role Code (roleKey)</label>
                    <input
                      type="text"
                      value={newRoleForm.key}
                      onChange={(event) => {
                        setKeyTouched(true);
                        setNewRoleForm((prev) => ({
                          ...prev,
                          key: toRoleKey(event.target.value)
                        }));
                      }}
                      placeholder="content_reviewer"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Short Title</label>
                    <input
                      type="text"
                      value={newRoleForm.shortTitle}
                      onChange={(event) =>
                        setNewRoleForm((prev) => ({
                          ...prev,
                          shortTitle: event.target.value.toUpperCase().slice(0, 4)
                        }))
                      }
                      placeholder="CR"
                      maxLength={4}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-bold uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reporting To</label>
                  <select
                    value={newRoleForm.parentRoleId}
                    onChange={(event) =>
                      setNewRoleForm((prev) => ({
                        ...prev,
                        parentRoleId: event.target.value,
                        childRoleIds: (prev.childRoleIds || []).filter(
                          (id) => id !== event.target.value
                        )
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No reporting role</option>
                    {apiRoles.map((role) => (
                      <option key={role._id} value={role._id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newRoleForm.description}
                    onChange={(event) =>
                      setNewRoleForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    rows={3}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="rounded border border-gray-200">
                <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Permission Matrix</h4>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={matrixSearchTerm}
                      onChange={(event) => setMatrixSearchTerm(event.target.value)}
                      placeholder="Search features..."
                      className="w-56 rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-xs text-gray-600">
                      {selectedFeatureCount} features selected, {selectedPermissionCount} total permissions
                    </span>
                  </div>
                </div>

                {featuresError && (
                  <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {featuresError}
                  </div>
                )}

                <div className="max-h-[48vh] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Feature
                        </th>
                        {matrixActionColumns.map((action) => {
                          const actionEnabledForAll = availableFeatures
                            .filter((feature) => (feature?.actions || []).includes(action))
                            .every((feature) =>
                              (newRolePermissions[feature.featureKey] || []).includes(action)
                            );
                          return (
                            <th
                              key={`action-header-${action}`}
                              className="px-3 py-2 text-center font-semibold text-gray-700"
                            >
                              <button
                                type="button"
                                onClick={() => setAllActionColumn(action, !actionEnabledForAll)}
                                className="text-xs text-blue-700 hover:underline"
                              >
                                {toActionLabel(action)}
                              </button>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {featuresLoading && (
                        <tr>
                          <td
                            colSpan={Math.max(1, matrixActionColumns.length + 1)}
                            className="px-4 py-4 text-center text-sm text-gray-500"
                          >
                            Loading features...
                          </td>
                        </tr>
                      )}

                      {!featuresLoading && filteredAvailableFeatures.length === 0 && (
                        <tr>
                          <td
                            colSpan={Math.max(1, matrixActionColumns.length + 1)}
                            className="px-4 py-4 text-center text-sm text-gray-500"
                          >
                            No features found.
                          </td>
                        </tr>
                      )}

                      {filteredAvailableFeatures.map((feature) => {
                        const featureActions = Array.isArray(feature?.actions)
                          ? feature.actions
                          : [];
                        const selectedActions = Array.isArray(
                          newRolePermissions[feature.featureKey]
                        )
                          ? newRolePermissions[feature.featureKey]
                          : [];
                        const allSelected =
                          featureActions.length > 0 &&
                          featureActions.every((action) => selectedActions.includes(action));
                        return (
                          <tr key={feature.featureKey} className="border-b border-gray-100">
                            <td className="px-4 py-2 text-gray-800">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{feature.featureName}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAllFeatureActions(
                                      feature.featureKey,
                                      featureActions,
                                      !allSelected
                                    )
                                  }
                                  className="text-xs text-blue-700 hover:underline"
                                >
                                  {allSelected ? 'Clear all' : 'Select all'}
                                </button>
                              </div>
                              <p className="text-xs text-gray-500">{feature.featureKey}</p>
                            </td>

                            {matrixActionColumns.map((action) => {
                              const supported = featureActions.includes(action);
                              const checked = selectedActions.includes(action);
                              return (
                                <td
                                  key={`${feature.featureKey}-${action}`}
                                  className="px-3 py-2 text-center"
                                >
                                  {!supported ? (
                                    <span className="text-gray-300">—</span>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        toggleMatrixPermission(feature.featureKey, action)
                                      }
                                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowAddRoleModal(false)}
                disabled={addingRole}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submitCreateRole}
                disabled={addingRole}
                className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {addingRole ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <Save className="w-6 h-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Save Permission Changes</h3>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to save these permission changes? This will immediately affect user access across the system.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={saving}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={savePermissions}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RBACManager;
