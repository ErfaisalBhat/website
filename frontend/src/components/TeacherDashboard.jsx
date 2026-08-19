import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import toast from 'react-hot-toast';
import { 
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const SidebarItem = ({ icon: Icon, label, active, onClick, count, collapsed }) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-lg mx-2 transition-all duration-200 group ${
      collapsed ? 'justify-center mx-2 w-[calc(100%-16px)]' : 'w-[calc(100%-16px)]'
    } ${
      active
        ? 'bg-gradient-to-r from-red-700/90 to-red-800/80 text-white shadow-lg shadow-red-900/30'
        : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-100'
    }`}
  >
    {active && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-red-400 rounded-r-full" />
    )}
    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`} />
    {!collapsed && (
      <span className="font-medium text-[13px] flex-1 text-left tracking-wide">{label}</span>
    )}
    {!collapsed && count > 0 && (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-neutral-700 text-neutral-300'}`}>
        {count}
      </span>
    )}
    {collapsed && count > 0 && (
      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
    )}
  </button>
);

const TeacherDashboard = () => {
  const { teacherUser: user, logoutTeacher: logout } = useAuth();
  const [activeTab, setActiveTab] = useState('batches');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAssignedBatches();
  }, []);

  useEffect(() => {
    import('socket.io-client').then(({ io }) => {
      const socket = io(API_URL);
      socket.on('data_updated', () => {
        fetchAssignedBatches();
      });
      return () => socket.disconnect();
    });
  }, []);

  const fetchAssignedBatches = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teacher/assigned-batches`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      setBatches(data);
    } catch (err) { toast.error('Error fetching batches'); }
  };

  const fetchBatchResults = async (batchId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/teacher/batch-results/${batchId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      setResults(data.results);
      setSelectedBatch(batchId);
    } catch (err) { toast.error('Error fetching student results'); }
    finally { setLoading(false); }
  };

  // Compute remark from marks — handles numeric values and 'AB' (absent)
  const computeRemarkPreview = (iaMarks, iaMaxMarks, meMarks, meMaxMarks) => {
    const FAIL = { resultRemarkEnglish: 'E.R.', resultRemarkHindi: 'अनुत्तीर्ण' };

    const isAB = (v) => v !== null && v !== undefined && v.toString().trim().toUpperCase() === 'AB';
    const iaIsAB = isAB(iaMarks);
    const meIsAB = isAB(meMarks);

    if (iaIsAB && meIsAB) return { resultRemarkEnglish: 'AB', resultRemarkHindi: 'अनुत्तीर्ण' };
    if (iaIsAB || meIsAB) return FAIL;
    
    if (iaMarks === null || iaMarks === undefined || iaMarks === '') return FAIL;
    if (meMarks === null || meMarks === undefined || meMarks === '') return FAIL;

    const ia = parseFloat(iaMarks);
    const me = parseFloat(meMarks);
    const iaMax = parseFloat(iaMaxMarks) || 0;
    const meMax = parseFloat(meMaxMarks) || 0;

    if (isNaN(ia) || isNaN(me)) return FAIL;

    const iaPercent = iaMax > 0 ? (ia / iaMax) * 100 : 0;
    const mePercent = meMax > 0 ? (me / meMax) * 100 : 0;

    // Below 40% in any component = fail
    if (iaPercent < 40 || mePercent < 40) return FAIL;

    const totalMax = iaMax + meMax;
    const overallPercent = totalMax > 0 ? ((ia + me) / totalMax) * 100 : 0;

    if (overallPercent >= 75) return { resultRemarkEnglish: 'Passed, Distinction', resultRemarkHindi: 'उत्तीर्ण, विशिष्टता' };
    if (overallPercent >= 60) return { resultRemarkEnglish: 'Passed, First Division', resultRemarkHindi: 'उत्तीर्ण, प्रथम श्रेणी' };
    if (overallPercent >= 55) return { resultRemarkEnglish: 'Passed, Second Division', resultRemarkHindi: 'उत्तीर्ण, द्वितीय श्रेणी' };
    if (overallPercent >= 40) return { resultRemarkEnglish: 'Passed', resultRemarkHindi: 'उत्तीर्ण' };
    return FAIL;
  };

  const IA_MAX = 30;
  const ME_MAX = 70;

  const handleMarkChange = (id, field, value) => {
    const raw = value.toString().trim();
    const isAB = raw.toUpperCase() === 'AB';

    // Determine the max for this field
    const maxAllowed = field === 'iaMarks' ? IA_MAX : ME_MAX;

    // If not AB, validate numeric range
    if (!isAB && raw !== '') {
      const num = parseFloat(raw);
      if (!isNaN(num) && num > maxAllowed) {
        toast.error(`${field === 'iaMarks' ? 'IA' : 'ME'} Marks cannot exceed ${maxAllowed}`, {
          style: { borderRadius: 0, background: '#b91c1c', color: '#fff' }
        });
        return; // reject the change
      }
    }

    setResults(prev => prev.map(r => {
      if (r._id === id) {
        // Allow 'AB' string for absent, otherwise store numeric or raw string while typing
        const markValue = isAB ? 'AB' : (raw === '' ? '' : (isNaN(parseFloat(raw)) ? raw : parseFloat(raw)));
        const updated = { ...r, [field]: markValue };
        // Total: treat AB / empty as 0 for display purposes
        const ia = updated.iaMarks === 'AB' ? 0 : (parseFloat(updated.iaMarks) || 0);
        const me = updated.meMarks === 'AB' ? 0 : (parseFloat(updated.meMarks) || 0);
        updated.marksTotal = ia + me;
        const preview = computeRemarkPreview(updated.iaMarks, updated.iaMaxMarks, updated.meMarks, updated.meMaxMarks);
        updated.resultRemarkEnglish = preview.resultRemarkEnglish;
        updated.resultRemarkHindi = preview.resultRemarkHindi;
        return updated;
      }
      return r;
    }));
  };

  const saveProgress = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teacher/save-progress`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}` 
        },
        body: JSON.stringify({
          // Only send marks — backend recomputes remarks from marks
          results: results.map(r => ({
            resultId: r._id,
            iaMarks: r.iaMarks,
            meMarks: r.meMarks
          }))
        })
      });
      const data = await res.json();
      if (res.ok) toast.success(data.message || 'Progress saved successfully', { style: { borderRadius: 0, background: '#171717', color: '#fff' } });
      else toast.error(data.message, { style: { borderRadius: 0, background: '#b91c1c', color: '#fff' } });
    } catch (err) { toast.error('Save failed', { style: { borderRadius: 0, background: '#b91c1c', color: '#fff' } }); }
  };

  const submitForApproval = async () => {
    if (!window.confirm('Are you sure you want to submit this batch for approval? You won\'t be able to edit it until it\'s disapproved.')) return;
    try {
      const res = await fetch(`${API_URL}/api/teacher/submit-batch/${selectedBatch}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Batch submitted for approval', { style: { borderRadius: 0, background: '#171717', color: '#fff' } });
        setSelectedBatch(null);
        fetchAssignedBatches();
      } else toast.error(data.message, { style: { borderRadius: 0, background: '#b91c1c', color: '#fff' } });
    } catch (err) { toast.error('Submission failed', { style: { borderRadius: 0, background: '#b91c1c', color: '#fff' } }); }
  };

  const activeBatches = batches.filter(b => b.status !== 'approved');
  const approvedBatches = batches.filter(b => b.status === 'approved');
  const displayBatches = activeTab === 'batches' ? activeBatches : approvedBatches;

  const currentBatch = batches.find(b => b._id === selectedBatch);
  const isPending = currentBatch?.status === 'pending';
  const isLocked = activeTab === 'approved' || isPending;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-[72px]'
        } bg-[#0f1117] text-white transition-all duration-300 ease-in-out flex flex-col z-40 border-r border-white/5 relative`}
      >
        {/* Logo / Brand */}
        <div className={`flex items-center border-b border-white/5 ${isSidebarOpen ? 'px-5 py-5 gap-3' : 'justify-center py-5'}`}>
          <div className="w-8 h-8 bg-red-600 flex-shrink-0 flex items-center justify-center rounded-md shadow-lg shadow-red-900/40">
            <span className="text-white font-black text-sm">F</span>
          </div>
          {isSidebarOpen && (
            <div>
              <h1 className="text-[13px] font-black tracking-widest uppercase text-white leading-none">
                Faculty <span className="text-red-500">Portal</span>
              </h1>
              
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`${isSidebarOpen ? 'ml-auto' : 'hidden'} p-1 text-neutral-500 hover:text-white rounded transition-colors`}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Collapse toggle when closed */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex justify-center py-3 text-neutral-500 hover:text-white transition-colors border-b border-white/5"
          >
            <Bars3Icon className="w-4 h-4" />
          </button>
        )}

        {/* Teacher Profile Card */}
        <div className={`${isSidebarOpen ? 'mx-3 my-4 p-3 rounded-xl bg-white/5 border border-white/8 flex items-center gap-3' : 'flex justify-center py-4 border-b border-white/5'}`}>
          <div className={`flex-shrink-0 flex items-center justify-center rounded-full font-black uppercase text-white bg-gradient-to-br from-red-600 to-red-800 shadow-md shadow-red-900/40 ${isSidebarOpen ? 'w-9 h-9 text-sm' : 'w-9 h-9 text-sm'}`}
            title={!isSidebarOpen ? user?.name : undefined}
          >
            {user?.name ? user.name.charAt(0) : 'T'}
          </div>
          {isSidebarOpen && (
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold leading-none">Faculty</p>
              <p className="text-[13px] font-semibold text-white truncate mt-0.5">{user?.name || 'Teacher'}</p>
              <p className="text-[10px] text-neutral-500 truncate mt-0.5">{user?.email || ''}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-1">
          {isSidebarOpen && (
            <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold px-3 pb-2">Navigation</p>
          )}
          <SidebarItem
            icon={ClipboardDocumentListIcon}
            label="Assigned Batches"
            active={activeTab === 'batches'}
            onClick={() => setActiveTab('batches')}
            count={activeBatches.length}
            collapsed={!isSidebarOpen}
          />
          <SidebarItem
            icon={DocumentCheckIcon}
            label="Approved Records"
            active={activeTab === 'approved'}
            onClick={() => setActiveTab('approved')}
            count={approvedBatches.length}
            collapsed={!isSidebarOpen}
          />
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={logout}
            title={!isSidebarOpen ? 'Logout' : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-neutral-500 hover:bg-red-900/20 hover:text-red-400 transition-all duration-200 ${!isSidebarOpen ? 'justify-center' : ''}`}
          >
            <ArrowLeftOnRectangleIcon className="w-[18px] h-[18px] flex-shrink-0" />
            {isSidebarOpen && <span className="text-[13px] font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-neutral-50">
        <Header />
        <div className="flex-1 overflow-auto p-10">
          <div className="max-w-7xl mx-auto">
            {(activeTab === 'batches' || activeTab === 'approved') && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex justify-between items-end mb-8 border-b-2 border-black pb-4">
                  <div>
                    <h2 className="text-3xl font-black text-black tracking-tight uppercase">
                      {activeTab === 'batches' ? 'Assigned Mark Entry' : 'Approved Records'}
                    </h2>
                    <p className="text-neutral-500 font-medium mt-1 tracking-wide text-sm">
                      {activeTab === 'batches' 
                        ? 'Manage and evaluate your designated course batches.' 
                        : 'View finalized mark entries that have been approved.'}
                    </p>
                  </div>
                  <span className="bg-black text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                    {displayBatches.length} Batches
                  </span>
                </div>
                
                <div className="bg-white border border-neutral-300 shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-100 border-b-2 border-neutral-300">
                      <tr>
                        <th className="p-4 text-xs font-bold text-neutral-600 uppercase tracking-widest border-r border-neutral-200">Batch Name</th>
                        <th className="p-4 text-xs font-bold text-neutral-600 uppercase tracking-widest border-r border-neutral-200">Subject</th>
                        <th className="p-4 text-xs font-bold text-neutral-600 uppercase tracking-widest border-r border-neutral-200 text-center">Students</th>
                        <th className="p-4 text-xs font-bold text-neutral-600 uppercase tracking-widest border-r border-neutral-200">Assigned Date</th>
                        <th className="p-4 text-xs font-bold text-neutral-600 uppercase tracking-widest border-r border-neutral-200 text-center">Status</th>
                        <th className="p-4 text-xs font-bold text-neutral-600 uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {displayBatches.map(batch => (
                        <tr key={batch._id} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-4 font-bold text-neutral-900 border-r border-neutral-200">{batch.batchName?.split(' - ')[0] ?? batch.batchName}</td>
                          <td className="p-4 text-neutral-700 font-medium border-r border-neutral-200">{batch.subject}</td>
                          <td className="p-4 text-neutral-600 text-center font-mono border-r border-neutral-200">{batch.studentCount}</td>
                          <td className="p-4 text-neutral-500 text-sm font-mono border-r border-neutral-200">
                            {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="p-4 text-center border-r border-neutral-200">
                            <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                              batch.status === 'disapproved' 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : batch.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : batch.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-neutral-100 text-neutral-600 border-neutral-300'
                            }`}>
                              {batch.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => fetchBatchResults(batch._id)} 
                              className={`text-xs font-bold border px-4 py-1.5 uppercase tracking-wider transition-all duration-300 inline-block ${
                                activeTab === 'approved' 
                                  ? 'text-neutral-700 border-neutral-700 hover:bg-neutral-700 hover:text-white' 
                                  : batch.status === 'pending'
                                  ? 'text-amber-500 border-amber-500 hover:bg-amber-500 hover:text-white hover:shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                                  : 'text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white hover:shadow-[0_0_15px_rgba(96,165,250,0.6)]'
                              }`}
                            >
                              {activeTab === 'approved' ? 'View Records' : batch.status === 'pending' ? 'View Pending' : 'Enter Marks'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {displayBatches.length === 0 && (
                        <tr>
                          <td colSpan="6" className="p-16 text-center text-neutral-400 font-medium tracking-wide">
                            No {activeTab === 'batches' ? 'assigned' : 'approved'} batches found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mark Entry Modal */}
        {selectedBatch && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className="bg-white w-full max-w-[95vw] max-h-[90vh] flex flex-col shadow-2xl rounded-none border border-neutral-800 animate-in zoom-in duration-200">
              <div className="p-6 border-b border-neutral-200 flex justify-between items-center bg-white text-neutral-900">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-widest text-neutral-900">
                    {isPending ? 'Pending Mark Entry' : 'Mark Entry System'}
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1 font-mono">{currentBatch?.batchName}</p>
                </div>
                <div className="flex gap-4">
                  {!isLocked && (
                    <>
                      <button onClick={saveProgress} className="bg-white text-neutral-700 border border-neutral-300 px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-neutral-50 transition-colors">Save Progress</button>
                      <button onClick={submitForApproval} className="bg-blue-400 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-colors">Submit for Approval</button>
                    </>
                  )}
                  <button onClick={() => setSelectedBatch(null)} className="text-neutral-400 hover:text-neutral-800 px-3 py-2 transition-colors">
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto bg-white border-t border-neutral-300 relative">
                  <table className="min-w-full text-[11px] border-collapse">
                    <thead className="bg-neutral-200 sticky top-0 z-20 shadow-sm border-b border-neutral-300">
                      <tr>
                        <th className="p-3 border-b-2 border-r border-neutral-300 bg-neutral-200 sticky left-0 z-30 font-bold text-neutral-800 uppercase tracking-wider whitespace-nowrap">Roll No</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">S.No</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Enrolment</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">DOB</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-800 uppercase tracking-wider whitespace-nowrap">Student (Eng)</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Student (Hin)</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Father (Eng)</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Father (Hin)</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-green-700 uppercase tracking-wider whitespace-nowrap text-center w-24">
                          IA Marks<br /><span className="text-[9px] font-normal text-neutral-400 normal-case">max 30 / AB</span>
                        </th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-green-700 uppercase tracking-wider text-center w-24">
                          ME Marks<br /><span className="text-[9px] font-normal text-neutral-400 normal-case">max 70 / AB</span>
                        </th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-800 uppercase tracking-wider text-center">Total</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-800 uppercase tracking-wider text-left min-w-[140px]">Remark (Eng)</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-800 uppercase tracking-wider text-left min-w-[140px]">Remark (Hin)</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap text-center">IA Max</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider text-center">ME Max</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider text-center">Max Marks</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Course (Eng)</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Course (Hin)</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Year (Eng)</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Year (Hin)</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Sub Code</th>
                        <th className="p-3 border-b-2 border-neutral-300 font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Academic Yr</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {results.map(r => (
                        <tr key={r._id} className="hover:bg-neutral-50 transition-colors group">
                          <td className="p-3 border-r border-neutral-200 bg-white group-hover:bg-neutral-50 sticky left-0 z-10 font-mono font-bold text-neutral-900 whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.02)]">{r.rollNo}</td>
                          <td className="p-3 border-r border-neutral-200 text-neutral-500 font-mono text-center">{r.sNo}</td>
                          <td className="p-3 border-r border-neutral-200 text-neutral-600 font-mono whitespace-nowrap">{r.enrolmentNo}</td>
                          <td className="p-3 border-r border-neutral-200 text-neutral-500 font-mono whitespace-nowrap">{r.dateOfBirth}</td>
                          <td className="p-3 border-r border-neutral-200 font-bold text-neutral-900 whitespace-nowrap">{r.candidateNameEnglish}</td>
                          <td className="p-3 border-r border-neutral-200 text-neutral-600 whitespace-nowrap">{r.candidateNameHindi}</td>
                          <td className="p-3 border-r border-neutral-200 text-neutral-600 whitespace-nowrap">{r.fatherNameEnglish}</td>
                          <td className="p-3 border-r border-neutral-200 text-neutral-600 whitespace-nowrap">{r.fatherNameHindi}</td>
                          <td className="p-1 border-r border-neutral-200 bg-neutral-50/50">
                            <input 
                              type="text"
                              value={r.iaMarks}
                              onChange={(e) => handleMarkChange(r._id, 'iaMarks', e.target.value)}
                              disabled={isLocked}
                              placeholder="0–30 / AB"
                              title="Enter marks (0–30) or AB for absent"
                              className={`w-full text-center border p-2 outline-none transition-all font-mono text-sm font-bold ${
                                isLocked
                                  ? 'bg-neutral-100 text-neutral-500 border-neutral-300'
                                  : parseFloat(r.iaMarks) > IA_MAX && r.iaMarks !== 'AB'
                                  ? 'bg-red-50 border-red-500 text-red-700 focus:ring-1 focus:ring-red-500'
                                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-green-700 focus:ring-1 focus:ring-green-700'
                              }`}
                            />
                          </td>
                          <td className="p-1 border-r border-neutral-200 bg-neutral-50/50">
                            <input 
                              type="text"
                              value={r.meMarks}
                              onChange={(e) => handleMarkChange(r._id, 'meMarks', e.target.value)}
                              disabled={isLocked}
                              placeholder="0–70 / AB"
                              title="Enter marks (0–70) or AB for absent"
                              className={`w-full text-center border p-2 outline-none transition-all font-mono text-sm font-bold ${
                                isLocked
                                  ? 'bg-neutral-100 text-neutral-500 border-neutral-300'
                                  : parseFloat(r.meMarks) > ME_MAX && r.meMarks !== 'AB'
                                  ? 'bg-red-50 border-red-500 text-red-700 focus:ring-1 focus:ring-red-500'
                                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-green-700 focus:ring-1 focus:ring-green-700'
                              }`}
                            />
                          </td>
                          <td className="p-3 border-r border-neutral-200 text-center font-black font-mono text-neutral-900 bg-neutral-100">{r.marksTotal}</td>
                          <td className="p-3 border-r border-neutral-200 whitespace-nowrap bg-neutral-50/50">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 border ${
                              r.resultRemarkEnglish === 'E.R.' 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : r.resultRemarkEnglish?.startsWith('Passed')
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                            }`}>{r.resultRemarkEnglish || '—'}</span>
                          </td>
                          <td className="p-3 border-r border-neutral-200 whitespace-nowrap bg-neutral-50/50">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 border ${
                              r.resultRemarkHindi === 'अनुत्तीर्ण' 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : r.resultRemarkHindi?.startsWith('उत्तीर्ण')
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                            }`}>{r.resultRemarkHindi || '—'}</span>
                          </td>
                          <td className="p-3 border-r border-neutral-200 text-center text-neutral-500 font-mono">{r.iaMaxMarks}</td>
                          <td className="p-3 border-r border-neutral-200 text-center text-neutral-500 font-mono">{r.meMaxMarks}</td>
                          <td className="p-3 border-r border-neutral-200 text-center text-neutral-800 font-bold font-mono">{r.maxMarks}</td>
                          <td className="p-3 border-r border-neutral-200 text-neutral-500 whitespace-nowrap">{r.courseNameEnglish}</td>
                          <td className="p-3 border-r border-neutral-200 text-neutral-500 whitespace-nowrap">{r.courseNameHindi}</td>
                          <td className="p-3 border-r border-neutral-200 text-neutral-500 font-mono whitespace-nowrap">{r.courseYearEnglish}</td>
                          <td className="p-3 border-r border-neutral-200 text-neutral-500 font-mono whitespace-nowrap">{r.courseYearHindi}</td>
                          <td className="p-3 border-r border-neutral-200 text-neutral-800 font-mono font-bold whitespace-nowrap">{r.subjectCode}</td>
                          <td className="p-3 text-neutral-500 font-mono whitespace-nowrap">{r.academicYear}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;
