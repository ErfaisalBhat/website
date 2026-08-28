import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import CertificateTemplate from './CertificateTemplate';
import StudentHeader from './StudentHeader';
import html2pdf from 'html2pdf.js';
import { useReactToPrint } from 'react-to-print';
import ResultSearch from './ResultDec';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const StudentDashboard = () => {
  const { student, logoutStudent, updateStudent } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDeclaredResults, setShowDeclaredResults] = useState(false);
  const navigate = useNavigate();
  const certificateRef = useRef();

  const handlePrintCertificate = useReactToPrint({
    contentRef: certificateRef,
    documentTitle: `${selectedResult?.rollNo || 'Certificate'}_Certificate`,
  });

  const [isSavingPDF, setIsSavingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    setIsSavingPDF(true);
    const element = certificateRef.current;
    const opt = {
      margin: 0,
      filename: `${selectedResult?.rollNo || 'Certificate'}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 3, useCORS: true, allowTaint: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // 1. Generate PDF blob
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      
      // 2. Upload to Drive via Backend
      const token = localStorage.getItem('studentToken');
      const formData = new FormData();
      formData.append('file', pdfBlob, `${selectedResult?.rollNo || 'Certificate'}.pdf`);
      formData.append('rollNo', selectedResult?.rollNo);
      formData.append('type', 'certificate');

      await fetch(`${API_URL}/api/student/save-certificate-to-drive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      // 3. Download to user's device
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF Gen Error:", err);
      alert("Failed to generate/save PDF. Please try again.");
    } finally {
      setIsSavingPDF(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('studentToken');
    const storedStudentInfo = localStorage.getItem('studentInfo');
    if (!token) { navigate('/student/login'); return; }
    if (!student?.name && storedStudentInfo) {
      updateStudent(JSON.parse(storedStudentInfo));
    }
    fetchResults(token);
  }, [navigate, student, updateStudent]);

  const fetchResults = async (token) => {
    try {
      const response = await fetch(`${API_URL}/api/student/results`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.status === 401) { logoutStudent(); navigate('/student/login'); return; }
      const data = await response.json();
      if (response.ok) { setResults(data); } else { setError(data.message); }
    } catch (error) {
      setError('Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async (resultId) => {
    try {
      const token = localStorage.getItem('studentToken');
      const response = await fetch(`${API_URL}/api/student/certificate/${resultId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) { logoutStudent(); navigate('/student/login'); return; }
      if (response.ok) {
        const data = await response.json();
        setSelectedResult(data);
      } else {
        setError('Failed to download certificate');
      }
    } catch (error) {
      setError('Failed to download certificate');
    }
  };

  const handleLogout = () => { logoutStudent(); navigate('/student/login'); };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>
  );

  const failedStatuses = ["r.a.", "result awaited", "ab", "absent", "e.r.", "essential repeat", "ra", "a.b.", "r.a", "a.b", "e.r", "er", "failed"];

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentHeader />

      <nav className="bg-gradient-to-r from-green-800 via-green-700 to-green-800 p-2 shadow-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-row justify-between items-center">
            <div className="flex space-x-6">
              <button onClick={() => setShowDeclaredResults(false)}
                className={`text-white hover:text-green-200 transition-colors flex items-center gap-2 text-sm ${!showDeclaredResults ? 'font-bold underline' : ''}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </button>
              <button onClick={() => setShowDeclaredResults(true)}
                className={`text-white hover:text-green-200 transition-colors flex items-center gap-2 text-sm ${showDeclaredResults ? 'font-bold underline' : ''}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                List of Declared Results
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-white text-sm">Welcome, <span className="font-semibold">{student?.name}</span></span>
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition duration-150">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {showDeclaredResults ? (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <ResultSearch />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-2xl font-bold">
                  {student?.name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{student?.name}</h2>
                  <p className="text-gray-500 text-sm">Student ID: {student?.rollNo}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                  <span className="font-semibold">Roll No:</span> {student?.rollNo}
                </div>
                {student?.enrolmentNo && (
                  <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700">
                    <span className="font-semibold">Enrolment:</span> {student?.enrolmentNo}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">Your Academic Results</h3>
              </div>
              {error ? (
                <div className="p-6 text-center text-red-500 bg-red-50">{error}</div>
              ) : results.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Marks Obtained</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Marks</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Result Status</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map((result) => {
                        const isPassed = !failedStatuses.includes(result.resultRemarkEnglish?.toLowerCase().trim());
                        const isExpired = result.issuedAt && (new Date() - new Date(result.issuedAt)) / (1000 * 60 * 60 * 24) > 180;
                        return (
                          <tr key={result._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.subject}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{result.marksTotal}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{result.maxMarks}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${!isPassed ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                                {result.resultRemarkEnglish}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              {isPassed && (isExpired ? (
                                <span className="text-amber-600 text-[10px] font-medium">Period ended</span>
                              ) : (
                                <button onClick={() => handleDownloadCertificate(result._id)}
                                  className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download
                                </button>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg">No results found for your account.</p>
                  <p className="text-sm">Please contact the administrator if you believe this is an error.</p>
                </div>
              )}
            </div>

            {results.some(r => !failedStatuses.includes(r.resultRemarkEnglish?.toLowerCase().trim())) && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-green-50 border-b border-green-100">
                  <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Available Certificates
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.filter(r => !failedStatuses.includes(r.resultRemarkEnglish?.toLowerCase().trim())).map((result) => {
                    const isExpired = result.issuedAt && (new Date() - new Date(result.issuedAt)) / (1000 * 60 * 60 * 24) > 180;
                    return (
                      <div key={result._id} className="border border-gray-100 rounded-lg p-4 bg-gray-50 flex flex-col justify-between hover:border-green-300 transition-colors">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-gray-800">{result.subject}</h4>
                            {result.certificateNo && (
                              <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono">{result.certificateNo}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-3">
                            {result.issuedAt ? `Issued: ${new Date(result.issuedAt).toLocaleDateString()}` : `Result Date: ${result.dateOfResultEnglish}`}
                          </p>
                        </div>
                        {isExpired ? (
                          <div className="text-center p-2 bg-amber-50 border border-amber-100 rounded-md text-amber-700 text-[11px] font-medium">
                            Download period expired (180 days limit)
                          </div>
                        ) : (
                          <button onClick={() => handleDownloadCertificate(result._id)}
                            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center justify-center gap-2 text-sm transition-colors shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Certificate
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Important Instructions</h3>
              <ul className="space-y-2 text-sm text-gray-600 list-disc pl-5">
                <li>The results displayed are subject to verification and correction by the examination department.</li>
                <li>In case of any discrepancy (RA, AB, ER), please contact the Examination Branch within 10 working days.</li>
                <li>Digital certificates are for immediate reference. Official hard copies can be requested from the institute.</li>
                <li>Keep your roll number and login credentials confidential.</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {selectedResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-h-[95vh] overflow-y-auto mx-auto shadow-2xl" style={{ maxWidth: 'min(95vw, 1000px)' }}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 sm:p-5 z-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="text-lg font-bold text-gray-800">Certificate Preview</h3>
              <div className="flex gap-3">
                <button onClick={handleDownloadPDF} disabled={isSavingPDF}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors text-sm disabled:opacity-50">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  {isSavingPDF ? 'Processing...' : 'Print'}
                </button>
                <button onClick={() => setSelectedResult(null)}
                  className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  Close
                </button>
              </div>
            </div>
            <div className="flex justify-center bg-gray-50 overflow-auto">
              <div ref={certificateRef} id="printableContent" className="bg-white">
                <CertificateTemplate certificateData={selectedResult} />
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-gray-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Varahamihira Multidiscipilinary Institute. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default StudentDashboard;
