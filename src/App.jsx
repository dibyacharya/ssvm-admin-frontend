import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import ComingSoon from './components/common/ComingSoon';
import { CourseManagement } from './pages/CourseManagement';
import ProgramManagement from './pages/ProgramManagement';
import ProgramReview from './pages/ProgramReview';
import BatchManagement from './pages/BatchManagement';
import MigrationDashboard from './pages/MigrationDashboard';
import { CourseProvider } from './contexts/CourseContext';
import AcademicPlan from './pages/AcademicPlan';
import GanttChart from './pages/GanttChart';
import BatchDetail from './pages/BatchDetail';
import ProgramOnboarding from './pages/ProgramOnboarding';
import CohortList from './pages/CohortList';
import CourseManagementDetails from './pages/CourseManagementDetails';
import CourseManagementEntry from './pages/CourseManagementEntry';
import UserProfile from './pages/UserProfile';
import TeacherProfile from './pages/TeacherProfile';
import RBACManager from './pages/RBACManager';
import { Analytics, Certificates, Forums, Settings } from './pages/PlaceholderComponents';

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
              <Route path="users/:userId/profile" element={<UserProfile />} />
              <Route path="teachers/:id/profile" element={<TeacherProfile />} />
              <Route path="users/:userId" element={<UserManagement />} />
              <Route path="courses" element={<CourseManagementEntry />} />
              <Route path="courses/list" element={<CourseManagement />} />
              <Route path="courses/:courseId" element={<CourseManagementDetails />} />
              {/* Backward-compatible aliases */}
              <Route path="course-management" element={<Navigate to="/courses" replace />} />
              <Route path="course-management/:courseId" element={<CourseManagementDetails />} />
              <Route path="programs" element={<ProgramManagement />} />
              <Route path="programs/:programId/review" element={<ProgramReview />} />
              <Route path="batches" element={<BatchManagement />} />
              <Route path="schedule" element={<Navigate to="/batches" replace />} />
              <Route path="onboarding" element={<ProgramOnboarding />} />
              <Route path="academic-plan" element={<AcademicPlan />} />
              <Route path="gantt" element={<GanttChart />} />
              <Route path="batch-detail/:batchId" element={<BatchDetail />} />
              <Route path="migration" element={<MigrationDashboard />} />
              <Route path="enrollment" element={<Navigate to="/cohorts" replace />} />
              <Route path="cohorts" element={<CohortList />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="certificates" element={<Certificates />} />
              <Route path="forums" element={<Forums />} />
              <Route path="settings" element={<Settings />} />
               <Route path="create-course/:codeid" element={<Navigate to="/courses" replace />} />
               <Route path="edit-course/:codeid" element={<Navigate to="/courses" replace />} />
                <Route path="upload-files/:courseid" element={<Navigate to="/courses" replace />} />
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
