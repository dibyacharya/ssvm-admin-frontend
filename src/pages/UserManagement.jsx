import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  X
} from 'lucide-react';

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    phone: '',
    status: 'active'
  });

  // Mock user data
  const [users, setUsers] = useState([
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@university.edu',
      role: 'Associate Dean',
      status: 'active',
      department: 'Computer Science',
      phone: '+1 (555) 123-4567',
      joinDate: '2023-01-15',
      lastLogin: '2024-01-10',
      avatar: 'SJ'
    },
    {
      id: 2,
      name: 'Prof. Michael Chen',
      email: 'michael.chen@university.edu',
      role: 'Course Coordinator',
      status: 'active',
      department: 'Mathematics',
      phone: '+1 (555) 987-6543',
      joinDate: '2022-08-20',
      lastLogin: '2024-01-09',
      avatar: 'MC'
    },
    {
      id: 3,
      name: 'Alice Williams',
      email: 'alice.williams@university.edu',
      role: 'TA',
      status: 'active',
      department: 'Computer Science',
      phone: '+1 (555) 456-7890',
      joinDate: '2023-09-01',
      lastLogin: '2024-01-08',
      avatar: 'AW'
    },
    {
      id: 4,
      name: 'Bob Anderson',
      email: 'bob.anderson@student.edu',
      role: 'Student',
      status: 'inactive',
      department: 'Engineering',
      phone: '+1 (555) 321-0987',
      joinDate: '2023-09-01',
      lastLogin: '2023-12-15',
      avatar: 'BA'
    },
    {
      id: 5,
      name: 'Lisa Thompson',
      email: 'lisa.thompson@university.edu',
      role: 'Org Admin',
      status: 'active',
      department: 'Administration',
      phone: '+1 (555) 654-3210',
      joinDate: '2021-03-10',
      lastLogin: '2024-01-10',
      avatar: 'LT'
    },
    {
      id: 6,
      name: 'John Davis',
      email: 'john.davis@university.edu',
      role: 'Course Coordinator',
      status: 'pending',
      department: 'Physics',
      phone: '+1 (555) 789-0123',
      joinDate: '2024-01-01',
      lastLogin: 'Never',
      avatar: 'JD'
    }
  ]);

  const roles = ['Super Admin', 'Org Admin', 'Associate Dean', 'Course Coordinator', 'TA', 'Student'];
  const departments = ['Computer Science', 'Mathematics', 'Engineering', 'Administration', 'Physics', 'Chemistry'];
  const statuses = ['active', 'inactive', 'pending'];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === filteredUsers.length 
        ? [] 
        : filteredUsers.map(user => user.id)
    );
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    const user = {
      id: users.length + 1,
      ...newUser,
      joinDate: new Date().toISOString().split('T')[0],
      lastLogin: 'Never',
      avatar: newUser.name.split(' ').map(n => n[0]).join('').toUpperCase()
    };
    setUsers([...users, user]);
    setNewUser({ name: '', email: '', role: '', department: '', phone: '', status: 'active' });
    setShowAddUserModal(false);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = (e) => {
    e.preventDefault();
    setUsers(users.map(user => 
      user.id === editingUser.id 
        ? { ...user, ...editingUser }
        : user
    ));
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  const handleBulkAction = (action) => {
    if (action === 'activate') {
      setUsers(users.map(user => 
        selectedUsers.includes(user.id) 
          ? { ...user, status: 'active' }
          : user
      ));
    } else if (action === 'deactivate') {
      setUsers(users.map(user => 
        selectedUsers.includes(user.id) 
          ? { ...user, status: 'inactive' }
          : user
      ));
    } else if (action === 'delete') {
      if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) {
        setUsers(users.filter(user => !selectedUsers.includes(user.id)));
      }
    }
    setSelectedUsers([]);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return statusConfig[status] || statusConfig.inactive;
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      'Super Admin': 'bg-red-100 text-red-800',
      'Org Admin': 'bg-orange-100 text-orange-800',
      'Associate Dean': 'bg-yellow-100 text-yellow-800',
      'Course Coordinator': 'bg-green-100 text-green-800',
      'TA': 'bg-blue-100 text-blue-800',
      'Student': 'bg-purple-100 text-purple-800'
    };
    return roleConfig[role] || 'bg-gray-100 text-gray-800';
  };

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          
          <button
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : `${filteredUsers.length} users`}
              </span>
            </div>
            
            {selectedUsers.length > 0 && (
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleBulkAction('activate')}
                  className="px-3 py-1 text-sm text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
                >
                  Activate
                </button>
                <button 
                  onClick={() => handleBulkAction('deactivate')}
                  className="px-3 py-1 text-sm text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200"
                >
                  Deactivate
                </button>
                <button 
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1 text-sm text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200">
          {paginatedUsers.map((user) => (
            <div key={user.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">{user.avatar}</span>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{user.name}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="w-3 h-3 mr-1" />
                      {user.email}
                    </div>
                    {user.phone && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Phone className="w-3 h-3 mr-1" />
                        {user.phone}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 min-w-0">
                    {user.department}
                  </div>
                  
                  <div className="text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-500 min-w-0">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      Last: {user.lastLogin}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => {/* View user details */}}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEditUser(user)}
                      className="p-1 text-gray-400 hover:text-green-600"
                      title="Edit User"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-3 py-1 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    currentPage === page
                      ? 'text-white bg-blue-600'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-3 py-1 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a role</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select 
                  value={newUser.department}
                  onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select 
                  value={newUser.status}
                  onChange={(e) => setNewUser({...newUser, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select 
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select 
                  value={editingUser.department}
                  onChange={(e) => setEditingUser({...editingUser, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select 
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({...editingUser, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;