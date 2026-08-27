import React, { useState, useRef } from 'react';
import StudentHeader from './StudentHeader';
import DiplomaCertificateTemplate from './DiplomaCertificateTemplate';
import { useReactToPrint } from 'react-to-print';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const StudentDiplomaDownload = () => {
  const [formData, setFormData] = useState({ rollNo: '', dateOfBirth: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [certificate, setCertificate] = useState(null);
  const certificateRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: certificateRef,
    documentTitle: `${certificate?.rollNo || 'Diploma'}_Diploma`,
    pageStyle: '@page { size: A4; margin: 0; } @media print { body { margin: 0; } }',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setCertificate(null);

    try {
      const response = await fetch(`${API_URL}/api/diplomas/student-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (response.ok) {
        setCertificate(data);
      } else {
        setError(data.message || 'No certificate found matching those details.');
      }
    } catch (err) {
      setError('Connection to server failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StudentHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 mb-8">
          <div className="bg-blue-800 px-8 py-10 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">Diploma Certificate Lookup</h1>
            <p className="text-blue-100">Download your verified digital diploma certificate</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Exam Roll Number</label>
                <input
                  type="text"
                  name="rollNo"
                  placeholder="Enter your Roll Number"
                  value={formData.rollNo}
                  onChange={handleChange}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Find Certificate'}
              </button>
            </form>
          </div>
        </div>

        {certificate && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 flex flex-col items-center">
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => handlePrint()}
                className="bg-blue-800 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-900 transition-colors shadow-md flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Preview
              </button>
            </div>

            <div className="border border-gray-200 shadow-inner p-4 bg-gray-50 overflow-auto max-w-full">
              <div ref={certificateRef} className="bg-white">
                <DiplomaCertificateTemplate certificateData={certificate} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDiplomaDownload;
