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
import MigrationDashboard from './pages/MigrationDashboard';
import { CourseProvider } from './contexts/CourseContext';
import AcademicPlan from './pages/AcademicPlan';
import GanttChart from './pages/GanttChart';
import BatchDetail from './pages/BatchDetail';
import ProgramOnboarding from './pages/ProgramOnboarding';
import BatchOnboarding from './pages/BatchOnboarding';
import CohortList from './pages/CohortList';
import EnrollmentStudentDetail from './pages/EnrollmentStudentDetail';
import CourseManagementDetails from './pages/CourseManagementDetails';
import CourseManagementEntry from './pages/CourseManagementEntry';
import UserProfile from './pages/UserProfile';
import RBACManager from './pages/RBACManager';
import Helpdesk from './pages/Helpdesk';
import HelpdeskErrorBoundary from './components/common/HelpdeskErrorBoundary';
import CourseAmendments from './pages/CourseAmendments';
import CourseAmendmentForm from './pages/CourseAmendmentForm';
import CourseAmendmentDetail from './pages/CourseAmendmentDetail';
import { Analytics, Certificates, Forums, Settings } from './pages/PlaceholderComponents';
import FeeStructureManagement from './pages/FeeStructureManagement';
import FeeStructureForm from './pages/FeeStructureForm';
import FeeRecords from './pages/FeeRecords';
import FeeRecordDetail from './pages/FeeRecordDetail';
import ExamManagement from './pages/ExamManagement';
import ExamPaperFormats from './pages/ExamPaperFormats';
import QuestionPaperAssignments from './pages/QuestionPaperAssignments';
import ExamRegistrationManagement from './pages/ExamRegistrationManagement';
import ResultManagement from './pages/ResultManagement';
import ResultCommitteeManagement from './pages/ResultCommitteeManagement';
import CertificateManagement from './pages/CertificateManagement';
import ExamSettingsPage from './pages/ExamSettings';
import CertificateApplications from './pages/CertificateApplications';
import HelpdeskConfig from './pages/HelpdeskConfig';

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
              <Route
                path="helpdesk"
                element={
                  <HelpdeskErrorBoundary>
                    <Helpdesk />
                  </HelpdeskErrorBoundary>
                }
              />
              <Route path="helpdesk/config" element={<HelpdeskConfig />} />
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
              <Route path="gantt" element={<GanttChart />} />
              <Route path="batch-detail/:batchId" element={<BatchDetail />} />
              <Route path="course-amendments" element={<CourseAmendments />} />
              <Route path="course-amendments/new" element={<CourseAmendmentForm />} />
              <Route path="course-amendments/:id/edit" element={<CourseAmendmentForm />} />
              <Route path="course-amendments/:id" element={<CourseAmendmentDetail />} />
              <Route path="migration" element={<MigrationDashboard />} />
              <Route path="enrollment" element={<Navigate to="/cohorts" replace />} />
              <Route path="cohorts" element={<CohortList />} />
              <Route path="cohorts/students/:studentId" element={<EnrollmentStudentDetail />} />
              <Route path="fees" element={<FeeStructureManagement />} />
              <Route path="fees/new" element={<FeeStructureForm />} />
              <Route path="fees/:id/edit" element={<FeeStructureForm />} />
              <Route path="fees/records" element={<FeeRecords />} />
              <Route path="fees/records/:id" element={<FeeRecordDetail />} />
              <Route path="exams" element={<ExamManagement />} />
              <Route path="exams/paper-formats" element={<ExamPaperFormats />} />
              <Route path="exams/qp-assignments" element={<QuestionPaperAssignments />} />
              <Route path="exams/registration" element={<ExamRegistrationManagement />} />
              <Route path="exams/results" element={<ResultManagement />} />
              <Route path="exams/result-committee" element={<ResultCommitteeManagement />} />
              <Route path="exams/certificates" element={<CertificateManagement />} />
              <Route path="exams/settings" element={<ExamSettingsPage />} />
              <Route path="exams/cert-applications" element={<CertificateApplications />} />
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
