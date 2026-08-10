import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import toast from 'react-hot-toast';
import { 
  ClipboardDocumentListIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const SidebarItem = ({ icon: Icon, label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium flex-1 text-left">{label}</span>
    {count > 0 && (
      <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-600'}`}>
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

  const computeRemarkPreview = (iaMarks, iaMaxMarks, meMarks, meMaxMarks) => {
    const iaMax = iaMaxMarks || 0;
    const meMax = meMaxMarks || 0;
    const iaPercent = iaMax > 0 ? (iaMarks / iaMax) * 100 : 0;
    const mePercent = meMax > 0 ? (meMarks / meMax) * 100 : 0;

    if (iaPercent < 40 || mePercent < 40) {
      return { resultRemarkEnglish: 'E.R.', resultRemarkHindi: 'अनुत्तीर्ण' };
    }
    const totalMax = iaMax + meMax;
    const overallPercent = totalMax > 0 ? ((iaMarks + meMarks) / totalMax) * 100 : 0;

    if (overallPercent >= 75) return { resultRemarkEnglish: 'Passed, Distinction', resultRemarkHindi: 'उत्तीर्ण, विशिष्टता' };
    if (overallPercent >= 60) return { resultRemarkEnglish: 'Passed, First Division', resultRemarkHindi: 'उत्तीर्ण, प्रथम श्रेणी' };
    if (overallPercent >= 55) return { resultRemarkEnglish: 'Passed, Second Division', resultRemarkHindi: 'उत्तीर्ण, द्वितीय श्रेणी' };
    if (overallPercent >= 40) return { resultRemarkEnglish: 'Passed', resultRemarkHindi: 'उत्तीर्ण' };
    return { resultRemarkEnglish: 'E.R.', resultRemarkHindi: 'अनुत्तीर्ण' };
  };

  const handleMarkChange = (id, field, value) => {
    setResults(prev => prev.map(r => {
      if (r._id === id) {
        const updated = { ...r, [field]: parseFloat(value) || 0 };
        updated.marksTotal = (updated.iaMarks || 0) + (updated.meMarks || 0);
        const preview = computeRemarkPreview(updated.iaMarks, updated.iaMaxMarks, updated.meMarks, updated.meMaxMarks);
        updated.resultRemarkEnglish = preview.resultRemarkEnglish;
        updated.resultRemarkHindi = preview.resultRemarkHindi;
        return updated;
      }
      return r;
    }));
  };

  const handleRemarkChange = (id, field, value) => {
    setResults(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));
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
          results: results.map(r => ({
            resultId: r._id,
            iaMarks: r.iaMarks,
            meMarks: r.meMarks,
            resultRemarkEnglish: r.resultRemarkEnglish,
            resultRemarkHindi: r.resultRemarkHindi
          }))
        })
      });
      const data = await res.json();
      if (res.ok) toast.success(data.message || 'Progress saved successfully');
      else toast.error(data.message);
    } catch (err) { toast.error('Save failed'); }
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
        toast.success(data.message || 'Batch submitted for approval');
        setSelectedBatch(null);
        fetchAssignedBatches();
      } else toast.error(data.message);
    } catch (err) { toast.error('Submission failed'); }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-72' : 'w-20'
        } bg-white border-r transition-all duration-300 flex flex-col z-40`}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && <h1 className="text-xl font-bold text-blue-600">Teacher Panel</h1>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100">
            {isSidebarOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarItem 
            icon={ClipboardDocumentListIcon} 
            label={isSidebarOpen ? "Assigned Batches" : ""} 
            active={activeTab === 'batches'} 
            onClick={() => setActiveTab('batches')} 
            count={batches.length}
          />
        </nav>

        <div className="p-4 border-t">
          <button 
            onClick={logout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${!isSidebarOpen && 'justify-center'}`}
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'batches' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Assigned Mark Entry</h2>
                  <span className="bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-sm font-bold">
                    {batches.length} Batches
                  </span>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Batch Name</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Subject</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Students</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {batches.map(batch => (
                        <tr key={batch._id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-bold text-gray-800">{batch.batchName}</td>
                          <td className="p-4 text-gray-600">{batch.subject}</td>
                          <td className="p-4 text-gray-600">{batch.studentCount}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              batch.status === 'disapproved' 
                                ? 'bg-red-100 text-red-600' 
                                : batch.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {batch.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <button 
                              onClick={() => fetchBatchResults(batch._id)} 
                              className="text-blue-600 font-bold hover:text-blue-800 transition-colors"
                            >
                              Enter Marks
                            </button>
                          </td>
                        </tr>
                      ))}
                      {batches.length === 0 && (
                        <tr>
                          <td colSpan="5" className="p-12 text-center text-gray-400">
                            No assigned batches found
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl w-full max-w-[95vw] max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Mark Entry</h3>
                  <p className="text-sm text-gray-500">{batches.find(b => b._id === selectedBatch)?.batchName}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={saveProgress} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Save Progress</button>
                  <button onClick={submitForApproval} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all">Submit for Approval</button>
                  <button onClick={() => setSelectedBatch(null)} className="bg-white border text-gray-600 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all">Close</button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                <div className="inline-block min-w-full align-middle border rounded-xl overflow-hidden shadow-sm">
                  <table className="min-w-full text-[10px] border-separate border-spacing-0">
                    <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                      <tr>
                        <th className="p-2 border-b border-r bg-gray-50 sticky left-0 z-30 font-bold text-gray-500 uppercase whitespace-nowrap">Roll No</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">S.No</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Enrolment</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">DOB</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Student (Eng)</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Student (Hin)</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Father (Eng)</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Father (Hin)</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap text-center w-16">IA Marks</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase text-center w-16">ME Marks</th>
                        <th className="p-2 border-b border-r font-bold text-blue-600 uppercase text-center">Total</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase text-left min-w-[120px]">Remark (Eng)</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase text-left min-w-[120px]">Remark (Hin)</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap text-center">IA Max</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase text-center">ME Max</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase text-center">Max Marks</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Course (Eng)</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Course (Hin)</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Year (Eng)</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Year (Hin)</th>
                        <th className="p-2 border-b border-r font-bold text-gray-500 uppercase whitespace-nowrap">Sub Code</th>
                        <th className="p-2 border-b font-bold text-gray-500 uppercase whitespace-nowrap">Academic Yr</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map(r => (
                        <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-2 border-r bg-white sticky left-0 z-10 font-mono font-bold text-blue-600 whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{r.rollNo}</td>
                          <td className="p-2 border-r text-gray-400 text-center">{r.sNo}</td>
                          <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.enrolmentNo}</td>
                          <td className="p-2 border-r text-gray-500 whitespace-nowrap">{r.dateOfBirth}</td>
                          <td className="p-2 border-r font-medium text-gray-800 whitespace-nowrap">{r.candidateNameEnglish}</td>
                          <td className="p-2 border-r text-gray-600 whitespace-nowrap">{r.candidateNameHindi}</td>
                          <td className="p-2 border-r text-gray-600 whitespace-nowrap">{r.fatherNameEnglish}</td>
                          <td className="p-2 border-r text-gray-600 whitespace-nowrap">{r.fatherNameHindi}</td>
                          <td className="p-1 border-r bg-blue-50/20">
                            <input 
                              type="number" 
                              value={r.iaMarks} 
                              onChange={(e) => handleMarkChange(r._id, 'iaMarks', e.target.value)}
                              className="w-full text-center border-gray-200 border rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white"
                            />
                          </td>
                          <td className="p-1 border-r bg-blue-50/20">
                            <input 
                              type="number" 
                              value={r.meMarks} 
                              onChange={(e) => handleMarkChange(r._id, 'meMarks', e.target.value)}
                              className="w-full text-center border-gray-200 border rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white"
                            />
                          </td>
                          <td className="p-2 border-r text-center font-bold text-blue-600 bg-blue-50/50">{r.marksTotal}</td>
                          <td className="p-2 border-r text-gray-700 whitespace-nowrap">{r.resultRemarkEnglish || '—'}</td>
                          <td className="p-2 border-r text-gray-700 whitespace-nowrap">{r.resultRemarkHindi || '—'}</td>
                          <td className="p-2 border-r text-center text-gray-400">{r.iaMaxMarks}</td>
                          <td className="p-2 border-r text-center text-gray-400">{r.meMaxMarks}</td>
                          <td className="p-2 border-r text-center text-gray-400 font-bold">{r.maxMarks}</td>
                          <td className="p-2 border-r text-gray-400 whitespace-nowrap">{r.courseNameEnglish}</td>
                          <td className="p-2 border-r text-gray-400 whitespace-nowrap">{r.courseNameHindi}</td>
                          <td className="p-2 border-r text-gray-400 whitespace-nowrap">{r.courseYearEnglish}</td>
                          <td className="p-2 border-r text-gray-400 whitespace-nowrap">{r.courseYearHindi}</td>
                          <td className="p-2 border-r text-gray-400 whitespace-nowrap">{r.subjectCode}</td>
                          <td className="p-2 text-gray-400 whitespace-nowrap">{r.academicYear}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;
