import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPasswordOtp from './components/auth/ResetPasswordOtp';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import ComingSoon from './components/common/ComingSoon';
import { CourseManagement } from './pages/CourseManagement';
import ProgramManagement from './pages/ProgramManagement';
import ProgramReview from './pages/ProgramReview';
import BatchManagement from './pages/BatchManagement';
import { CourseProvider } from './contexts/CourseContext';
import AcademicPlan from './pages/AcademicPlan';
import BatchDetail from './pages/BatchDetail';
import ProgramOnboarding from './pages/ProgramOnboarding';
import BatchOnboarding from './pages/BatchOnboarding';
import CourseManagementDetails from './pages/CourseManagementDetails';
import CourseManagementEntry from './pages/CourseManagementEntry';
import UserProfile from './pages/UserProfile';
import RBACManager from './pages/RBACManager';
import { Analytics, Forums, Settings } from './pages/PlaceholderComponents';
import ExamManagement from './pages/ExamManagement';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
   const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#F97316] animate-spin" />
            <div className="absolute inset-1.5 rounded-full border-2 border-transparent border-t-[#EA580C] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
          </div>
          <p className="text-[#94A3B8] text-xs">Loading...</p>
        </div>
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

const LegacyUserProfileRedirect = ({ paramName = 'userId' }) => {
  const params = useParams();
  const targetUserId = params?.[paramName];
  if (!targetUserId) {
    return <Navigate to="/users" replace />;
  }
  return <Navigate to={`/users/${targetUserId}/profile`} replace />;
};

const MyProfileRedirect = () => {
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id || '';
  if (!currentUserId) {
    return <Navigate to="/users" replace />;
  }
  return <Navigate to={`/users/${currentUserId}/profile`} replace />;
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
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPasswordOtp />
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
              <Route path="users/:userId" element={<LegacyUserProfileRedirect paramName="userId" />} />
              <Route path="teachers/:id/profile" element={<LegacyUserProfileRedirect paramName="id" />} />
              <Route path="students/:id/profile" element={<LegacyUserProfileRedirect paramName="id" />} />
              <Route path="profile" element={<MyProfileRedirect />} />
              <Route path="my-profile" element={<MyProfileRedirect />} />
              <Route path="user-profile" element={<MyProfileRedirect />} />
              <Route path="account/profile" element={<MyProfileRedirect />} />
              <Route path="courses" element={<CourseManagementEntry />} />
              <Route path="courses/list" element={<CourseManagement />} />
              <Route path="courses/:courseId" element={<CourseManagementDetails />} />
              {/* Backward-compatible aliases */}
              <Route path="course-management" element={<Navigate to="/courses" replace />} />
              <Route path="course-management/:courseId" element={<CourseManagementDetails />} />
              <Route path="programs" element={<ProgramManagement />} />
              <Route path="programs/new" element={<ProgramOnboarding />} />
              <Route path="programs/:programId" element={<ProgramOnboarding />} />
              <Route path="programs/:programId/review" element={<ProgramReview />} />
              <Route path="batches" element={<BatchManagement />} />
              <Route path="batches/new" element={<BatchOnboarding />} />
              <Route path="batches/:batchId/edit" element={<BatchOnboarding />} />
              <Route path="schedule" element={<Navigate to="/batches" replace />} />
              <Route path="onboarding" element={<Navigate to="/programs/new" replace />} />
              <Route path="academic-plan" element={<AcademicPlan />} />
              <Route path="batch-detail/:batchId" element={<BatchDetail />} />
              <Route path="exams" element={<ExamManagement />} />
              <Route path="analytics" element={<Analytics />} />
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
