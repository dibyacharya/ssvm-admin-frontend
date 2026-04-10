import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { getTeacherCourses, getAllStudentCourses } from '../services/courses.service';
import { safeCohortLabel } from '../utils/nullSafety';
import AdminStatCard from '../components/ui/AdminStatCard';
import AdminCard from '../components/ui/AdminCard';
import {
  Users,
  BookOpen,
  Award,
  GraduationCap,
  Layers,
  Calendar,
  Video,
  Megaphone,
  UserPlus,
  FileText,
  Activity,
  CheckCircle,
  ExternalLink,
  BarChart3,
  ChevronRight,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleCourses, setRoleCourses] = useState([]);
  const displayName =
    typeof user?.name === 'string'
      ? user.name
      : user?.name;

  useEffect(() => {
    if (user?.role === 'teacher') {
      fetchTeacherDashboard();
    } else if (user?.role === 'student') {
      fetchStudentDashboard();
    } else {
      fetchStats();
    }
  }, [user?.role]);

  const fetchTeacherDashboard = async () => {
    try {
      setLoading(true);
      const data = await getTeacherCourses();
      setRoleCourses(data.courses || data || []);
    } catch (err) {
      setError('Failed to load your courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDashboard = async () => {
    try {
      setLoading(true);
      const data = await getAllStudentCourses();
      setRoleCourses(data.courses || data || []);
    } catch (err) {
      setError('Failed to load your courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/stats');
      setStats(response.data.stats);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'course_created':
        return <BookOpen className="w-4 h-4" />;
      case 'user_registered':
        return <UserPlus className="w-4 h-4" />;
      case 'assignment_created':
        return <FileText className="w-4 h-4" />;
      case 'announcement_posted':
        return <Megaphone className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" style={{ backgroundColor: '#020617' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(239,68,68,0.3)' }}>
        <p className="text-red-400">{error}</p>
        <button
          onClick={() =>
            user?.role === 'admin'
              ? fetchStats()
              : user?.role === 'teacher'
              ? fetchTeacherDashboard()
              : fetchStudentDashboard()
          }
          className="mt-2 text-sm text-orange-400 hover:text-orange-300 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  // Teacher/Student dashboard
  if (user?.role === 'teacher' || user?.role === 'student') {
    return (
      <div className="space-y-6" style={{ backgroundColor: '#020617', minHeight: '100vh', padding: '24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-lg p-6"
          style={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h1 className="text-2xl font-bold mb-2 text-[#1E293B]">
            Welcome back, {displayName}!
          </h1>
          <p className="text-[#94A3B8]">
            {user?.role === 'teacher' ? 'Here are your assigned courses.' : 'Here are your enrolled courses.'}
          </p>
        </motion.div>

        {roleCourses.length === 0 ? (
          <AdminCard>
            <div className="text-center py-4">
              <BookOpen className="w-12 h-12 text-[#475569] mx-auto mb-3" />
              <p className="text-[#94A3B8]">No courses found.</p>
            </div>
          </AdminCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roleCourses.map((course, index) => (
              <AdminCard key={course._id} hover delay={index * 0.05}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-1">
                      {safeCohortLabel(course)}
                    </p>
                    <h3 className="text-lg font-semibold text-[#1E293B]">{course.title}</h3>
                  </div>
                  {course.courseType && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      course.courseType === 'theory'
                        ? 'bg-indigo-500/10 text-indigo-400'
                        : course.courseType === 'practical'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-orange-500/10 text-orange-400'
                    }`}>
                      {course.courseType}
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm text-[#94A3B8] mb-4">
                  {course.semester?.name && (
                    <p className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-2 text-[#475569]" />
                      {course.semester.name}
                    </p>
                  )}
                  {course.semester?.batch?.program?.name && (
                    <p className="flex items-center">
                      <GraduationCap className="w-3.5 h-3.5 mr-2 text-[#475569]" />
                      {course.semester.batch.program.name}
                    </p>
                  )}
                  {course.studentCount != null && (
                    <p className="flex items-center">
                      <Users className="w-3.5 h-3.5 mr-2 text-[#475569]" />
                      {course.studentCount} students
                    </p>
                  )}
                </div>
                <button
                  className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#F97316' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(249,115,22,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(249,115,22,0.1)'; }}
                  onClick={() => window.open(`/courses`, '_self')}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-2" />
                  Open in LMS
                </button>
              </AdminCard>
            ))}
          </div>
        )}
      </div>
    );
  }

  const overview = stats?.overview || {};
  const systemActivity = stats?.systemActivity || {};
  const recentActivity = stats?.recentActivity || {};

  const statCards = [
    { title: 'Total Students', value: overview.totalStudents ?? 0, icon: Users, color: 'orange', subtitle: 'Enrolled students' },
    { title: 'Active Courses', value: overview.totalActiveCourses ?? 0, icon: BookOpen, color: 'cyan', subtitle: 'Currently running' },
    { title: 'Total Faculty', value: overview.totalTeachers ?? 0, icon: GraduationCap, color: 'emerald', subtitle: 'Teaching staff' },
    { title: 'Total Programs', value: systemActivity.totalPrograms ?? 0, icon: Layers, color: 'rose', subtitle: 'Academic programs' },
    { title: 'Total Batches', value: systemActivity.totalBatches ?? 0, icon: Calendar, color: 'indigo', subtitle: 'Active batches' },
    { title: 'Total Users', value: overview.totalUsers ?? 0, icon: Users, color: 'orange', subtitle: 'All platform users' },
    { title: 'Total Lectures', value: overview.totalLectures ?? 0, icon: Video, color: 'cyan', subtitle: 'Content delivered' },
    { title: 'Assignments', value: overview.totalAssignments ?? 0, icon: FileText, color: 'emerald', subtitle: 'Created assignments' },
  ];

  const activityBadgeColor = (type) => {
    switch (type) {
      case 'course_created': return 'admin-badge-cyan';
      case 'user_registered': return 'admin-badge-emerald';
      case 'assignment_created': return 'admin-badge-orange';
      case 'announcement_posted': return 'admin-badge-rose';
      default: return 'admin-badge-indigo';
    }
  };

  const activityLabel = (type) => {
    switch (type) {
      case 'course_created': return 'Course';
      case 'user_registered': return 'User';
      case 'assignment_created': return 'Assignment';
      case 'announcement_posted': return 'Announcement';
      default: return 'Activity';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2 text-xs text-[#94A3B8] mb-1">
            <span>Admin</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#94A3B8]">Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Dashboard</h1>
        </div>
        <div className="mt-2 sm:mt-0 text-sm text-[#94A3B8]">{currentDate}</div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <AdminStatCard
            key={index}
            title={stat.title}
            value={stat.value}
            subtitle={stat.subtitle}
            icon={stat.icon}
            color={stat.color}
            delay={index * 0.05}
          />
        ))}
      </div>

      {/* Recent Activity + Activities Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Summary */}
        <AdminCard padding="p-0" delay={0.2}>
          <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-[#1E293B]">Recent Activity</h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">{recentActivity.period || 'Last 7 days'}</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            {[
              { label: 'New Users', value: recentActivity.newUsers ?? 0, color: 'orange' },
              { label: 'New Courses', value: recentActivity.newCourses ?? 0, color: 'cyan' },
              { label: 'New Lectures', value: recentActivity.newLectures ?? 0, color: 'indigo' },
              { label: 'New Assignments', value: recentActivity.newAssignments ?? 0, color: 'emerald' },
            ].map((item, i) => {
              const bgMap = {
                orange: 'rgba(249,115,22,0.08)',
                cyan: 'rgba(34,211,238,0.08)',
                indigo: 'rgba(99,102,241,0.08)',
                emerald: 'rgba(16,185,129,0.08)',
              };
              const textMap = {
                orange: '#F97316',
                cyan: '#22D3EE',
                indigo: '#6366F1',
                emerald: '#10B981',
              };
              return (
                <div
                  key={i}
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: bgMap[item.color] }}
                >
                  <p className="text-2xl font-bold font-mono" style={{ color: textMap[item.color] }}>
                    {item.value}
                  </p>
                  <p className="text-xs mt-1" style={{ color: textMap[item.color], opacity: 0.7 }}>
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </AdminCard>

        {/* Activities Feed */}
        <AdminCard padding="p-0" delay={0.25}>
          <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-[#1E293B]">Activities Feed</h2>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {(stats?.recentActivities || []).length === 0 && (
                <p className="text-sm text-[#94A3B8] text-center py-4">No recent activities</p>
              )}
              {(stats?.recentActivities || []).slice(0, 8).map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8]"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-[#334155]">{activity.description}</p>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${activityBadgeColor(activity.type)}`}>
                        {activityLabel(activity.type)}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] mt-1">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
};

export default Dashboard;
