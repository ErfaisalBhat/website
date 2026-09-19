import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StudentHeader from './StudentHeader';
import ResultSearch from './ResultDec';
import DiplomaCertificateTemplate from './DiplomaCertificateTemplate';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Bubble animation component
const Bubble = ({ index }) => {
  const size = Math.random() * 60 + 40;
  const startPosition = {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
  };
  return (
    <div
      className="bubble absolute rounded-full"
      style={{
        ...startPosition,
        width: `${size}px`,
        height: `${size}px`,
        animation: `float-${index % 5} ${15 + Math.random() * 10}s infinite linear`,
        animationDelay: `-${Math.random() * 5}s`,
      }}
    >
      <div className="absolute inset-0 rounded-full bubble-inner" />
    </div>
  );
};

const StudentLogin = () => {
  const navigate = useNavigate();
  const { loginStudent } = useAuth();

  const [formData, setFormData] = useState({ rollNo: '', dateOfBirth: '' });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Diploma inline display
  const [diplomaData, setDiplomaData]   = useState(null);
  const [isSavingPDF, setIsSavingPDF]   = useState(false);
  const diplomaRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: diplomaRef,
    documentTitle: `${diplomaData?.rollNo || 'Diploma'}_Diploma`,
    pageStyle: '@page { size: A4; margin: 0; } @media print { body { margin: 0; } }',
  });

  const handleDownloadPDF = async () => {
    setIsSavingPDF(true);
    const element = diplomaRef.current;
    const opt = {
      margin: 0,
      filename: `${diplomaData?.rollNo || 'Diploma'}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 3, useCORS: true, allowTaint: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    try {
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      const uploadFormData = new FormData();
      uploadFormData.append('file', pdfBlob, `${diplomaData?.rollNo || 'Diploma'}.pdf`);
      uploadFormData.append('rollNo', diplomaData?.rollNo);
      uploadFormData.append('type', 'diploma');
      await fetch(`${API_URL}/api/diplomas/save-certificate-to-drive`, {
        method: 'POST',
        body: uploadFormData
      });
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF Gen Error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsSavingPDF(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDiplomaData(null);
    setLoading(true);

    const rollNo      = formData.rollNo.trim();
    const dateOfBirth = formData.dateOfBirth; // YYYY-MM-DD from date picker

    try {
      // ── 1. Try diploma lookup first (Roll No + DOB) ──────────────────────
      const dipRes = await fetch(`${API_URL}/api/diplomas/student-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNo, dateOfBirth }),
      });

      if (dipRes.ok) {
        const dipData = await dipRes.json();
        setDiplomaData(dipData);
        setLoading(false);
        return; // show diploma inline — done
      }

      // ── 2. Try degree lookup ─────────────────────────────────────────────
      const degRes = await fetch(`${API_URL}/api/student/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin,
        },
        credentials: 'include',
        body: JSON.stringify({ rollNo, dateOfBirth }),
      });

      const degData = await degRes.json();

      if (degRes.ok) {
        loginStudent(degData);
        navigate('/student');
      } else {
        setError(degData.message || 'No record found for this Roll Number and Date of Birth.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // ── If diploma was found, show it inline ────────────────────────────────
  if (diplomaData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <StudentHeader />
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-blue-800 rounded-t-2xl px-8 py-8 text-white text-center">
            <h1 className="text-2xl font-bold mb-1">Diploma Certificate</h1>
            <p className="text-blue-200 text-sm">Your official diploma certificate is ready</p>
          </div>

          {/* Actions */}
          <div className="bg-white border-x border-gray-200 px-8 py-4 flex flex-wrap gap-3 justify-center">
            <button
              onClick={handleDownloadPDF}
              disabled={isSavingPDF}
              className="bg-blue-800 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-blue-900 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isSavingPDF ? 'Processing...' : 'Download PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-green-800 transition-colors shadow-md flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={() => setDiplomaData(null)}
              className="bg-gray-100 text-gray-700 font-bold py-2.5 px-6 rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              ← Back
            </button>
          </div>

          {/* Certificate Preview */}
          <div className="bg-white rounded-b-2xl shadow-xl border border-t-0 border-gray-200 p-6">
            <div className="border border-gray-200 shadow-inner bg-gray-50 overflow-auto">
              <div ref={diplomaRef} className="bg-white">
                <DiplomaCertificateTemplate certificateData={diplomaData} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Default: login form ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-green-50 via-gray-50 to-blue-50 overflow-hidden">
      {/* Animated 3D Bubbles */}
      <div className="absolute inset-0 z-0">
        {[...Array(15)].map((_, i) => (
          <Bubble key={i} index={i} />
        ))}
      </div>

      {/* Primary Background Pattern */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='https://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23047857' fill-opacity='0.05'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40zm0-40h2l-2 2V0zm0 4l4-4h2l-6 6V4zm0 4l8-8h2L40 10V8zm0 4L52 0h2L40 14v-2zm0 4L56 0h2L40 18v-2zm0 4L60 0h2L40 22v-2zm0 4L64 0h2L40 26v-2zm0 4L68 0h2L40 30v-2zm0 4L72 0h2L40 34v-2zm0 4L76 0h2L40 38v-2zm0 4L80 0v2L42 40h-2zm4 0L80 4v2L46 40h-2zm4 0L80 8v2L50 40h-2zm4 0l28-28v2L54 40h-2zm4 0l24-24v2L58 40h-2zm4 0l20-20v2L62 40h-2zm4 0l16-16v2L66 40h-2zm4 0l12-12v2L70 40h-2zm4 0l8-8v2l-6 6h-2zm4 0l4-4v2l-2 2h-2z'/%3E%3C/g%3E%3C/svg%3E")`,
          opacity: '0.4'
        }}
      />

      {/* Secondary Gradient Overlay */}
      <div
        className="absolute inset-0 z-0 opacity-30"
        style={{ background: 'linear-gradient(135deg, rgba(4,120,87,0.1) 0%, rgba(59,130,246,0.1) 100%)' }}
      />

      {/* Main Content */}
      <div className="relative z-10">
        <StudentHeader />

        <nav className="bg-gradient-to-r from-green-800 via-green-700 to-green-800 p-2 shadow-lg border-b border-white/20">
          <div className="container mx-auto px-4">
            <div className="flex flex-row space-x-6">
              <button
                onClick={() => setShowSearch(false)}
                className="text-white hover:text-green-200 transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
              <button
                onClick={() => setShowSearch(true)}
                className="text-white hover:text-green-200 transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                List of Declared Results
              </button>
              <Link
                to="/verify"
                className="text-white hover:text-green-200 transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
                </svg>
                Verify Certificate
              </Link>
            </div>
          </div>
        </nav>

        {showSearch ? (
          <div className="container mx-auto px-4 py-6">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
              <ResultSearch />
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-3">
            {/* Header Card */}
            <div className="max-w-3xl mx-auto mb-3">
              <div className="bg-white/80 backdrop-blur-md rounded-lg shadow-lg p-4 text-center border border-white/30">
                <h1 className="text-xl sm:text-2xl font-bold text-green-800">
                  Examination Results
                </h1>
                <p className="text-lg text-gray-700">
                  Statement of Marks / Score Card &amp; Diploma Certificate
                </p>
              </div>
            </div>

            {/* Important Notice */}
            <div className="max-w-3xl mx-auto mb-3">
              <div className="bg-red-50/90 backdrop-blur-md border-l-4 border-red-500 p-3 rounded-lg shadow-md">
                <div className="flex flex-col space-y-1">
                  <p className="text-red-700 font-medium text-center text-sm">
                    Students are advised to save their Statement of Marks / Diploma Certificate for future purpose.
                  </p>
                  <p className="text-red-700 font-medium text-center text-sm">
                    This link will not be available later.
                  </p>
                </div>
              </div>
            </div>

            {/* Login Form */}
            <div className="max-w-md mx-auto mb-4">
              <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-6 border border-white/30">
                <h2 className="text-lg font-bold text-center text-gray-800 mb-1">
                  Student Login
                </h2>
                <p className="text-xs text-center text-gray-500 mb-4">
                  Works for both Degree Results and Diploma Certificates
                </p>

                {error && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Roll Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="rollNo"
                      value={formData.rollNo}
                      onChange={handleChange}
                      className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter your roll number"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Please enter your date of birth as shown in your records
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md
                      transition duration-150 ease-in-out ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Searching...' : 'View Results / Download Certificate'}
                  </button>
                </form>
              </div>
            </div>

            {/* Instructions */}
            <div className="max-w-3xl mx-auto">
              <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-4 border border-white/30 text-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Important Instructions
                </h3>
                <ol className="space-y-3 text-sm text-gray-600 list-decimal pl-4">
                  <li>The result displayed is subject to correction, if any discrepancy is noticed.</li>
                  <li>E.R. means Essential Repeat. The candidate may reappear for examination in the next academic year.</li>
                  <li>Students with discrepancies in their results, categorized as <span className="font-medium">R.A. (Result Awaited), AB (Absent), E.R. (Essential Repeat)</span>, may contact the Examination Branch within <span className="font-medium">10 days</span> of the result declaration.</li>
                  <li>For any query related to results, students are advised to contact the Examination Branch on any working day via email at <span className="font-medium">email[at]vminstitute[dot]in</span></li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Animated Gradient Border at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-blue-500 to-green-500 opacity-50"
        style={{ backgroundSize: '200% 100%', animation: 'gradient 15s ease infinite' }}
      />

      <style>{`
        @keyframes float-0 {
          0% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -50px) rotate(120deg); }
          66% { transform: translate(-20px, 20px) rotate(240deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        @keyframes float-1 {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-60px, -60px) rotate(180deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        @keyframes float-2 {
          0% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(50px, -20px) rotate(120deg); }
          66% { transform: translate(-40px, 40px) rotate(240deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        @keyframes float-3 {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(40px, -60px) rotate(180deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        @keyframes float-4 {
          0% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-30px, -30px) rotate(120deg); }
          66% { transform: translate(30px, 30px) rotate(240deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        .bubble { perspective: 1000px; transform-style: preserve-3d; }
        .bubble-inner {
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%);
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow: inset 0 0 20px rgba(255,255,255,0.2), 0 0 15px rgba(255,255,255,0.1);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          transform-style: preserve-3d;
          animation: shimmer 3s infinite linear;
        }
        @keyframes shimmer {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        .bubble:nth-child(3n) .bubble-inner {
          background: radial-gradient(circle at 30% 30%, rgba(72,187,120,0.2) 0%, rgba(72,187,120,0.1) 50%, rgba(72,187,120,0.05) 100%);
        }
        .bubble:nth-child(3n+1) .bubble-inner {
          background: radial-gradient(circle at 30% 30%, rgba(66,153,225,0.2) 0%, rgba(66,153,225,0.1) 50%, rgba(66,153,225,0.05) 100%);
        }
        @media (max-width: 768px) {
          .bubble { display: none; }
          .bubble:nth-child(-n+8) { display: block; }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: 'linear-gradient(45deg, rgba(4,120,87,0.05) 0%, rgba(59,130,246,0.05) 100%)', mixBlendMode: 'soft-light' }}
      />
    </div>
  );
};

export default StudentLogin;