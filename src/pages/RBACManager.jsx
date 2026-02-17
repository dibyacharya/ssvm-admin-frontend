
import React, { useState, useEffect } from 'react';
import {
  Shield,
  Save,
  RotateCcw,
  Edit,
  Eye,
  Plus,
  Trash2,
  CheckCircle,
  X,
  AlertTriangle,
  Search,
  Filter,
  Download
} from 'lucide-react';

// RBAC Data Constants
const roles = [
  { id: 1, name: 'Super Admin', level: 6, color: 'bg-red-500', description: 'Full system access' },
  { id: 2, name: 'Org Admin', level: 5, color: 'bg-orange-500', description: 'Organization level access' },
  { id: 3, name: 'Associate Dean', level: 4, color: 'bg-yellow-500', description: 'School level access' },
  { id: 4, name: 'Course Coordinator', level: 3, color: 'bg-green-500', description: 'Program level access' },
  { id: 5, name: 'TA', level: 2, color: 'bg-blue-500', description: 'Teaching assistance' },
  { id: 6, name: 'Student', level: 1, color: 'bg-purple-500', description: 'Student access' }
];

// Display-only hierarchy for the legend/chips in Role Hierarchy section.
const roleHierarchyDisplay = [
  { name: 'Super Admin', color: 'bg-red-500' },
  { name: 'Dean', color: 'bg-orange-500' },
  { name: 'Associate Dean', color: 'bg-yellow-500' },
  { name: 'Program Coordinator', color: 'bg-emerald-500' },
  { name: 'Course Coordinator', color: 'bg-green-500' },
  { name: 'Teacher', color: 'bg-cyan-500' },
  { name: 'TA', color: 'bg-blue-500' },
  { name: 'Student', color: 'bg-purple-500' }
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

// Default permissions based on your specifications
const getDefaultPermissions = () => {
  const defaultPerms = {};
  
  roles.forEach(role => {
    features.forEach(feature => {
      actions.forEach(action => {
        scopes.forEach(scope => {
          const key = `${role.id}-${feature.id}-${action.id}-${scope.id}`;
          
          // Default logic based on your specifications
          if (role.level >= 5) { // Super Admin, Org Admin
            defaultPerms[key] = true;
          } else if (role.level === 4) { // Associate Dean
            defaultPerms[key] = action.id === 'view';
          } else if (role.level === 3) { // Course Coordinator
            if (feature.name === 'Course Content' && scope.level <= 2) {
              defaultPerms[key] = true;
            } else {
              defaultPerms[key] = action.id === 'view';
            }
          } else if (role.level === 2) { // TA
            if (feature.name === 'Course Content' && (action.id === 'view' || action.id === 'create')) {
              defaultPerms[key] = true;
            } else {
              defaultPerms[key] = action.id === 'view';
            }
          } else { // Student
            defaultPerms[key] = action.id === 'view' && feature.category !== 'Management';
          }
        });
      });
    });
  });
  
  return defaultPerms;
};

const RBACManager = () => {
  const [permissions, setPermissions] = useState({});
  const [originalPermissions, setOriginalPermissions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedRole, setSelectedRole] = useState(roles[0].id);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize permissions
  useEffect(() => {
    const defaultPerms = getDefaultPermissions();
    setPermissions(defaultPerms);
    setOriginalPermissions(defaultPerms);
  }, []);

  // Check for changes
  useEffect(() => {
    const hasChanged = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);
    setHasChanges(hasChanged);
  }, [permissions, originalPermissions]);

  const getPermissionKey = (roleId, featureId, actionId, scopeId) => {
    return `${roleId}-${featureId}-${actionId}-${scopeId}`;
  };

  const togglePermission = (roleId, featureId, actionId, scopeId) => {
    const key = getPermissionKey(roleId, featureId, actionId, scopeId);
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setOriginalPermissions(permissions);
      setShowSaveModal(false);
      
      // Show success notification
      console.log('Permissions saved successfully');
    } catch (error) {
      console.error('Error saving permissions:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetPermissions = () => {
    setPermissions(originalPermissions);
  };

  const filteredFeatures = features.filter(feature => {
    const matchesSearch = feature.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || feature.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(features.map(f => f.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              Roles & Permissions
            </h1>
            <p className="text-gray-600 mt-1">
              Manage role-based access control and feature permissions
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Unsaved changes
              </div>
            )}
            
            <button
              onClick={resetPermissions}
              disabled={!hasChanges}
              className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </button>
            
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={!hasChanges}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search features..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Role Hierarchy Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Hierarchy</h2>
        <div className="flex flex-wrap gap-4">
          {roleHierarchyDisplay.map((role, index) => (
            <div key={role.name} className="flex items-center">
              <div className={`w-3 h-3 ${role.color} rounded-full mr-2`}></div>
              <span className="text-sm font-medium text-gray-700">{role.name}</span>
              {index < roleHierarchyDisplay.length - 1 && (
                <span className="mx-3 text-gray-400">→</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Higher roles inherit view permissions from lower roles. Edit permissions don't inherit upward.
        </p>
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Permission Matrix</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure permissions for each role, feature, action, and scope combination
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200">
              <div className="flex">
                <div className="w-64 p-4 font-medium text-gray-900 border-r border-gray-200">
                  Feature / Role
                </div>
                {roles.map(role => (
                  <div key={role.id} className="w-48 p-4 text-center border-r border-gray-200">
                    <div className="flex items-center justify-center">
                      <div className={`w-3 h-3 ${role.color} rounded-full mr-2`}></div>
                      <span className="font-medium text-gray-900">{role.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Permission Rows */}
            {filteredFeatures.map(feature => (
              <div key={feature.id} className="border-b border-gray-200">
                {/* Feature Header Row */}
                <div className="bg-gray-25 border-b border-gray-100">
                  <div className="flex">
                    <div className="w-64 p-4 border-r border-gray-200">
                      <div className="font-medium text-gray-900">{feature.name}</div>
                      <div className="text-sm text-gray-500">{feature.category}</div>
                    </div>
                    {roles.map(role => (
                      <div key={role.id} className="w-48 p-4 border-r border-gray-200"></div>
                    ))}
                  </div>
                </div>

                {/* Action/Scope Grid */}
                {actions.map(action => (
                  <div key={action.id} className="border-b border-gray-50 last:border-b-0">
                    <div className="flex">
                      <div className="w-64 p-3 border-r border-gray-200 bg-gray-25">
                        <div className="text-sm font-medium text-gray-700 ml-4">
                          {action.name}
                        </div>
                      </div>
                      {roles.map(role => (
                        <div key={role.id} className="w-48 p-3 border-r border-gray-200">
                          <div className="grid grid-cols-3 gap-1">
                            {scopes.slice(0, 6).map(scope => {
                              const permKey = getPermissionKey(role.id, feature.id, action.id, scope.id);
                              const isGranted = permissions[permKey];
                              
                              return (
                                <button
                                  key={scope.id}
                                  onClick={() => togglePermission(role.id, feature.id, action.id, scope.id)}
                                  className={`
                                    w-8 h-8 rounded text-xs font-medium transition-all
                                    ${isGranted
                                      ? 'bg-green-500 text-white shadow-sm'
                                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                    }
                                  `}
                                  title={`${action.name} ${feature.name} at ${scope.name} level`}
                                >
                                  {scope.name.charAt(0)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Granted</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Denied</span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Scope levels: U=University, S=School, D=Department, P=Program, C=Course, B=Batch
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal */}
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
