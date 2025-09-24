import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import RBACManager from './pages/RBACManager';
import UserManagement from './pages/UserManagement';
import { 
 
  Analytics, 
  Settings, 
  Certificates, 
  Forums 
} from './pages/PlaceholderComponents';
import { CourseManagement } from './pages/CourseManagement';
import CreateCourse from './pages/CreateCourse';
import { Scheduling } from './pages/Scheduling';
import EditCourse from './pages/EditCourse';
import UploadedFile from './pages/UploadedFile';
import CourseContext, { CourseProvider } from './contexts/CourseContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
   const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <CourseProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="rbac" element={<RBACManager />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="courses" element={<CourseManagement />} />
              <Route path="schedule" element={<Scheduling />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="certificates" element={<Certificates />} />
              <Route path="forums" element={<Forums />} />
              <Route path="settings" element={<Settings />} />
               <Route path="create-course/:codeid" element={<CreateCourse />} />
               <Route path="edit-course/:codeid" element={<EditCourse />} />
                <Route path="upload-files/:courseid" element={<UploadedFile />} />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
      </CourseProvider>
    </AuthProvider>
  );
}

export default App;