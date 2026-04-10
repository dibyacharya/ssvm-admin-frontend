import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const result = await login(formData);
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col lg:flex-row font-sans">
      {/* Left Panel - Branding */}
      <div
        className="relative hidden lg:flex w-full lg:w-1/2 items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 100%)',
        }}
      >
        {/* Animated grid lines */}
        <div className="absolute inset-0 overflow-hidden">
          <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="grid"
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="rgba(249,115,22,0.08)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Geometric accent shapes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute top-20 right-20 w-40 h-40 border border-orange-500/15 rotate-45"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 0.8 }}
            className="absolute bottom-32 left-16 w-24 h-24 border border-orange-500/15 rotate-12"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 1.1 }}
            className="absolute top-1/3 left-1/4 w-56 h-56 rounded-full border border-orange-500/10"
          />

          {/* Orange glow accent */}
          <div
            className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Branding content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-10 text-center px-12"
        >
          <div className="mb-6 flex justify-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(249,115,22,0.15)' }}
            >
              <Shield className="w-8 h-8" style={{ color: '#F97316' }} />
            </div>
          </div>
          <h1
            className="text-6xl font-extrabold tracking-tight mb-3"
            style={{ color: '#1E293B' }}
          >
            SSVM
          </h1>
          <div
            className="h-1 w-16 mx-auto mb-4 rounded-full"
            style={{ backgroundColor: '#F97316' }}
          />
          <p
            className="text-xl font-medium tracking-wide"
            style={{ color: '#475569' }}
          >
            Admin Portal
          </p>
          <p
            className="mt-4 text-sm max-w-xs mx-auto leading-relaxed"
            style={{ color: '#64748B' }}
          >
            Centralized management for your learning management system
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Login Form */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Mobile branding (visible only on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: 'rgba(249,115,22,0.15)' }}
            >
              <Shield className="w-6 h-6" style={{ color: '#F97316' }} />
            </div>
            <h2
              className="text-2xl font-bold"
              style={{ color: '#1E293B' }}
            >
              SSVM
            </h2>
            <p
              className="text-sm"
              style={{ color: '#64748B' }}
            >
              Admin Portal
            </p>
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl p-8 sm:p-10"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            <div className="mb-8">
              <h2
                className="text-2xl font-bold"
                style={{ color: '#1E293B' }}
              >
                Sign In
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: '#64748B' }}
              >
                Welcome back! Please sign in to your account.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="mb-6 p-4 rounded-lg text-sm"
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#DC2626',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email / User ID */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                  style={{ color: '#475569' }}
                >
                  User ID
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Mail
                      className="h-5 w-5"
                      style={{ color: '#94A3B8' }}
                      aria-hidden="true"
                    />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    autoComplete="username"
                    required
                    className="admin-input block w-full pl-12 pr-4 py-3 rounded-lg text-sm transition-all duration-200 outline-none"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(0,0,0,0.1)',
                      color: '#1E293B',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#F97316';
                      e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0,0,0,0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                    placeholder="Enter User ID"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-baseline">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium mb-2"
                    style={{ color: '#475569' }}
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium transition-colors duration-200"
                    style={{ color: '#F97316' }}
                    onMouseEnter={(e) =>
                      (e.target.style.color = '#FB923C')
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.color = '#F97316')
                    }
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Lock
                      className="h-5 w-5"
                      style={{ color: '#94A3B8' }}
                      aria-hidden="true"
                    />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="admin-input block w-full pl-12 pr-12 py-3 rounded-lg text-sm transition-all duration-200 outline-none"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(0,0,0,0.1)',
                      color: '#1E293B',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#F97316';
                      e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0,0,0,0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 transition-colors duration-200"
                    style={{ color: '#94A3B8' }}
                    onMouseEnter={(e) =>
                      (e.target.style.color = '#64748B')
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.color = '#94A3B8')
                    }
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="admin-btn-primary w-full flex justify-center py-3 px-4 rounded-lg text-base font-semibold text-white transition-all duration-200 outline-none mt-2"
                style={{
                  backgroundColor: loading ? '#374151' : '#F97316',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.target.style.backgroundColor = '#EA580C';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.target.style.backgroundColor = '#F97316';
                }}
                onFocus={(e) => {
                  if (!loading)
                    e.target.style.boxShadow =
                      '0 0 0 3px rgba(249,115,22,0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p
            className="text-center text-xs mt-6"
            style={{ color: '#94A3B8' }}
          >
            SSVM LMS Admin Portal
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
