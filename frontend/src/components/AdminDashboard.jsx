import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import toast from 'react-hot-toast';
import { 
  UsersIcon, 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  CheckBadgeIcon,
  ArrowLeftOnRectangleIcon,
  XMarkIcon,
  TrashIcon,
  EyeIcon,
  PhotoIcon,
  MagnifyingGlassIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const NavItem = ({ icon: Icon, label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
      active
        ? 'bg-blue-600 text-white'
        : 'text-gray-200 hover:bg-gray-700 hover:text-white'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
    {count > 0 && (
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}>
        {count}
      </span>
    )}
  </button>
);

const AdminDashboard = () => {
  const { adminUser: user, logoutAdmin: logout } = useAuth();
  const [activeTab, setActiveTab] = useState('upload');
  
  // Existing state
  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState('');
  const [draftBatches, setDraftBatches] = useState([]);
  const [pendingBatches, setPendingBatches] = useState([]);
  const [approvedBatches, setApprovedBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(true);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', password: '' });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhotoBatch, setSelectedPhotoBatch] = useState(null);
  const [publishedFilter, setPublishedFilter] = useState('all');

  useEffect(() => {
    fetchTeachers();
    fetchDraftBatches();
    fetchPendingBatches();
    fetchApprovedBatches();
    fetchStudents();
  }, []);

  useEffect(() => {
    import('socket.io-client').then(({ io }) => {
      const socket = io(API_URL);
      socket.on('data_updated', () => {
        fetchTeachers();
        fetchDraftBatches();
        fetchPendingBatches();
        fetchApprovedBatches();
        fetchStudents();
      });
      return () => socket.disconnect();
    });
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/all-students?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${user.token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      setStudents(data);
    } catch (err) { toast.error('Error fetching students'); }
  };

  const fetchApprovedBatches = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/approved-batches?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${user.token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      setApprovedBatches(data);
    } catch (err) { toast.error('Error fetching approved batches'); }
  };

  const handleManagePhotos = async (batch) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/batch-preview/${batch._id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      setSelectedPhotoBatch({ ...batch, results: data.results });
    } catch (err) { toast.error('Error loading batch photos'); }
  };

  const handlePhotoUpload = async (studentId, file) => {
    const MAX_SIZE_KB = 50;
    if (file.size > MAX_SIZE_KB * 1024) {
      toast.error(`Photo must be ${MAX_SIZE_KB}KB or smaller. Selected file is ${(file.size / 1024).toFixed(1)}KB.`, {
        duration: 6000,
        style: { borderRadius: 0, background: '#b91c1c', color: '#fff' }
      });
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);
    
    const loadingToast = toast.loading('Uploading photo...');
    
    try {
      const res = await fetch(`${API_URL}/api/admin/upload-photo/${studentId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData
      });
      const data = await res.json();
      
      toast.dismiss(loadingToast);
      
      if (res.ok) {
        toast.success(data.message);
        if (previewData) fetchPreview(previewData.batchId);
        if (selectedPhotoBatch) handleManagePhotos(selectedPhotoBatch);
        fetchStudents();
      } else {
        toast.error(`${data.message || 'Upload failed'}${data.error ? ': ' + data.error : ''}`, { duration: 8000 });
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Photo upload failed: ' + err.message, { duration: 8000 });
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/teachers`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      setTeachers(data);
    } catch (err) { toast.error('Error fetching teachers'); }
  };

  const fetchDraftBatches = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/draft-batches?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${user.token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      setDraftBatches(data);
    } catch (err) { toast.error('Error fetching drafts'); }
  };

  const fetchPendingBatches = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/pending-results?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${user.token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      setPendingBatches(data);
    } catch (err) { toast.error('Error fetching pending batches'); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !subject) return toast.error('Please select file and subject');
    if (!window.confirm(`Are you sure you want to submit this student record batch for "${subject}"? Please verify the file before proceeding.`)) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    try {
      const res = await fetch(`${API_URL}/api/admin/upload-students`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Students uploaded successfully');
        fetchDraftBatches();
        setFile(null);
        setSubject('');
      } else toast.error(data.message);
    } catch (err) { toast.error('Upload failed'); }
  };

  const handleAssign = async () => {
    if (!selectedTeacher || !currentBatch) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/assign-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ batchId: currentBatch, teacherId: selectedTeacher })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Batch assigned to teacher');
        setCurrentBatch(null);
        fetchDraftBatches();
      } else toast.error(data.message);
    } catch (err) { toast.error('Error assigning batch'); }
  };

  const handleDeleteDraft = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this draft batch? This will remove all student data associated with it.')) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/draft-batch/${batchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Draft batch deleted');
        fetchDraftBatches();
        fetchStudents();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Error deleting draft batch');
    }
  };

  const handleDeleteApproved = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this approved batch? This will permanently remove these student results and they will no longer be verifiable.')) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/approved-batch/${batchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Approved batch deleted');
        fetchApprovedBatches();
        fetchStudents();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Error deleting approved batch');
    }
  };

  const handleApproval = async (batchId, status) => {
    const endpoint = status === 'approve' ? 'approve-batch' : 'disapprove-batch';
    try {
      const res = await fetch(`${API_URL}/api/admin/${endpoint}/${batchId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Batch ${status}d successfully`);
        fetchPendingBatches();
        fetchApprovedBatches();
        fetchStudents();
        setPreviewData(null);
      } else toast.error(data.message);
    } catch (err) { toast.error('Action failed'); }
  };

  const fetchPreview = async (batchId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/batch-preview/${batchId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      setPreviewData({ batchId, results: data.results });
    } catch (err) { toast.error('Preview failed'); }
  };

  const handlePreviewMarkChange = (id, field, value) => {
    setPreviewData(prev => ({
      ...prev,
      results: prev.results.map(r => {
        if (r._id === id) {
          const markValue = value.toString().trim().toUpperCase() === 'AB' ? 'AB' : (parseFloat(value) || 0);
          const updated = { ...r, [field]: markValue };
          const ia = updated.iaMarks === 'AB' ? 0 : (parseFloat(updated.iaMarks) || 0);
          const me = updated.meMarks === 'AB' ? 0 : (parseFloat(updated.meMarks) || 0);
          updated.marksTotal = ia + me;
          
          // Auto-recalculate remarks
          const iaMax = parseFloat(updated.iaMaxMarks) || 0;
          const meMax = parseFloat(updated.meMaxMarks) || 0;
          const FAIL = { english: 'E.R.', hindi: 'अनुत्तीर्ण' };
          
          let newRemark = null;
          const isAB = (v) => v !== null && v !== undefined && v.toString().trim().toUpperCase() === 'AB';
          const iaIsAB = isAB(updated.iaMarks);
          const meIsAB = isAB(updated.meMarks);

          if (iaIsAB && meIsAB) newRemark = { english: 'AB', hindi: 'अनुत्तीर्ण' };
          else if (iaIsAB || meIsAB) newRemark = FAIL;
          else if (updated.iaMarks === null || updated.iaMarks === undefined || updated.iaMarks === '' ||
                   updated.meMarks === null || updated.meMarks === undefined || updated.meMarks === '') {
            newRemark = FAIL;
          } else {
            const iaPercent = iaMax > 0 ? (ia / iaMax) * 100 : 0;
            const mePercent = meMax > 0 ? (me / meMax) * 100 : 0;
            if (iaPercent < 40 || mePercent < 40) {
              newRemark = FAIL;
            } else {
              const totalMax = iaMax + meMax;
              const overallPercent = totalMax > 0 ? ((ia + me) / totalMax) * 100 : 0;
              if (overallPercent >= 75) newRemark = { english: 'Passed, Distinction', hindi: 'उत्तीर्ण, विशिष्टता' };
              else if (overallPercent >= 60) newRemark = { english: 'Passed, First Division', hindi: 'उत्तीर्ण, प्रथम श्रेणी' };
              else if (overallPercent >= 55) newRemark = { english: 'Passed, Second Division', hindi: 'उत्तीर्ण, द्वितीय श्रेणी' };
              else if (overallPercent >= 40) newRemark = { english: 'Passed', hindi: 'उत्तीर्ण' };
              else newRemark = FAIL;
            }
          }
          
          if (newRemark) {
            updated.resultRemarkEnglish = newRemark.english;
            updated.resultRemarkHindi = newRemark.hindi;
          }

          return updated;
        }
        return r;
      })
    }));
  };

  const handlePreviewRemarkChange = (id, field, value) => {
    setPreviewData(prev => ({
      ...prev,
      results: prev.results.map(r => r._id === id ? { ...r, [field]: value } : r)
    }));
  };

  const handleSavePreviewEdits = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/update-batch-results`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}` 
        },
        body: JSON.stringify({
          results: previewData.results.map(r => ({
            resultId: r._id,
            iaMarks: r.iaMarks,
            meMarks: r.meMarks,
            resultRemarkEnglish: r.resultRemarkEnglish,
            resultRemarkHindi: r.resultRemarkHindi
          }))
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Results updated successfully');
        fetchPendingBatches(); // Refresh counts if needed
      } else {
        toast.error(data.message);
      }
    } catch (err) { toast.error('Save failed'); }
  };

  const handleExportCSV = () => {
    if (!previewData || !previewData.results.length) return;
    
    const headers = [
      'S. No.', 'Date of Birth', 'Roll No.', 'Enrolment Number', 'Course Name (Hindi)', 
      'Course Name (English)', 'Course Year (Hindi)', 'Course Year (English)', 
      "Candidate's Name (Hindi)", "Father's Name (Hindi)", "Candidate's Name (English)", 
      "Father's Name (English)", 'Duration (Hindi)', 'Duration (English)', 'Mode (Hindi)', 
      'Mode (English)', 'IA Sub Code', 'ME Sub Code', 'IA Max Mark', 'ME Max Mark', 
      'Maximum Marks', 'Obtained IA Marks', 'Obtained ME Marks', 'Obtained Marks Total', 
      'Result Remark (Hindi)', 'Result Remark (English)', 'Date of Result (Hindi)', 
      'Date of Result (English)', 'Subject Code', 'Academic Year', 'Course Name', 
      'Exam Flag', 'Part', 'Semester'
    ];
    
    const rows = previewData.results.map(r => [
      r.sNo || '', r.dateOfBirth || '', r.rollNo || '', r.enrolmentNo || '', r.courseNameHindi || '',
      r.courseNameEnglish || '', r.courseYearHindi || '', r.courseYearEnglish || '',
      r.candidateNameHindi || '', r.fatherNameHindi || '', r.candidateNameEnglish || '',
      r.fatherNameEnglish || '', r.durationHindi || '', r.durationEnglish || '', r.modeHindi || '',
      r.modeEnglish || '', r.iaSubCode || '', r.meSubCode || '', r.iaMaxMarks || 0, r.meMaxMarks || 0,
      r.maxMarks || 0, r.iaMarks || 0, r.meMarks || 0, r.marksTotal || 0,
      r.resultRemarkHindi || '', r.resultRemarkEnglish || '', r.dateOfResultHindi || '',
      r.dateOfResultEnglish || '', r.subjectCode || '', r.academicYear || '', r.courseName || '',
      r.examFlag || '', r.part || '', r.semester || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${previewData.batchId}_full_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/add-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(newTeacher)
      });
      if (res.ok) {
        toast.success('Teacher added successfully');
        setNewTeacher({ name: '', email: '', password: '' });
        fetchTeachers();
      } else {
        const data = await res.json();
        toast.error(data.message);
      }
    } catch (err) { toast.error('Failed to add teacher'); }
  };

  const handleRemoveTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to remove this teacher?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/teacher/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        toast.success('Teacher removed');
        fetchTeachers();
      } else {
        const data = await res.json();
        toast.error(data.message);
      }
    } catch (err) { toast.error('Failed to remove teacher'); }
  };

  const handleChangePassword = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/teacher-password/${editingTeacher._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        toast.success('Password changed');
        setIsPasswordModalOpen(false);
        setNewPassword('');
      }
    } catch (err) { toast.error('Failed to change password'); }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top Navbar */}
      <nav className="bg-gray-900 text-white flex items-center justify-between px-6 py-3 z-40 shadow-md flex-wrap gap-2">
        <div className="flex items-center gap-6 flex-wrap">
          <h1 className="text-lg font-bold text-white whitespace-nowrap">Admin Panel</h1>
          <div className="flex items-center gap-1 flex-wrap">
            <NavItem
              icon={CloudArrowUpIcon}
              label="Upload Student Records"
              active={activeTab === 'upload'}
              onClick={() => setActiveTab('upload')}
            />
            <NavItem
              icon={DocumentTextIcon}
              label="Marks Submission"
              active={activeTab === 'drafts'}
              onClick={() => setActiveTab('drafts')}
              count={draftBatches.length}
            />
            <NavItem
              icon={PhotoIcon}
              label="Student Photos"
              active={activeTab === 'photos'}
              onClick={() => setActiveTab('photos')}
            />
            <NavItem
              icon={CheckBadgeIcon}
              label="Result Approval"
              active={activeTab === 'pending'}
              onClick={() => setActiveTab('pending')}
              count={pendingBatches.length}
            />
            <NavItem
              icon={UsersIcon}
              label="Manage Teachers"
              active={activeTab === 'teachers'}
              onClick={() => setActiveTab('teachers')}
            />
            <NavItem
              icon={CheckBadgeIcon}
              label="Published Results"
              active={activeTab === 'approved'}
              onClick={() => setActiveTab('approved')}
              count={approvedBatches.length}
            />
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 rounded-md transition-colors whitespace-nowrap"
        >
          <ArrowLeftOnRectangleIcon className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'upload' && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Upload Student Records</h2>
                    <p className="text-gray-500">Create a new student result batch by uploading a CSV or Excel file.</p>
                  </div>
                  <a 
                    href="/sample-result-template.xlsx" 
                    download 
                    className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all border border-blue-100"
                  >
                    <DocumentTextIcon className="w-5 h-5" />
                    Result Template
                  </a>
                </div>
                <form onSubmit={handleUpload} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Programme Name</label>
                    <input 
                      type="text" 
                      value={subject} 
                      onChange={(e) => setSubject(e.target.value)} 
                      className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      placeholder="e.g. Mathematics" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">CSV/Excel File</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 transition-all cursor-pointer relative">
                      <input 
                        type="file" 
                        onChange={(e) => setFile(e.target.files[0])} 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept=".csv,.xlsx,.xls" 
                      />
                      <CloudArrowUpIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-sm text-gray-600">
                        {file ? <span className="text-blue-600 font-bold">{file.name}</span> : "Click or drag to upload result sheet"}
                      </p>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transform active:scale-[0.98] transition-all shadow-lg shadow-blue-200">
                    Upload Student Records
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'drafts' && (
              <div className="space-y-4">
                {!selectedPhotoBatch ? (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">Marks Submission</h2>
                      <span className="bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-sm font-bold">
                        {draftBatches.length} Available
                      </span>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Batch Details</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Subject</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Students</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {draftBatches.map((batch, index) => (
                            <tr key={batch._id} className="hover:bg-gray-50 transition-colors">
                              <td className="p-4">
                                <p className="font-bold text-gray-800 font-mono text-sm">
                                  #{String(batch.batchSeq || (index + 1)).padStart(2, '0')}
                                </p>
                              </td>
                              <td className="p-4 text-gray-600">{batch.subject}</td>
                              <td className="p-4 text-gray-600">{batch.studentCount}</td>
                              <td className="p-4 text-gray-500">{new Date(batch.createdAt).toLocaleDateString()}</td>
                              <td className="p-4">
                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">DRAFT</span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-4">
                                  {batch.uploader?.role === 'teacher' ? (
                                    <button 
                                      onClick={() => setCurrentBatch(batch._id)} 
                                      className="text-green-600 font-bold hover:text-green-800 flex items-center gap-1 group"
                                      title="Reassign Teacher"
                                    >
                                      {batch.uploader.name}
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => setCurrentBatch(batch._id)} 
                                      className="text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1 group"
                                    >
                                      Assign Teacher
                                      <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleManagePhotos(batch)}
                                    className="text-orange-500 hover:text-orange-700 p-1.5 hover:bg-orange-50 rounded-lg transition-all"
                                    title="Manage Photographs"
                                  >
                                    <PhotoIcon className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => fetchPreview(batch._id)}
                                    className="text-gray-500 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Preview Draft"
                                  >
                                    <EyeIcon className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteDraft(batch._id)}
                                    className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete Draft"
                                  >
                                    <TrashIcon className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {draftBatches.length === 0 && (
                            <tr>
                              <td colSpan="5" className="p-12 text-center">
                                <DocumentTextIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-400">No Marks Submission to assign</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => setSelectedPhotoBatch(null)}
                        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors"
                      >
                        <ArrowLeftOnRectangleIcon className="w-5 h-5 rotate-180" />
                        Back to Drafts
                      </button>
                      <h2 className="text-2xl font-black text-gray-800 tracking-tight">{selectedPhotoBatch.subject}</h2>
                      <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-bold border border-blue-100">
                        {selectedPhotoBatch.results.length} Students
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-800 text-white">
                          <tr>
                            <th className="p-5 text-sm font-bold uppercase tracking-wider">Student Name</th>
                            <th className="p-5 text-sm font-bold uppercase tracking-wider text-center">Roll Number</th>
                            <th className="p-5 text-sm font-bold uppercase tracking-wider text-right">Upload Photograph</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedPhotoBatch.results.map(r => (
                            <tr key={r._id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="p-5">
                                <div className="flex items-center gap-4">
                                  {r.student?.profileImageId ? (
                                    <img 
                                      src={r.student.profileImageId} 
                                      className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100 shadow-sm" 
                                      alt="" 
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200">
                                      <PhotoIcon className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-gray-800">{r.candidateNameEnglish}</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-black">{r.enrolmentNo}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-5 text-center font-mono font-bold text-blue-600 bg-blue-50/30">
                                {r.rollNo}
                              </td>
                              <td className="p-5 text-right">
                                <label className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all shadow-md ${r.student?.profileImageId ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}>
                                  <CloudArrowUpIcon className="w-4 h-4" />
                                  {r.student?.profileImageId ? 'Change Photo' : 'Upload Photo'}
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handlePhotoUpload(r.student?._id || r.student, e.target.files[0]);
                                      }
                                    }}
                                  />
                                </label>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pending' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Result Approval</h2>
                  <span className="bg-yellow-100 text-yellow-700 px-4 py-1.5 rounded-full text-sm font-bold">
                    {pendingBatches.length} Awaiting Review
                  </span>
                </div>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
                   <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Batch Info</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Assigned Teacher</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Students</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pendingBatches.map(batch => (
                        <tr key={batch._id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-gray-800">{batch.batchName}</p>
                            <p className="text-xs text-gray-400">{batch.subject}</p>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                {batch.teacher.name[0]}
                              </div>
                              <span className="text-gray-700">{batch.teacher.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center text-gray-600">{batch.studentCount}</td>
                          <td className="p-4 text-gray-500">
                            {batch.submittedAt ? new Date(batch.submittedAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => fetchPreview(batch._id)} className="px-4 py-2 text-sm font-bold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Preview</button>
                              <button onClick={() => handleApproval(batch._id, 'approve')} className="px-4 py-2 text-sm font-bold bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors">Approve</button>
                              <button onClick={() => handleApproval(batch._id, 'disapprove')} className="px-4 py-2 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors">Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pendingBatches.length === 0 && (
                        <tr>
                          <td colSpan="5" className="p-12 text-center text-gray-400">No batches Result Approval</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'approved' && (
              <div className="space-y-4">
                {!selectedPhotoBatch ? (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">Published Results</h2>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPublishedFilter(publishedFilter === 'approved' ? 'all' : 'approved')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${publishedFilter === 'approved' ? 'bg-green-600 text-white ring-2 ring-green-400' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        >
                          {approvedBatches.filter(b => b.status === 'approved').length} Approved
                        </button>
                        <button
                          onClick={() => setPublishedFilter(publishedFilter === 'disapproved' ? 'all' : 'disapproved')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${publishedFilter === 'disapproved' ? 'bg-red-600 text-white ring-2 ring-red-400' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                        >
                          {approvedBatches.filter(b => b.status === 'disapproved').length} Disapproved
                        </button>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
                       <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Batch Info</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Assigned Teacher</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Students</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {approvedBatches
                            .filter(b => publishedFilter === 'all' || b.status === publishedFilter)
                            .map(batch => (
                            <tr
                              key={batch._id}
                              className={`transition-colors ${
                                batch.status === 'disapproved'
                                  ? 'bg-red-50/60 hover:bg-red-50'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <td className="p-4">
                                <p className="font-bold text-gray-800">{batch.batchName?.split(' - ')[0] ?? batch.batchName}</p>
                                <p className="text-xs text-gray-400">{batch.subject}</p>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${batch.status === 'disapproved' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {batch.teacher.name[0]}
                                  </div>
                                  <span className="text-gray-700">{batch.teacher.name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center text-gray-600">{batch.studentCount}</td>
                              <td className="p-4 text-gray-500">
                                {(() => {
                                  const d = batch.status === 'disapproved'
                                    ? batch.disapprovedAt || batch.approvedAt || batch.submittedAt || batch.createdAt
                                    : batch.approvedAt || batch.submittedAt || batch.createdAt;
                                  return d ? new Date(d).toLocaleDateString() : '—';
                                })()}
                              </td>
                              <td className="p-4 text-center">
                                {batch.status === 'disapproved' ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest border bg-red-50 text-red-700 border-red-200 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                                    Disapproved
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                    Approved
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex justify-end gap-2 items-center">
                                  <button
                                    onClick={() => fetchPreview(batch._id)}
                                    className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Preview Results"
                                  >
                                    <EyeIcon className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleManagePhotos(batch)}
                                    className="text-orange-500 hover:text-orange-700 p-1.5 hover:bg-orange-50 rounded-lg transition-all"
                                    title="Manage Photographs"
                                  >
                                    <PhotoIcon className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteApproved(batch._id)}
                                    className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete Batch"
                                  >
                                    <TrashIcon className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {approvedBatches.filter(b => publishedFilter === 'all' || b.status === publishedFilter).length === 0 && (
                            <tr>
                              <td colSpan="6" className="p-12 text-center text-gray-400">No Published Results found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => setSelectedPhotoBatch(null)}
                        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors"
                      >
                        <ArrowLeftOnRectangleIcon className="w-5 h-5 rotate-180" />
                        Back to Approved
                      </button>
                      <h2 className="text-2xl font-black text-gray-800 tracking-tight">{selectedPhotoBatch.subject}</h2>
                      <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-bold border border-blue-100">
                        {selectedPhotoBatch.results.length} Students
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-800 text-white">
                          <tr>
                            <th className="p-5 text-sm font-bold uppercase tracking-wider">Student Name</th>
                            <th className="p-5 text-sm font-bold uppercase tracking-wider text-center">Roll Number</th>
                            <th className="p-5 text-sm font-bold uppercase tracking-wider text-right">Upload Photograph</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedPhotoBatch.results.map(r => (
                            <tr key={r._id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="p-5">
                                <div className="flex items-center gap-4">
                                  {r.student?.profileImageId ? (
                                    <img 
                                      src={r.student.profileImageId} 
                                      className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100 shadow-sm" 
                                      alt="" 
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200">
                                      <PhotoIcon className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-gray-800">{r.candidateNameEnglish}</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-black">{r.enrolmentNo}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-5 text-center font-mono font-bold text-blue-600 bg-blue-50/30">
                                {r.rollNo}
                              </td>
                              <td className="p-5 text-right">
                                <span className="inline-flex items-center gap-1 text-gray-500 font-bold text-sm bg-gray-100 px-4 py-2 rounded-lg cursor-not-allowed">
                                  <LockClosedIcon className="w-4 h-4" />
                                  Locked (Published)
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Student Photographs</h2>
                    <p className="text-gray-500">Manage profile pictures for all registered students.</p>
                  </div>
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search name or email..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Student</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Roll No</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {students
                        .filter(s => 
                          s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.email.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map(student => (
                        <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-4">
                              {student.profileImageId ? (
                                <img 
                                  src={student.profileImageId} 
                                  alt="" 
                                  className="w-12 h-12 rounded-lg object-cover border"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                  <PhotoIcon className="w-6 h-6" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-800">{student.name}</p>
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Student ID: {student._id.slice(-6)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm font-medium text-gray-700">{student.rollNo || 'Not Assigned'}</p>
                          </td>
                          <td className="p-4 text-center">
                            {student.profileImageId ? (
                              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold">HAS PHOTO</span>
                            ) : (
                              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold">MISSING</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {student.hasApprovedResult && student.profileImageId ? (
                               <span className="inline-flex items-center gap-1 text-gray-500 font-bold text-sm bg-gray-100 px-4 py-2 rounded-lg cursor-not-allowed">
                                 <LockClosedIcon className="w-4 h-4" />
                                 Locked (Published)
                               </span>
                            ) : (
                              <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold transition-all inline-block shadow-sm ${student.profileImageId ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}>
                                {student.profileImageId ? 'Change Photo' : 'Upload Photo'}
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handlePhotoUpload(student._id, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </td>
                        </tr>
                      ))}
                      {students.length === 0 && (
                        <tr>
                          <td colSpan="4" className="p-12 text-center text-gray-400">No students found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'teachers' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 lg:order-1">
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Teacher</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Contact</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {teachers.map(teacher => (
                          <tr key={teacher._id} className="hover:bg-gray-50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                  {teacher.name[0]}
                                </div>
                                <span className="font-bold text-gray-800">{teacher.name}</span>
                              </div>
                            </td>
                            <td className="p-4 text-gray-500 text-sm">{teacher.email}</td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-3">
                                <button onClick={() => { setEditingTeacher(teacher); setIsPasswordModalOpen(true); }} className="text-blue-600 font-bold text-sm hover:underline">Reset</button>
                                <button onClick={() => handleRemoveTeacher(teacher._id)} className="text-red-600 font-bold text-sm hover:underline">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="lg:col-span-1 lg:order-2">
                  <div className="bg-white rounded-2xl shadow-sm border sticky top-8 overflow-hidden">
                    <button
                      onClick={() => setIsRegisterOpen(!isRegisterOpen)}
                      className="w-full flex items-center justify-between p-6 text-left"
                    >
                      <h2 className="text-xl font-bold text-gray-800">Register Teacher</h2>
                      <span className={`transform transition-transform duration-200 text-gray-400 ${isRegisterOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {isRegisterOpen && (
                      <form onSubmit={handleAddTeacher} className="space-y-4 px-6 pb-6">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Full Name</label>
                          <input type="text" placeholder="John Doe" value={newTeacher.name} onChange={(e) => setNewTeacher({...newTeacher, name: e.target.value})} className="w-full border-gray-100 bg-gray-50 border p-3 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" required />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Email Address</label>
                          <input type="email" placeholder="john@example.com" value={newTeacher.email} onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})} className="w-full border-gray-100 bg-gray-50 border p-3 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" required />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Password</label>
                          <input type="password" placeholder="••••••••" value={newTeacher.password} onChange={(e) => setNewTeacher({...newTeacher, password: e.target.value})} className="w-full border-gray-100 bg-gray-50 border p-3 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" required />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md">Create Account</button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {currentBatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-bold mb-2 text-gray-800">Assign Teacher</h3>
            <p className="text-gray-500 mb-6">Select a teacher to process this batch of results.</p>
            <select 
              value={selectedTeacher} 
              onChange={(e) => setSelectedTeacher(e.target.value)} 
              className="w-full border p-4 rounded-xl mb-6 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500 bg-gray-50"
            >
              <option value="">Choose a teacher...</option>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.name} ({t.email})</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={handleAssign} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100">Confirm Assignment</button>
              <button onClick={() => setCurrentBatch(null)} className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {previewData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white p-8 rounded-3xl w-full max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Batch Preview & Edit</h3>
                <p className="text-gray-500 text-sm">{previewData.batchId}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleExportCSV} 
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <CloudArrowUpIcon className="w-5 h-5" />
                  Export CSV
                </button>
                {activeTab !== 'approved' && activeTab !== 'pending' && (
                  <button 
                    onClick={handleSavePreviewEdits} 
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                  >
                    Save Changes
                  </button>
                )}
                <button 
                  onClick={() => setPreviewData(null)} 
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="inline-block min-w-full align-middle border rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full text-[10px] border-separate border-spacing-0">
                  <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                    <tr>
                      <th className="p-2 border-b border-r bg-gray-50 sticky left-0 z-30 font-bold text-gray-500 uppercase whitespace-nowrap">Roll No</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Photo</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">S.No</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Enrolment</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">DOB</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Student (Eng)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Student (Hin)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Father (Eng)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Father (Hin)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Course (Eng)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Course (Hin)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Year (Eng)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Year (Hin)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Duration (Eng)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Duration (Hin)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Mode (Eng)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Mode (Hin)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">IA Sub Code</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">ME Sub Code</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase text-center whitespace-nowrap">IA Max</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase text-center whitespace-nowrap">ME Max</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase text-center whitespace-nowrap">Max Marks</th>
                      <th className="p-2 border-b border-r font-bold text-blue-600 uppercase text-center whitespace-nowrap w-16">IA Marks</th>
                      <th className="p-2 border-b border-r font-bold text-blue-600 uppercase text-center whitespace-nowrap w-16">ME Marks</th>
                      <th className="p-2 border-b border-r font-bold text-blue-600 uppercase text-center whitespace-nowrap">Total</th>
                      <th className="p-2 border-b border-r font-bold text-blue-600 uppercase text-left whitespace-nowrap min-w-[120px]">Remark (Eng)</th>
                      <th className="p-2 border-b border-r font-bold text-blue-600 uppercase text-left whitespace-nowrap min-w-[120px]">Remark (Hin)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Res Date (Eng)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Res Date (Hin)</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Sub Code</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Academic Yr</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Part</th>
                      <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Semester</th>
                      <th className="p-2 border-b font-bold text-gray-500 uppercase whitespace-nowrap">Exam Flag</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.results.map(r => (
                      <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-2 border-r bg-white sticky left-0 z-10 font-mono font-bold text-blue-600 whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{r.rollNo}</td>
                        <td className="p-2 border-r text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            {r.student?.profileImageId ? (
                              <img 
                                src={r.student.profileImageId} 
                                alt="Student" 
                                className="w-8 h-8 rounded-full object-cover border"
                              />
                            ) : (
                              <span className="text-[8px] text-gray-400">No Photo</span>
                            )}
                            {r.status !== 'approved' && (
                              <label className={`cursor-pointer px-2 py-0.5 rounded text-[8px] transition-colors border ${r.student?.profileImageId ? 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}>
                                {r.student?.profileImageId ? 'Change' : 'Upload'}
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handlePhotoUpload(r.student._id, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </td>
                        <td className="p-2 border-r text-gray-400 text-center">{r.sNo}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.enrolmentNo}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.dateOfBirth}</td>
                        <td className="p-2 border-r font-medium text-gray-800 whitespace-nowrap">{r.candidateNameEnglish}</td>
                        <td className="p-2 border-r text-gray-600 whitespace-nowrap">{r.candidateNameHindi}</td>
                        <td className="p-2 border-r text-gray-600 whitespace-nowrap">{r.fatherNameEnglish}</td>
                        <td className="p-2 border-r text-gray-600 whitespace-nowrap">{r.fatherNameHindi}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.courseNameEnglish}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.courseNameHindi}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.courseYearEnglish}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.courseYearHindi}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.durationEnglish}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.durationHindi}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.modeEnglish}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.modeHindi}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.iaSubCode}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.meSubCode}</td>
                        <td className="p-2 border-r text-center text-gray-500">{r.iaMaxMarks}</td>
                        <td className="p-2 border-r text-center text-gray-500">{r.meMaxMarks}</td>
                        <td className="p-2 border-r text-center text-gray-500 font-bold">{r.maxMarks}</td>
                        <td className="p-1 border-r bg-blue-50/20">
                          <input 
                            type="text" 
                            value={r.iaMarks ?? ''} 
                            onChange={(e) => handlePreviewMarkChange(r._id, 'iaMarks', e.target.value)}
                            disabled={r.iaMarks !== null && r.iaMarks !== undefined && r.iaMarks !== ''}
                            className={`w-full text-center border-gray-200 border rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono ${r.iaMarks !== null && r.iaMarks !== undefined && r.iaMarks !== '' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                          />
                        </td>
                        <td className="p-1 border-r bg-blue-50/20">
                          <input 
                            type="text" 
                            value={r.meMarks ?? ''} 
                            onChange={(e) => handlePreviewMarkChange(r._id, 'meMarks', e.target.value)}
                            disabled={r.meMarks !== null && r.meMarks !== undefined && r.meMarks !== ''}
                            className={`w-full text-center border-gray-200 border rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono ${r.meMarks !== null && r.meMarks !== undefined && r.meMarks !== '' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                          />
                        </td>
                        <td className="p-2 border-r text-center font-bold text-blue-600 bg-blue-50/50">{r.marksTotal}</td>
                        <td className="p-1 border-r bg-blue-50/20">
                          <input 
                            type="text" 
                            value={r.resultRemarkEnglish || ''} 
                            onChange={(e) => handlePreviewRemarkChange(r._id, 'resultRemarkEnglish', e.target.value)}
                            disabled={true}
                            className={`w-full border-gray-200 border rounded-lg p-1.5 outline-none transition-all bg-gray-100 text-gray-500 cursor-not-allowed`}
                          />
                        </td>
                        <td className="p-1 border-r bg-blue-50/20">
                          <input 
                            type="text" 
                            value={r.resultRemarkHindi || ''} 
                            onChange={(e) => handlePreviewRemarkChange(r._id, 'resultRemarkHindi', e.target.value)}
                            disabled={true}
                            className={`w-full border-gray-200 border rounded-lg p-1.5 outline-none transition-all bg-gray-100 text-gray-500 cursor-not-allowed`}
                          />
                        </td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.dateOfResultEnglish}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.dateOfResultHindi}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.subjectCode}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.academicYear}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.part}</td>
                        <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.semester}</td>
                        <td className="p-2 text-gray-500 whitespace-nowrap">{r.examFlag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold mb-2 text-gray-800">Reset Password</h3>
            <p className="text-gray-500 mb-6">Enter a new password for <b>{editingTeacher?.name}</b></p>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              className="w-full border-gray-100 bg-gray-50 border p-4 rounded-xl mb-6 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" 
            />
            <div className="flex gap-3">
              <button onClick={handleChangePassword} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700">Update Password</button>
              <button onClick={() => setIsPasswordModalOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
