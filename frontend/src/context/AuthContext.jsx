import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(() => {
    const storedUser = localStorage.getItem('adminUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [teacherUser, setTeacherUser] = useState(() => {
    const storedUser = localStorage.getItem('teacherUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(() => {
    const token = localStorage.getItem('studentToken');
    const storedStudentInfo = localStorage.getItem('studentInfo');
    return token && storedStudentInfo ? JSON.parse(storedStudentInfo) : null;
  });

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', email, password); // Debug log
      
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('Login response:', data); // Debug log

      if (response.ok) {
        if (data.role === 'admin') {
          localStorage.setItem('adminUser', JSON.stringify(data));
          localStorage.setItem('adminToken', data.token);
          setAdminUser(data);
        } else if (data.role === 'teacher') {
          localStorage.setItem('teacherUser', JSON.stringify(data));
          localStorage.setItem('teacherToken', data.token);
          setTeacherUser(data);
        }
        return { success: true, user: data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Login error:', error); // Debug log
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
    setAdminUser(null);
  };

  const logoutTeacher = () => {
    localStorage.removeItem('teacherUser');
    localStorage.removeItem('teacherToken');
    setTeacherUser(null);
  };

  const loginStudent = (data) => {
    localStorage.setItem('studentToken', data.token);
    localStorage.setItem('studentInfo', JSON.stringify(data.student));
    setStudent(data.student);
  };

  const logoutStudent = () => {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentInfo');
    setStudent(null);
  };

  const updateStudent = (studentData) => {
    setStudent(studentData);
    localStorage.setItem('studentInfo', JSON.stringify(studentData));
  };

  return (
    <AuthContext.Provider value={{ adminUser, teacherUser, login, logoutAdmin, logoutTeacher, loading, student, loginStudent, logoutStudent, updateStudent }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 