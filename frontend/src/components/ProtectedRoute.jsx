import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { adminUser, teacherUser, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  const role = allowedRoles[0]; // either 'admin' or 'teacher'
  const user = role === 'admin' ? adminUser : teacherUser;

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute; 