import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import StudentLogin from './components/StudentLogin';
import VerifyCertificate from './components/VerifyCertificate';
import StudentDiplomaDownload from './components/StudentDiplomaDownload';
import NotFound from './components/NotFound';

// Detect which subdomain we're on
const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const isStudentDomain = hostname === 'results.vminstitute.in' || hostname === 'localhost';
const isAdminDomain   = hostname === 'resultsadmin.vminstitute.in' || hostname === 'admin.vminstitute.in';
const isVerifyDomain  = hostname === 'verifyresults.vminstitute.in';

function App() {
  if (isAdminDomain) {
    return (
      <AuthProvider>
        <Toaster position="top-right" />
        <Router>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/teacher" 
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    );
  }

  if (isVerifyDomain) {
    return (
      <AuthProvider>
        <Toaster position="top-right" />
        <Router>
          <Routes>
            <Route path="/" element={<VerifyCertificate />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    );
  }

  // Default to Student Domain and Localhost Catch-all
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          {/* Student Routes */}
          <Route path="/" element={<StudentLogin />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/diploma" element={<StudentDiplomaDownload />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<LoginForm />} />
          
          {/* Teacher Routes */}
          <Route path="/teacher" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          } />

          {/* Verify Routes */}
          <Route path="/verify" element={<VerifyCertificate />} />

          {/* Catch All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;