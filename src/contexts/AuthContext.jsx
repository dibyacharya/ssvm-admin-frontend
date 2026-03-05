import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();
const ACCESS_ROLE_TAGS = new Set([
  'SUPER_ADMIN',
  'DEAN',
  'ASSOCIATE_DEAN',
  'PROGRAM_COORDINATOR',
  'COURSE_COORDINATOR',
  'TEACHER',
  'TA',
  'STUDENT',
]);

const ACCESS_ROLE_ALIASES = {
  super_admin: 'SUPER_ADMIN',
  superadmin: 'SUPER_ADMIN',
  admin: 'SUPER_ADMIN',
  dean: 'DEAN',
  associate_dean: 'ASSOCIATE_DEAN',
  assoc_dean: 'ASSOCIATE_DEAN',
  program_coordinator: 'PROGRAM_COORDINATOR',
  program_coord: 'PROGRAM_COORDINATOR',
  course_coordinator: 'COURSE_COORDINATOR',
  course_coord: 'COURSE_COORDINATOR',
  teacher: 'TEACHER',
  ta: 'TA',
  student: 'STUDENT',
};

const toAliasToken = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const normalizeAccessRoleTag = (value) => {
  const aliasToken = toAliasToken(value);
  if (!aliasToken) return '';
  const mapped = ACCESS_ROLE_ALIASES[aliasToken];
  if (mapped) return mapped;
  const canonical = aliasToken.toUpperCase();
  return ACCESS_ROLE_TAGS.has(canonical) ? canonical : '';
};

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

const normalizeUserShape = (value) => {
  if (!value || typeof value !== 'object') return null;
  return {
    ...value,
    accessRoles: normalizeAccessRoles(value.accessRoles),
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        setUser(normalizeUserShape(JSON.parse(savedUser)));
      } catch (error) {
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials.email, credentials.password);
      
      if (response.data && response.data.user && response.data.token) {
        const { token, user: userData } = response.data;
        
        // Store token and user data, changing admin role to Super Admin
        const userWithRole = normalizeUserShape({
          ...userData,
          role: userData.role === 'admin' ? 'Super Admin' : userData.role
        });
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userWithRole));
        
        setUser(userWithRole);
        return { success: true, user: userWithRole };
      } else {
        return { success: false, error: response.data?.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);

      const code = error.response?.data?.code;
      const backendMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        '';
      if (code === 'USER_NOT_FOUND') {
        return { success: false, error: 'Wrong User ID' };
      }
      if (code === 'INVALID_PASSWORD') {
        return { success: false, error: 'Wrong Password' };
      }
      if (code === 'SUPER_ADMIN_ONLY') {
        return {
          success: false,
          error:
            backendMessage ||
            'Admin Portal access is restricted to SUPER_ADMIN only.',
        };
      }
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      
      if (response.data && response.data.user && response.data.token) {
        const { token, user } = response.data;
        
        // Store token and user data, changing admin role to Super Admin
        const userWithRole = normalizeUserShape({
          ...user,
          role: user.role === 'admin' ? 'Super Admin' : user.role
        });
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userWithRole));
        
        setUser(userWithRole);
        return { success: true, user: userWithRole };
      } else {
        return { success: false, error: response.data?.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response?.data?.message || error.response?.data?.error) {
        return { success: false, error: error.response.data.message || error.response.data.error };
      } else if (error.response?.status >= 500) {
        return { success: false, error: 'Server error. Please try again later.' };
      } else {
        return { success: false, error: 'Network error. Please check your connection.' };
      }
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Redirect will be handled by the axios interceptor
  };

  const updateUser = (userData) => {
    const updatedUser = normalizeUserShape({ ...(user || {}), ...(userData || {}) });
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const hasAccessRole = (roleTag, targetUser = user) => {
    const normalizedTarget = normalizeAccessRoleTag(roleTag);
    if (!normalizedTarget) return false;
    const assigned = normalizeAccessRoles(targetUser?.accessRoles);
    if (assigned.includes('SUPER_ADMIN')) return true;
    return assigned.includes(normalizedTarget);
  };

  const hasAnyAccessRole = (roleTags = [], targetUser = user) => {
    if (!Array.isArray(roleTags)) return false;
    return roleTags.some((roleTag) => hasAccessRole(roleTag, targetUser));
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateUser,
    hasAccessRole,
    hasAnyAccessRole,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
