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

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/verify" element={<VerifyCertificate />} />
          <Route
            path="/admin"
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
          <Route
            path="/student"
            element={<StudentDashboard />}
          />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/diploma" element={<StudentDiplomaDownload />} />
          <Route path="/student/results" element={<Navigate to="/student" replace />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App; 