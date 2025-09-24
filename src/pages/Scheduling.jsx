import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit3, Trash2, RefreshCw, X, Save } from 'lucide-react';
import api from '../services/api'; // Adjust import path as needed

// API Functions
const getAllSemester = async () => {
  const response = await api.get("/semesters");
  return response.data;
};

const createSemester = async (semesterData) => {
  const response = await api.post("/semesters", semesterData);
  return response.data;
};

export const Scheduling = () => {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchSemesterData();
  }, []);

  const fetchSemesterData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSemester();
      setSemesters(data);
      console.log('Semester data:', data);
    } catch (err) {
      setError('Failed to fetch semester data');
      console.error('Error fetching semester data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    
    try {
      setCreating(true);
      
      // Format dates to ISO string
      const semesterData = {
        name: formData.name,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString()
      };
      
      console.log('Creating semester with data:', semesterData);
      
      const newSemester = await createSemester(semesterData);
      console.log('Created semester:', newSemester);
      
      // Refresh the list
      await fetchSemesterData();
      
      // Reset form and close modal
      setFormData({ name: '', startDate: '', endDate: '' });
      setShowCreateForm(false);
      
    } catch (err) {
      console.error('Error creating semester:', err);
      setError('Failed to create semester');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Unknown duration';
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} weeks (${diffDays} days)`;
    } catch {
      return 'Unknown duration';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Semester Data</h2>
            <p className="text-gray-600">Please wait while we fetch the scheduling information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Scheduling & Timetables</h1>
              <p className="text-gray-600">Manage academic schedules and semester information</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchSemesterData}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Semester</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Semesters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {semesters.map((semester) => (
          <div key={semester._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{semester.name}</h3>
                  <p className="text-sm text-gray-500">ID: {semester._id.slice(-8)}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Duration</p>
                <p className="text-sm text-gray-600">{calculateDuration(semester.startDate, semester.endDate)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Start Date</p>
                <p className="text-sm text-gray-600">{formatDate(semester.startDate)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">End Date</p>
                <p className="text-sm text-gray-600">{formatDate(semester.endDate)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Courses</p>
                <p className="text-sm text-gray-600">
                  {semester.courses.length === 0 ? 'No courses assigned' : `${semester.courses.length} courses`}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Created</p>
                <p className="text-sm text-gray-600">{formatDate(semester.createdAt)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {semesters.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Semesters Found</h2>
            <p className="text-gray-600 mb-4">Get started by creating your first semester.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Semester
            </button>
          </div>
        </div>
      )}

      {/* Create Semester Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New Semester</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSemester} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Fall 2024, Spring 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-white transition-colors ${
                    creating 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{creating ? 'Creating...' : 'Create Semester'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};