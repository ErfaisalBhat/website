import React, { useState } from 'react';
import axios from 'axios';
import StudentHeader from './StudentHeader';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const VerifyCertificate = () => {
  const [certNo, setCertNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!certNo.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.get(`${API_URL}/api/student/verify/${certNo.trim()}`);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Certificate not found or invalid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentHeader />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-green-600 px-8 py-10 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">Certificate Verification</h1>
            <p className="text-green-100">Verify the authenticity of Varahamihira Multidiscipilinary Institute certificates</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleVerify} className="max-w-lg mx-auto mb-10">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Enter Certificate Number (e.g. VMI-123456789-123)"
                  value={certNo}
                  onChange={(e) => setCertNo(e.target.value)}
                  className="flex-grow p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl transition-colors shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>

            {error && (
              <div className="max-w-lg mx-auto p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
                <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>{error}</p>
              </div>
            )}

            {result && (
              <div className="max-w-2xl mx-auto animate-fadeIn">
                <div className="border-2 border-green-500 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-green-500 text-white px-6 py-3 flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-sm">Verification Success</span>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 bg-white">
                    <div className="md:col-span-1 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 pb-8 md:pb-0">
                      {result.profileImageId ? (
                        <div className="relative">
                          <img 
                            src={result.profileImageId} 
                            alt="Student" 
                            className="w-32 h-40 object-cover rounded-lg border-2 border-gray-100 shadow-md"
                          />
                          <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1 rounded-full shadow-lg">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className="w-32 h-40 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                          <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-[10px] font-bold uppercase">No Photo</span>
                        </div>
                      )}
                      <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Verified Identity</p>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Student Name</label>
                          <p className="text-xl font-bold text-gray-800">{result.studentName}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Roll Number</label>
                          <p className="text-lg font-semibold text-gray-700">{result.rollNo}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Enrollment Number</label>
                          <p className="text-lg font-semibold text-gray-700">{result.enrolmentNo}</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Subject/Course</label>
                          <p className="text-lg font-semibold text-gray-700">{result.subject}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date of Issuance</label>
                          <p className="text-lg font-semibold text-gray-700">
                            {new Date(result.issuedAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="pt-2">
                          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-200">
                            Status: {result.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Varahamihira Multidiscipilinary Institute</p>
          <p className="mt-2">For any discrepancies, please contact the Examination Branch.</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default VerifyCertificate; 
