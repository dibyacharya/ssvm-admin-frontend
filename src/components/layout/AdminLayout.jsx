import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
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
  ClipboardList,
  GitBranch,
  Eye,
  Wand2
} from 'lucide-react';

const sidebarItems = [
  { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
  { id: 'rbac', name: 'Roles & Permissions', icon: Shield, path: '/rbac' },
  { id: 'users', name: 'User Management', icon: Users, path: '/users' },
  {
    id: 'program-management',
    name: 'Program Management',
    icon: GraduationCap,
    type: 'group',
    children: [
      { id: 'onboarding', name: 'Setup Wizard', icon: Wand2, path: '/onboarding' },
      { id: 'programs', name: 'Programs', icon: ClipboardList, path: '/programs' },
      { id: 'batches', name: 'Batches', icon: Layers, path: '/batches' },
      { id: 'cohorts', name: 'Student Enrollment', icon: Users, path: '/cohorts' },
      { id: 'gantt', name: 'Gantt Chart', icon: GitBranch, path: '/gantt' },
    ]
  },
  { id: 'courses', name: 'Course Management', icon: BookOpen, path: '/courses' }
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDevMode = import.meta.env.DEV === true;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeToast, setProbeToast] = useState(null);
  const [corsBanner, setCorsBanner] = useState(null);
  const searchRef = useRef(null);

  // Sidebar group expand/collapse
  const [expandedGroups, setExpandedGroups] = useState(() => {
    // Auto-expand groups that contain the current active route
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

  const handleSearchResultClick = (type, item) => {
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
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition-transform duration-300 ease-in-out
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
           <img src="/logo_full.png" alt="" className="h-12" />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;

            // Group item with children
            if (item.type === 'group') {
              const isExpanded = expandedGroups[item.id];
              const isGroupActive = item.children?.some(child => isActiveRoute(child.path));
              return (
                <div key={item.id}>
                  <button
                    onClick={() => toggleGroup(item.id)}
                    className={`
                      w-full flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors
                      ${isGroupActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isGroupActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    {item.name}
                    <span className="ml-auto">
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                      }
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = isActiveRoute(child.path);
                        return (
                          <Link
                            key={child.id}
                            to={child.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`
                              flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                              ${isChildActive
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }
                            `}
                          >
                            <ChildIcon className={`w-4 h-4 mr-3 ${isChildActive ? 'text-blue-600' : 'text-gray-400'}`} />
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            if (item.comingSoon) {
              return (
                <div
                  key={item.id}
                  className="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed opacity-60"
                >
                  <Icon className="w-5 h-5 mr-3 text-gray-300" />
                  {item.name}
                  <span className="ml-auto text-[10px] font-semibold uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                    Soon
                  </span>
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
                  flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={openMyProfile}
            className="mb-3 flex w-full items-center rounded-lg px-1 py-1 text-left transition-colors hover:bg-gray-50"
            title="Open My Profile"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">{profileBadge}</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
          {isDevMode && (
            <button
              onClick={handleProbeBackend}
              disabled={probeLoading}
              className="mt-2 flex items-center w-full px-3 py-2 text-xs text-blue-700 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-60"
            >
              {probeLoading ? 'Probing...' : 'Probe Backend'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Side */}
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              
              {/* Search Bar */}
              <div className="relative ml-4" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchQuery.length >= 2) setShowSearchDropdown(true); }}
                  placeholder="Search users, courses..."
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                {/* Search Results Dropdown */}
                {showSearchDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {searchLoading && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        <span className="ml-2 text-sm text-gray-500">Searching...</span>
                      </div>
                    )}

                    {!searchLoading && !hasResults && searchQuery.length >= 2 && (
                      <div className="py-4 text-center text-sm text-gray-500">
                        No results found for "{searchQuery}"
                      </div>
                    )}

                    {!searchLoading && hasResults && (
                      <div className="py-2">
                        {/* Users */}
                        {searchResults.users?.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                              Users
                            </div>
                            {searchResults.users.map((item, idx) => (
                              <button
                                key={`user-${idx}`}
                                onClick={() => handleSearchResultClick('users', item)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                              >
                                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-sm text-gray-900 truncate">{item.name}</div>
                                  <div className="text-xs text-gray-500 truncate">{item.email} &middot; {item.role}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Courses */}
                        {searchResults.courses?.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                              Courses
                            </div>
                            {searchResults.courses.map((item, idx) => (
                              <button
                                key={`course-${idx}`}
                                onClick={() => handleSearchResultClick('courses', item)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                              >
                                <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-sm text-gray-900 truncate">{item.title || item.courseCode}</div>
                                  {item.courseCode && (
                                    <div className="text-xs text-gray-500">{item.courseCode}</div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Course Codes */}
                        {searchResults.courseCodes?.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                              Course Codes
                            </div>
                            {searchResults.courseCodes.map((item, idx) => (
                              <button
                                key={`cc-${idx}`}
                                onClick={() => handleSearchResultClick('courseCodes', item)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3"
                              >
                                <Layers className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-sm text-gray-900 truncate">{item.courseCode || item.code}</div>
                                  {item.description && (
                                    <div className="text-xs text-gray-500 truncate">{item.description}</div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {isDevMode && (
                <div className="hidden xl:block rounded border border-blue-200 bg-blue-50 px-2 py-1 font-mono text-[11px] text-blue-700">
                  API: {API_URL}
                </div>
              )}
              {/* Notifications */}
              <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* User Avatar */}
              <button
                type="button"
                onClick={openMyProfile}
                className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center"
                title="Open My Profile"
              >
                <span className="text-white text-sm font-medium">{profileBadge}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {corsBanner && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex items-center justify-between gap-3">
                  <span>{corsBanner}</span>
                  <button
                    type="button"
                    onClick={() => setCorsBanner(null)}
                    className="text-xs underline underline-offset-2"
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
      {isDevMode && probeToast && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-md border px-3 py-2 text-xs shadow-lg ${
            probeToast.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {probeToast.message}
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
