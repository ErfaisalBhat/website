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

const SidebarItem = ({ icon: Icon, label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 border-l-4 transition-all duration-200 ${
      active 
        ? 'border-red-700 bg-neutral-800 text-white' 
        : 'border-transparent text-gray-400 hover:bg-neutral-800 hover:text-gray-100'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-semibold tracking-wide text-sm flex-1 text-left uppercase">{label}</span>
    {count > 0 && (
      <span className={`text-[10px] px-2 py-0.5 font-bold ${active ? 'bg-red-700 text-white' : 'bg-neutral-700 text-gray-300'}`}>
        {count}
      </span>
    )}
  </button>
);

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('batches');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAssignedBatches();
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

    // Absent in either component = fail
    if (iaMarks === 'AB' || meMarks === 'AB') return FAIL;
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

  const handleMarkChange = (id, field, value) => {
    setResults(prev => prev.map(r => {
      if (r._id === id) {
        // Allow 'AB' string for absent, otherwise store as number
        const markValue = value.toString().trim().toUpperCase() === 'AB' ? 'AB' : (parseFloat(value) || 0);
        const updated = { ...r, [field]: markValue };
        // Total: treat AB as 0 for display purposes
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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-neutral-900 text-white transition-all duration-300 flex flex-col z-40 border-r border-neutral-800`}
      >
        <div className="p-6 flex items-center justify-between border-b border-neutral-800">
          {isSidebarOpen && <h1 className="text-lg font-black tracking-widest uppercase text-white">
            <span className="text-red-600 mr-1">Faculty</span> Portal
          </h1>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 text-neutral-400 hover:text-white transition-colors">
            {isSidebarOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 mt-6">
          <SidebarItem 
            icon={ClipboardDocumentListIcon} 
            label={isSidebarOpen ? "Assigned Batches" : ""} 
            active={activeTab === 'batches'} 
            onClick={() => setActiveTab('batches')} 
            count={activeBatches.length}
          />
          <SidebarItem 
            icon={DocumentCheckIcon} 
            label={isSidebarOpen ? "Approved Records" : ""} 
            active={activeTab === 'approved'} 
            onClick={() => setActiveTab('approved')} 
            count={approvedBatches.length}
          />
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button 
            onClick={logout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-neutral-800 transition-colors ${!isSidebarOpen && 'justify-center'}`}
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            {isSidebarOpen && <span className="font-semibold text-sm uppercase tracking-wider">Logout</span>}
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
                          <td className="p-4 font-bold text-neutral-900 border-r border-neutral-200">{batch.batchName}</td>
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
                                  : 'text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white hover:shadow-[0_0_15px_rgba(96,165,250,0.6)]'
                              }`}
                            >
                              {activeTab === 'approved' ? 'View Records' : 'Enter Marks'}
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
                  <h3 className="text-2xl font-black uppercase tracking-widest text-neutral-900">Mark Entry System</h3>
                  <p className="text-sm text-neutral-500 mt-1 font-mono">{batches.find(b => b._id === selectedBatch)?.batchName}</p>
                </div>
                <div className="flex gap-4">
                  {activeTab !== 'approved' && (
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
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-green-700 uppercase tracking-wider whitespace-nowrap text-center w-24">IA Marks</th>
                        <th className="p-3 border-b-2 border-r border-neutral-300 font-bold text-green-700 uppercase tracking-wider text-center w-24">ME Marks</th>
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
                              disabled={activeTab === 'approved'}
                              placeholder="—"
                              className={`w-full text-center border border-neutral-300 p-2 outline-none transition-all font-mono text-sm font-bold text-neutral-900 ${
                                activeTab === 'approved' ? 'bg-neutral-100 text-neutral-500' : 'bg-white focus:border-green-700 focus:ring-1 focus:ring-green-700'
                              }`}
                            />
                          </td>
                          <td className="p-1 border-r border-neutral-200 bg-neutral-50/50">
                            <input 
                              type="text"
                              value={r.meMarks} 
                              onChange={(e) => handleMarkChange(r._id, 'meMarks', e.target.value)}
                              disabled={activeTab === 'approved'}
                              placeholder="—"
                              className={`w-full text-center border border-neutral-300 p-2 outline-none transition-all font-mono text-sm font-bold text-neutral-900 ${
                                activeTab === 'approved' ? 'bg-neutral-100 text-neutral-500' : 'bg-white focus:border-green-700 focus:ring-1 focus:ring-green-700'
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
