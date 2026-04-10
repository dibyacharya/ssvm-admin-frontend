import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { globalSearch } from '../../services/user.service';
import { API_URL } from '../../services/api';
import {
  Home,
  Shield,
  Users,
  BookOpen,
  Calendar,
  BarChart3,
  Award,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  GraduationCap,
  Layers,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  ClipboardCheck,
  Pin,
  PinOff,
} from 'lucide-react';

const sidebarItems = [
  { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
  { id: 'rbac', name: 'Roles & Permissions', icon: Shield, path: '/rbac' },
  { id: 'users', name: 'User Management', icon: Users, path: '/users' },
  { id: 'programs', name: 'Program Management', icon: GraduationCap, path: '/programs' },
  { id: 'batches', name: 'Batch Management', icon: Layers, path: '/batches' },
  { id: 'courses', name: 'Course Management', icon: BookOpen, path: '/courses/list' },
  { id: 'exams', name: 'Examinations', icon: ClipboardCheck, path: '/exams' },
];

const RBAC_VISIBILITY_ROLES = [
  'ADMIN',
  'DEAN',
  'ASSOCIATE_DEAN',
  'PROGRAM_COORDINATOR',
  'COURSE_COORDINATOR',
];
const SIDEBAR_COLLAPSE_KEY = 'admin_sidebar_collapsed';
const SIDEBAR_PINNED_KEY = 'admin_sidebar_pinned';

const AdminLayout = () => {
  const { user, logout, hasAnyAccessRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDevMode = import.meta.env.DEV === true;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.localStorage.getItem(SIDEBAR_PINNED_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [isHovered, setIsHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeToast, setProbeToast] = useState(null);
  const [corsBanner, setCorsBanner] = useState(null);
  const searchRef = useRef(null);
  const sidebarRef = useRef(null);

  const isLegacyAdminUser = String(user?.role || '').trim().toLowerCase() === 'admin';
  const canViewRbac = Boolean(
    (typeof hasAnyAccessRole === 'function' && hasAnyAccessRole(RBAC_VISIBILITY_ROLES, user)) ||
      isLegacyAdminUser
  );
  const visibleSidebarItems = useMemo(
    () => sidebarItems.filter((item) => item.id !== 'rbac' || canViewRbac),
    [canViewRbac]
  );

  // Determine effective collapsed state (expand on hover when not pinned)
  const effectiveCollapsed = isCollapsed && !isHovered;

  // Sidebar group expand/collapse
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const expanded = {};
    sidebarItems.forEach(item => {
      if (item.type === 'group' && item.children) {
        if (item.children.some(child => location.pathname === child.path)) {
          expanded[item.id] = true;
        }
      }
    });
    return expanded;
  });

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(Boolean(isCollapsed)));
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_PINNED_KEY, String(Boolean(isPinned)));
    } catch {
      // ignore
    }
  }, [isPinned]);

  // Auto-expand group when navigating to a child route
  useEffect(() => {
    sidebarItems.forEach(item => {
      if (item.type === 'group' && item.children) {
        if (item.children.some(child => location.pathname === child.path)) {
          setExpandedGroups(prev => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [location.pathname]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleSidebarCollapseToggle = () => {
    setIsCollapsed((prev) => !prev);
  };

  const handlePinToggle = () => {
    if (isPinned) {
      setIsPinned(false);
      setIsCollapsed(true);
    } else {
      setIsPinned(true);
      setIsCollapsed(false);
    }
  };

  // Debounced global search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      setShowSearchDropdown(false);
      return;
    }
    setSearchLoading(true);
    setShowSearchDropdown(true);
    const timer = setTimeout(async () => {
      try {
        const data = await globalSearch(searchQuery, undefined, 5);
        setSearchResults(data.results || null);
      } catch {
        setSearchResults(null);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setShowSearchDropdown(false);
    setSearchQuery('');
  }, [location.pathname]);

  const handleSearchResultClick = (type) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    if (type === 'users') {
      navigate('/users');
    } else if (type === 'courses') {
      navigate('/courses');
    } else if (type === 'courseCodes') {
      navigate('/courses');
    }
  };

  const hasResults = searchResults && (
    (searchResults.users?.length > 0) ||
    (searchResults.courses?.length > 0) ||
    (searchResults.courseCodes?.length > 0)
  );

  const currentUserId = user?._id || user?.id || user?.userId || '';
  const profileBadge = user?.avatar || user?.name?.trim()?.charAt(0)?.toUpperCase() || 'A';

  const handleLogout = () => {
    logout();
  };

  const openMyProfile = () => {
    if (!currentUserId) {
      navigate('/users');
      return;
    }
    navigate(`/users/${currentUserId}/profile`);
    setSidebarOpen(false);
  };

  useEffect(() => {
    if (!probeToast) return undefined;
    const timer = setTimeout(() => setProbeToast(null), 5000);
    return () => clearTimeout(timer);
  }, [probeToast]);

  useEffect(() => {
    const onCorsBlocked = (event) => {
      const message =
        event?.detail?.message ||
        "CORS blocked. Fix backend ALLOWED_ORIGINS to include http://localhost:3000";
      setCorsBanner(message);
    };
    window.addEventListener('api:cors-blocked', onCorsBlocked);
    return () => {
      window.removeEventListener('api:cors-blocked', onCorsBlocked);
    };
  }, []);

  const handleProbeBackend = async () => {
    const apiBase = (API_URL || "").replace(/\/+$/, "");
    const healthBase = apiBase.replace(/\/api$/, "");
    const healthUrl = `${healthBase}/health`;

    try {
      setProbeLoading(true);
      const response = await fetch(`${healthUrl}?_ts=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json().catch(() => null);
      const statusSuffix = payload?.status ? ` (${payload.status})` : "";
      setProbeToast({
        type: 'ok',
        message: `OK ${healthUrl}${statusSuffix}`,
      });
    } catch (error) {
      setProbeToast({
        type: 'fail',
        message: `FAIL ${healthUrl} (${error.message})`,
      });
    } finally {
      setProbeLoading(false);
    }
  };

  const isActiveRoute = (path) => {
    if (location.pathname === path) return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path + '/')) return true;
    return false;
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        onMouseEnter={() => { if (isCollapsed && isDesktop) setIsHovered(true); }}
        onMouseLeave={() => { if (isCollapsed && isDesktop) setIsHovered(false); }}
        className={`
          admin-sidebar fixed md:static inset-y-0 left-0 z-50 flex flex-col
          ${effectiveCollapsed ? 'md:w-[72px]' : 'md:w-64'}
          ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          md:translate-x-0 transition-all duration-300 ease-in-out
        `}
        style={{
          background: '#FFFFFF',
          borderRight: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {/* Sidebar Header / Logo */}
        <div className={`flex items-center justify-between ${effectiveCollapsed ? 'px-3 py-4' : 'px-5 py-5'} border-b border-gray-200`}>
          <div className={`flex items-center ${effectiveCollapsed ? 'justify-center w-full' : ''}`}>
            {effectiveCollapsed ? (
              <span className="text-lg font-bold text-gray-900 tracking-tight">S</span>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-gray-900 tracking-tight">SSVM</span>
                <span className="text-xl font-medium text-[#F97316]">Admin</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!effectiveCollapsed && isDesktop && (
              <button
                onClick={handlePinToggle}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                {isPinned ? (
                  <Pin className="w-4 h-4 text-[#F97316]" />
                ) : (
                  <PinOff className="w-4 h-4 text-slate-400" />
                )}
              </button>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 flex flex-col ${effectiveCollapsed ? 'px-2 py-3' : 'px-3 py-3'} gap-0.5 overflow-y-auto`}>
          {visibleSidebarItems.map((item) => {
            const Icon = item.icon;

            // Group item with children
            if (item.type === 'group') {
              const isExpanded = expandedGroups[item.id];
              const isGroupActive = item.children?.some(child => isActiveRoute(child.path));

              if (effectiveCollapsed) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setIsCollapsed(false);
                      setExpandedGroups((prev) => ({ ...prev, [item.id]: true }));
                    }}
                    className={`
                      admin-sidebar-item relative w-full justify-center
                      ${isGroupActive ? 'active' : ''}
                    `}
                    title={item.name}
                    aria-label={item.name}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              }

              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id)}
                    className={`
                      admin-sidebar-item relative w-full
                      ${isGroupActive ? 'active' : ''}
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span className="flex-1 text-left">{item.name}</span>
                    <span className="ml-auto">
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                      }
                    </span>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2 overflow-hidden"
                      >
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = isActiveRoute(child.path);
                          return (
                            <Link
                              key={child.id}
                              to={child.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`
                                admin-sidebar-item relative text-sm
                                ${isChildActive ? 'active' : ''}
                              `}
                            >
                              <ChildIcon className="w-4 h-4 mr-3" />
                              {child.name}
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            if (item.comingSoon) {
              return (
                <div
                  key={item.id}
                  className={`flex items-center ${effectiveCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed`}
                  title={effectiveCollapsed ? item.name : undefined}
                  aria-label={item.name}
                >
                  <Icon className={`w-5 h-5 ${effectiveCollapsed ? '' : 'mr-3'} text-slate-400`} />
                  {!effectiveCollapsed && (
                    <>
                      {item.name}
                      <span className="ml-auto text-[10px] font-semibold uppercase bg-gray-100 text-slate-400 px-1.5 py-0.5 rounded">
                        Soon
                      </span>
                    </>
                  )}
                </div>
              );
            }

            const isActive = isActiveRoute(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  admin-sidebar-item relative
                  ${effectiveCollapsed ? 'justify-center' : ''}
                  ${isActive ? 'active' : ''}
                `}
                title={effectiveCollapsed ? item.name : undefined}
                aria-label={item.name}
              >
                <Icon className={`w-5 h-5 ${effectiveCollapsed ? '' : 'mr-3'}`} />
                {!effectiveCollapsed && item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className={`${effectiveCollapsed ? 'p-2' : 'px-3 py-3'} border-t border-gray-200`}>
          <button
            type="button"
            onClick={openMyProfile}
            className={`mb-2 flex w-full items-center rounded-lg ${effectiveCollapsed ? 'justify-center px-2 py-2' : 'px-2 py-2 text-left'} transition-colors hover:bg-gray-100`}
            title="Open My Profile"
            aria-label="Open My Profile"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">{profileBadge}</span>
            </div>
            {!effectiveCollapsed && (
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.role}</p>
              </div>
            )}
          </button>
          <button
            onClick={handleLogout}
            className={`flex items-center w-full ${effectiveCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm text-red-500 rounded-lg hover:bg-red-50 transition-colors`}
            title={effectiveCollapsed ? 'Sign Out' : undefined}
            aria-label="Sign Out"
          >
            <LogOut className={`w-4 h-4 ${effectiveCollapsed ? '' : 'mr-2'}`} />
            {!effectiveCollapsed && 'Sign Out'}
          </button>
          {isDevMode && (
            <button
              onClick={handleProbeBackend}
              disabled={probeLoading}
              className={`mt-1 flex items-center w-full ${effectiveCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-xs text-[#F97316] rounded-lg hover:bg-[#F97316]/10 transition-colors disabled:opacity-50`}
              title={effectiveCollapsed ? 'Probe Backend' : undefined}
              aria-label="Probe Backend"
            >
              {effectiveCollapsed ? (probeLoading ? '...' : 'Probe') : (probeLoading ? 'Probing...' : 'Probe Backend')}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="admin-header px-4 md:px-6 py-3" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between">
            {/* Left Side */}
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5 text-slate-500" />
              </button>

              <button
                onClick={handleSidebarCollapseToggle}
                className="hidden md:inline-flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-500 rotate-180" />
                )}
              </button>

              {/* Search Bar */}
              <div className="relative ml-3" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchQuery.length >= 2) setShowSearchDropdown(true); }}
                  placeholder="Search users, courses..."
                  className="admin-input pl-10 pr-4 py-2 w-48 md:w-64 rounded-lg text-sm"
                />

                {/* Search Results Dropdown */}
                <AnimatePresence>
                  {showSearchDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-2 w-80 md:w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto"
                    >
                      {searchLoading && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 text-[#F97316] animate-spin" />
                          <span className="ml-2 text-sm text-slate-500">Searching...</span>
                        </div>
                      )}

                      {!searchLoading && !hasResults && searchQuery.length >= 2 && (
                        <div className="py-4 text-center text-sm text-slate-500">
                          No results found for "{searchQuery}"
                        </div>
                      )}

                      {!searchLoading && hasResults && (
                        <div className="py-1">
                          {/* Users */}
                          {searchResults.users?.length > 0 && (
                            <div>
                              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Users
                              </div>
                              {searchResults.users.map((item, idx) => (
                                <button
                                  key={`user-${idx}`}
                                  onClick={() => handleSearchResultClick('users', item)}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                                >
                                  <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-sm text-gray-900 truncate">{item.name}</div>
                                    <div className="text-xs text-slate-500 truncate">{item.email} &middot; {item.role}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Courses */}
                          {searchResults.courses?.length > 0 && (
                            <div>
                              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Courses
                              </div>
                              {searchResults.courses.map((item, idx) => (
                                <button
                                  key={`course-${idx}`}
                                  onClick={() => handleSearchResultClick('courses', item)}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                                >
                                  <BookOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-sm text-gray-900 truncate">{item.title || item.courseCode}</div>
                                    {item.courseCode && (
                                      <div className="text-xs text-slate-500">{item.courseCode}</div>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Course Codes */}
                          {searchResults.courseCodes?.length > 0 && (
                            <div>
                              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Course Codes
                              </div>
                              {searchResults.courseCodes.map((item, idx) => (
                                <button
                                  key={`cc-${idx}`}
                                  onClick={() => handleSearchResultClick('courseCodes', item)}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors"
                                >
                                  <Layers className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-sm text-gray-900 truncate">{item.courseCode || item.code}</div>
                                    {item.description && (
                                      <div className="text-xs text-slate-500 truncate">{item.description}</div>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-3">
              {isDevMode && (
                <div className="hidden xl:block rounded-md border border-[#F97316]/20 bg-[#F97316]/5 px-2 py-1 font-mono text-[11px] text-[#F97316]">
                  API: {API_URL}
                </div>
              )}
              {/* Notifications */}
              <button className="p-2 rounded-lg hover:bg-gray-100 relative transition-colors">
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#F97316] rounded-full ring-2 ring-white"></span>
              </button>

              {/* User Avatar and Name */}
              <button
                type="button"
                onClick={openMyProfile}
                className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
                title="Open My Profile"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">{profileBadge}</span>
                </div>
                <span className="hidden md:block text-sm text-gray-700 font-medium">{user?.name}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
            {corsBanner && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <div className="flex items-center justify-between gap-3">
                  <span>{corsBanner}</span>
                  <button
                    type="button"
                    onClick={() => setCorsBanner(null)}
                    className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>

      {/* Probe Toast */}
      <AnimatePresence>
        {isDevMode && probeToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-2.5 text-xs shadow-xl ${
              probeToast.type === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-600'
            }`}
          >
            {probeToast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLayout;
