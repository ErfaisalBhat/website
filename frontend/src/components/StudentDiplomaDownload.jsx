import React, { useState, useRef } from 'react';
import StudentHeader from './StudentHeader';
import DiplomaCertificateTemplate from './DiplomaCertificateTemplate';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Tab IDs ──────────────────────────────────────────────────────────────────
const TAB_DOWNLOAD = 'download';
const TAB_VERIFY   = 'verify';

// ── Shared UI helpers ─────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) =>
  value ? (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-44 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  ) : null;

// ── Main Component ────────────────────────────────────────────────────────────
const StudentDiplomaDownload = () => {
  const [activeTab, setActiveTab] = useState(TAB_DOWNLOAD);

  // ── Download tab state ───────────────────────────────────────────────────
  const [dlForm, setDlForm]         = useState({ rollNo: '', dateOfBirth: '' });
  const [dlLoading, setDlLoading]   = useState(false);
  const [dlError, setDlError]       = useState('');
  const [certificate, setCertificate] = useState(null);
  const [isSavingPDF, setIsSavingPDF] = useState(false);
  const certificateRef = useRef();

  // ── Verify tab state ─────────────────────────────────────────────────────
  const [certNo, setCertNo]           = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError]   = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  // ── Print helper ─────────────────────────────────────────────────────────
  const handlePrint = useReactToPrint({
    contentRef: certificateRef,
    documentTitle: `${certificate?.rollNo || 'Diploma'}_Diploma`,
    pageStyle: '@page { size: A4; margin: 0; } @media print { body { margin: 0; } }',
  });

  // ── Download PDF + save to Drive ─────────────────────────────────────────
  const handleDownloadPDF = async () => {
    setIsSavingPDF(true);
    const element = certificateRef.current;
    const opt = {
      margin: 0,
      filename: `${certificate?.rollNo || 'Diploma'}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 3, useCORS: true, allowTaint: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    try {
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      const uploadFormData = new FormData();
      uploadFormData.append('file', pdfBlob, `${certificate?.rollNo || 'Diploma'}.pdf`);
      uploadFormData.append('rollNo', certificate?.rollNo);
      uploadFormData.append('type', 'diploma');
      await fetch(`${API_URL}/api/diplomas/save-certificate-to-drive`, {
        method: 'POST',
        body: uploadFormData
      });
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF Gen Error:', err);
      alert('Failed to generate/save PDF. Please try again.');
    } finally {
      setIsSavingPDF(false);
    }
  };

  // ── Download tab: lookup by Roll No + DOB ────────────────────────────────
  const handleDlSubmit = async (e) => {
    e.preventDefault();
    setDlError('');
    setDlLoading(true);
    setCertificate(null);
    try {
      const res = await fetch(`${API_URL}/api/diplomas/student-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dlForm)
      });
      const data = await res.json();
      if (res.ok) setCertificate(data);
      else setDlError(data.message || 'No certificate found matching those details.');
    } catch {
      setDlError('Connection to server failed.');
    } finally {
      setDlLoading(false);
    }
  };

  // ── Verify tab: lookup by Certificate No ─────────────────────────────────
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifyError('');
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`${API_URL}/api/diplomas/verify/${certNo.trim()}`);
      const data = await res.json();
      if (res.ok) setVerifyResult(data);
      else setVerifyError(data.message || 'Certificate not found.');
    } catch {
      setVerifyError('Connection to server failed.');
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Tab button helper ────────────────────────────────────────────────────
  const TabBtn = ({ id, label, icon }) => (
    <button
      onClick={() => { setActiveTab(id); setDlError(''); setVerifyError(''); }}
      className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
        activeTab === id
          ? 'border-blue-700 text-blue-700'
          : 'border-transparent text-gray-500 hover:text-blue-600'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StudentHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">

        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="bg-blue-800 rounded-t-2xl px-8 py-10 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Diploma Certificate Portal</h1>
          <p className="text-blue-100">Download or verify your official diploma certificate</p>
        </div>

        {/* ── Tab bar ───────────────────────────────────────────────── */}
        <div className="bg-white border-x border-gray-200 flex">
          <TabBtn
            id={TAB_DOWNLOAD}
            label="Download Certificate"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            }
          />
          <TabBtn
            id={TAB_VERIFY}
            label="Verify Certificate"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
              </svg>
            }
          />
        </div>

        {/* ── Tab panels ────────────────────────────────────────────── */}
        <div className="bg-white rounded-b-2xl shadow-xl border border-t-0 border-gray-200 p-8 mb-8">

          {/* ── DOWNLOAD TAB ──────────────────────────────────────── */}
          {activeTab === TAB_DOWNLOAD && (
            <form onSubmit={handleDlSubmit} className="max-w-md mx-auto space-y-6">
              <h2 className="text-lg font-bold text-gray-800 text-center mb-2">
                Enter your details to find your diploma
              </h2>

              {dlError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm text-center">
                  {dlError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Exam Roll Number
                </label>
                <input
                  type="text"
                  placeholder="Enter your Roll Number"
                  value={dlForm.rollNo}
                  onChange={e => setDlForm({ ...dlForm, rollNo: e.target.value })}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dlForm.dateOfBirth}
                  onChange={e => setDlForm({ ...dlForm, dateOfBirth: e.target.value })}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={dlLoading}
                className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                {dlLoading ? 'Searching...' : 'Find My Certificate'}
              </button>
            </form>
          )}

          {/* ── VERIFY TAB ────────────────────────────────────────── */}
          {activeTab === TAB_VERIFY && (
            <div className="max-w-md mx-auto space-y-6">
              <h2 className="text-lg font-bold text-gray-800 text-center mb-2">
                Enter the Certificate Number to verify authenticity
              </h2>

              <form onSubmit={handleVerifySubmit} className="space-y-4">
                {verifyError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm text-center">
                    {verifyError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Diploma Certificate Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2425001"
                    value={certNo}
                    onChange={e => setCertNo(e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg disabled:opacity-50"
                >
                  {verifyLoading ? 'Verifying...' : 'Verify Certificate'}
                </button>
              </form>

              {/* Verify result card */}
              {verifyResult && (
                <div className="mt-6 border border-gray-200 rounded-2xl p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-800">Verification Result</h3>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      verifyResult.isValid === 'Valid ✓'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {verifyResult.isValid || 'Verified ✓'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <InfoRow label="Certificate No"  value={verifyResult.certificateNo} />
                    <InfoRow label="Candidate Name"  value={verifyResult.candidateName} />
                    <InfoRow label="Roll Number"     value={verifyResult.rollNo} />
                    <InfoRow label="Course"          value={verifyResult.courseName} />
                    <InfoRow label="Semester"        value={verifyResult.semester} />
                    <InfoRow label="Academic Year"   value={verifyResult.academicYear} />
                    <InfoRow label="Division"        value={verifyResult.division} />
                    <InfoRow label="Issued On"       value={verifyResult.issuedAt
                      ? new Date(verifyResult.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : null}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Certificate preview (Download tab) ────────────────────────────── */}
        {activeTab === TAB_DOWNLOAD && certificate && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 flex flex-col items-center">
            <div className="flex flex-wrap gap-4 mb-6 justify-center">
              <button
                onClick={handleDownloadPDF}
                disabled={isSavingPDF}
                className="bg-blue-800 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-900 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {isSavingPDF ? 'Processing...' : 'Download PDF'}
              </button>

              <button
                onClick={handlePrint}
                className="bg-green-700 text-white font-bold py-3 px-6 rounded-xl hover:bg-green-800 transition-colors shadow-md flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
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

