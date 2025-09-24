import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  BookOpen,
  Award,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Total Users',
      value: '2,847',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Courses',
      value: '156',
      change: '+5%',
      changeType: 'positive',
      icon: BookOpen,
      color: 'bg-green-500'
    },
    {
      title: 'Certificates Issued',
      value: '1,234',
      change: '+23%',
      changeType: 'positive',
      icon: Award,
      color: 'bg-purple-500'
    },
    {
      title: 'System Activity',
      value: '94%',
      change: '-2%',
      changeType: 'negative',
      icon: Activity,
      color: 'bg-orange-500'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      user: 'Dr. Sarah Johnson',
      action: 'Created new course',
      target: 'Advanced Machine Learning',
      time: '2 minutes ago',
      type: 'course'
    },
    {
      id: 2,
      user: 'Admin Mike',
      action: 'Updated role permissions',
      target: 'TA Role',
      time: '15 minutes ago',
      type: 'permission'
    },
    {
      id: 3,
      user: 'Prof. David Chen',
      action: 'Approved certificate',
      target: 'John Doe - Data Science',
      time: '1 hour ago',
      type: 'certificate'
    },
    {
      id: 4,
      user: 'System',
      action: 'Scheduled maintenance',
      target: 'Database backup',
      time: '2 hours ago',
      type: 'system'
    }
  ];

  const pendingTasks = [
    {
      id: 1,
      title: 'Review course proposals',
      count: 5,
      priority: 'high',
      dueDate: 'Today'
    },
    {
      id: 2,
      title: 'Approve new user registrations',
      count: 12,
      priority: 'medium',
      dueDate: 'Tomorrow'
    },
    {
      id: 3,
      title: 'Update system policies',
      count: 3,
      priority: 'low',
      dueDate: 'This week'
    }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-4 h-4" />;
      case 'permission':
        return <CheckCircle className="w-4 h-4" />;
      case 'certificate':
        return <Award className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow-lg text-white p-6">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-blue-100">
          Here's what's happening in your OneCampus system today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span>
                      {' '}{activity.action}{' '}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all activities
              </button>
            </div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending Tasks</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {pendingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">Due: {task.dueDate}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">{task.count}</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all tasks
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <Users className="w-6 h-6 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900">Add New User</h3>
            <p className="text-sm text-gray-500">Create a new user account</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <BookOpen className="w-6 h-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Create Course</h3>
            <p className="text-sm text-gray-500">Set up a new course</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <Award className="w-6 h-6 text-purple-600 mb-2" />
            <h3 className="font-medium text-gray-900">Issue Certificate</h3>
            <p className="text-sm text-gray-500">Award a new certificate</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;