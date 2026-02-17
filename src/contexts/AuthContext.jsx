import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

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
        setUser(JSON.parse(savedUser));
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
        const userWithRole = {
          ...userData,
          role: userData.role === 'admin' ? 'Super Admin' : userData.role
        };
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userWithRole));
        
        setUser(userWithRole);
        return { success: true, user: userWithRole };
      } else {
        return { success: false, error: response.data?.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different error scenarios
      if (error.response?.data?.message || error.response?.data?.error) {
        return { success: false, error: error.response.data.message || error.response.data.error };
      } else if (error.response?.status === 401) {
        return { success: false, error: 'Invalid credentials' };
      } else if (error.response?.status >= 500) {
        return { success: false, error: 'Server error. Please try again later.' };
      } else {
        return { success: false, error: 'Network error. Please check your connection.' };
      }
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      
      if (response.data && response.data.user && response.data.token) {
        const { token, user } = response.data;
        
        // Store token and user data, changing admin role to Super Admin
        const userWithRole = {
          ...user,
          role: user.role === 'admin' ? 'Super Admin' : user.role
        };
        
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
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateUser,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
