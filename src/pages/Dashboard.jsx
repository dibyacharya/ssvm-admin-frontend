import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { getTeacherCourses, getAllStudentCourses } from '../services/courses.service';
import { safeCohortLabel } from '../utils/nullSafety';
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
  ExternalLink
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleCourses, setRoleCourses] = useState([]);
  const displayName =
    typeof user?.name === 'string'
      ? user.name.replace(/KIT ADMIN/gi, 'KIIT ADMIN')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button onClick={() => user?.role === 'admin' ? fetchStats() : user?.role === 'teacher' ? fetchTeacherDashboard() : fetchStudentDashboard()} className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium">
          Try again
        </button>
      </div>
    );
  }

  // Teacher/Student dashboard
  if (user?.role === 'teacher' || user?.role === 'student') {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow-lg text-white p-6">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {displayName}!
          </h1>
          <p className="text-emerald-100">
            {user?.role === 'teacher' ? 'Here are your assigned courses.' : 'Here are your enrolled courses.'}
          </p>
        </div>

        {roleCourses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No courses found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roleCourses.map((course) => (
              <div key={course._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                      {safeCohortLabel(course)}
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
                  </div>
                  {course.courseType && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      course.courseType === 'theory' ? 'bg-blue-100 text-blue-800' :
                      course.courseType === 'practical' ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {course.courseType}
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {course.semester?.name && (
                    <p className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-2 text-gray-400" />
                      {course.semester.name}
                    </p>
                  )}
                  {course.semester?.batch?.program?.name && (
                    <p className="flex items-center">
                      <GraduationCap className="w-3.5 h-3.5 mr-2 text-gray-400" />
                      {course.semester.batch.program.name}
                    </p>
                  )}
                  {course.studentCount != null && (
                    <p className="flex items-center">
                      <Users className="w-3.5 h-3.5 mr-2 text-gray-400" />
                      {course.studentCount} students
                    </p>
                  )}
                </div>
                <button
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  onClick={() => window.open(`/courses`, '_self')}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-2" />
                  Open in LMS
                </button>
              </div>
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
    { title: 'Total Users', value: overview.totalUsers ?? 0, icon: Users, color: 'bg-blue-500' },
    { title: 'Total Faculty', value: overview.totalTeachers ?? 0, icon: GraduationCap, color: 'bg-indigo-500' },
    { title: 'Total Students', value: overview.totalStudents ?? 0, icon: Users, color: 'bg-cyan-500' },
    { title: 'Active Courses', value: overview.totalActiveCourses ?? 0, icon: BookOpen, color: 'bg-green-500' },
    { title: 'Total Programs', value: systemActivity.totalPrograms ?? 0, icon: Layers, color: 'bg-purple-500' },
    { title: 'Total Batches', value: systemActivity.totalBatches ?? 0, icon: Calendar, color: 'bg-orange-500' },
    { title: 'Total Lectures', value: overview.totalLectures ?? 0, icon: Video, color: 'bg-rose-500' },
    { title: 'Total Assignments', value: overview.totalAssignments ?? 0, icon: FileText, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow-lg text-white p-6">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {displayName}!
        </h1>
        <p className="text-emerald-100">
          Here's what's happening in your OneCampus system today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value.toLocaleString()}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity (last 7 days) + Recent Activities Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <p className="text-sm text-gray-500">{recentActivity.period || 'Last 7 days'}</p>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{recentActivity.newUsers ?? 0}</p>
              <p className="text-sm text-blue-600">New Users</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{recentActivity.newCourses ?? 0}</p>
              <p className="text-sm text-green-600">New Courses</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">{recentActivity.newLectures ?? 0}</p>
              <p className="text-sm text-purple-600">New Lectures</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-700">{recentActivity.newAssignments ?? 0}</p>
              <p className="text-sm text-orange-600">New Assignments</p>
            </div>
          </div>
        </div>

        {/* Recent Activities Feed */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Activities Feed</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {(stats?.recentActivities || []).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No recent activities</p>
              )}
              {(stats?.recentActivities || []).slice(0, 8).map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
