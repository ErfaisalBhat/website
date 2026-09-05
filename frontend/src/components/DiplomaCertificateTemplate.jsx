import React from 'react';

const DiplomaCertificateTemplate = ({ certificateData }) => {
  const {
    certificateNo,
    rollNo,
    candidateName,
    fatherName,
    courseName,
    semester,
    academicYear,
    division,
    issuedAt,
    marksData
  } = certificateData || {};

  const papers = marksData?.papers || [];
  const examSession = marksData?.session || '';
  const totalMax = marksData?.overallMax || 0;
  const totalObtained = marksData?.overallObt || 0;
  const dateOfResult = marksData?.dateOfResult || '';

  const [activeSignature, setActiveSignature] = React.useState(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  React.useEffect(() => {
    fetch(`${API_URL}/api/diplomas/active-signature`)
      .then(res => res.json())
      .then(data => {
        if (data && data.filePath) {
          setActiveSignature(data);
        }
      })
      .catch(err => console.error("Error loading signature:", err));
  }, []);

  // Renders a mark cell; blank/undefined marks are shown as "-"
  const fmtMark = (val) => {
    if (val === undefined || val === null || val === '') return '-';
    return String(val);
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .cert-container {
          margin: 0;
          font-family: 'Tahoma', Arial, sans-serif;
          color: #1a1a1a;
          width: 794px;
          height: 1123px;
          position: relative;
          background-image: url('/Blue.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          border: 1px solid #ddd;
        }
        .content {
          position: relative;
          padding: 22mm 15mm 10mm 15mm;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .cert-no {
          position: absolute;
          top: 17mm;
          right: 13mm;
          font-size: 8pt;
          color: #0f4c75;
          font-weight: 700;
          text-align: right;
          line-height: 1;
        }
        .header {
          text-align: center;
          margin-bottom: 8mm;
          padding-left: 24mm;
          padding-right: 24mm;
        }
        .header h1 {
          color: #0f4c75;
          font-size: 20pt;
          font-family: 'Old English Text MT', serif;
          margin: 1mm 0 0.5mm 0;
          letter-spacing: 0.3pt;
          font-weight: bold;
        }
        .header .sub {
          color: #0f4c75;
          font-size: 10pt;
          font-weight: 600;
          margin: 0;
        }
        .title {
          text-align: center;
          color: #b3261e;
          font-size: 12pt;
          font-weight: 700;
          letter-spacing: 1pt;
          margin: 1.5mm 0 3mm 0;
          border-top: 1pt solid #0f4c75;
          border-bottom: 1pt solid #0f4c75;
          padding: 1.5mm 0;
        }

        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 2.5mm;
          font-size: 10pt;
        }
        .info-table td {
          padding: 0.6mm 2mm;
          vertical-align: top;
        }
        .info-table td.label {
          font-weight: 600;
          width: 45mm;
        }
        .info-table td.colon {
          width: 4mm;
        }

        table.marks {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
          margin-bottom: 2.5mm;
        }
        table.marks th, table.marks td {
          border: 0.75pt solid #4a6fa5;
          padding: 1mm 1.5mm;
          text-align: center;
        }
        table.marks th {
          background: rgba(74, 111, 165, 0.15);
          font-weight: 700;
          color: #0f4c75;
        }
        table.marks td.name { text-align: left; }

        table.summary {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
          margin-bottom: 2.5mm;
        }
        table.summary th, table.summary td {
          border: 0.75pt solid #4a6fa5;
          padding: 1.5mm;
          text-align: center;
        }
        table.summary th {
          background: rgba(74, 111, 165, 0.15);
          color: #0f4c75;
        }

        .decl-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          font-size: 10pt;
          margin: 3mm 0 2mm 0;
        }
        .decl-date {
          font-weight: 700;
          padding-top: 2mm;
        }
        .sign-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 60mm;
        }
        .sign-box {
          width: 55mm;
          height: 20mm;
          margin-bottom: 1mm;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .sign-box img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .sign-label {
          font-weight: 700;
          font-size: 10pt;
        }

        .notes {
          font-size: 10pt;
          line-height: 1.35;
          margin-top: 2mm;
        }
        .notes b { color: #000; }
        .notes ol { margin: 0.5mm 0 0 4mm; padding: 0; }
        .notes li { margin-bottom: 0.5mm; }

        .footer-verify {
          margin-top: auto;
          font-size: 10pt;
          color: #555;
          text-align: center;
          border-top: 0.5pt solid #aaa;
          padding-top: 1.5mm;
        }
      `}</style>

      <div className="cert-container">
        <div className="content">
          <img src="/VMI Logo.png" style={{ position: 'absolute', top: '22mm', left: '16mm', width: '24mm', height: '24mm', objectFit: 'contain' }} alt="VMI Logo" />
          <div className="cert-no">Certificate No.{certificateNo}</div>

          <div className="header">
            <h1>Varahamihira Multidisciplinary Institute</h1>
            <p className="sub">({semester} Semester Exam, {examSession})</p>
          </div>

          <div className="title">STATEMENT OF MARKS</div>

          <table className="info-table">
            <tbody>
              <tr>
                <td className="label">Exam Roll Number</td>
                <td className="colon">:</td>
                <td>{rollNo}</td>
              </tr>
              <tr>
                <td className="label">Course Name</td>
                <td className="colon">:</td>
                <td>{courseName}</td>
              </tr>
              <tr>
                <td className="label">Semester</td>
                <td className="colon">:</td>
                <td>{semester}</td>
              </tr>
              <tr>
                <td className="label">Name of the Candidate</td>
                <td className="colon">:</td>
                <td>{candidateName}</td>
              </tr>
              <tr>
                <td className="label">Father's Name</td>
                <td className="colon">:</td>
                <td>{fatherName}</td>
              </tr>
            </tbody>
          </table>

          <table className="marks">
            <thead>
              <tr>
                <th>Sr.<br />No.</th>
                <th>Paper<br />Code</th>
                <th>Paper Name</th>
                <th>Sem</th>
                <th>IA<br />(Obt/Max)</th>
                <th>TH<br />(Obt/Max)</th>
                <th>PR/PW<br />(Obt/Max)</th>
                <th>Paper Result</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, idx) => {
                const p = papers[idx] || {};
                return (
                  <tr key={idx}>
                    <td>{idx + 1}.</td>
                    <td>{p.code || ''}</td>
                    <td className="name">{p.name || ''}</td>
                    <td>{semester}</td>
                    <td>{fmtMark(p.ia)}</td>
                    <td>{fmtMark(p.th)}</td>
                    <td>{fmtMark(p.prpw)}</td>
                    <td>{p.result || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <table className="summary">
            <thead>
              <tr>
                <th>Division</th>
                <th>Grand Total Obtained</th>
                <th>Grand Total Maximum</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{division}</td>
                <td>{totalObtained}</td>
                <td>{totalMax}</td>
              </tr>
            </tbody>
          </table>

          <div className="decl-row">
            <span className="decl-date">Date of Result Declaration: {dateOfResult}</span>
            <div className="sign-block">
              <div className="sign-box">
                {activeSignature?.filePath && (
                  <img src={`${API_URL}/${activeSignature.filePath}`} alt="Signature" />
                )}
              </div>
              <span className="sign-label">{activeSignature?.signatoryLabel || 'O.S.D. (Examination)'}</span>
            </div>
          </div>

          <div className="notes">
            <b>Passing criteria of a Paper (All conditions are necessary):</b><br />
            (i) 40% in TH; (ii) 40% in IA/PR (wherever applicable); and (iii) 40% in TH + IA/PR, taken together.<br /><br />
            <b>Abbreviations:</b> AB: Absent; ER: Essential Repeat; F: Failed in Paper; F-PR: Failed in Practical;
            F-TH: Failed in Theory; IA: Internal Assessment; Imp: Improvement; Max: Maximum; Obt: Obtained;
            P: Passed in Paper; PR: Practical; PW: Practical Work; RL: Result will be declared later, if necessary; TH: Theory.<br /><br />
            <b>Disclaimer:</b>
            <ol>
              <li>The result displayed on the Institute website is subject to correction if any discrepancy is subsequently noticed.</li>
              <li>This web-based Statement of Marks is valid for all official purposes. Students are advised to have this
                Statement of Marks duly authenticated by the Head/Principal of the concerned Department/Centre.</li>
              <li>Students should immediately contact the Examination Branch if there is any discrepancy in the above
                statement of marks or the prescribed passing criteria within one month from the date of declaration of the result.</li>
            </ol>
          </div>

          <div className="footer-verify">
            <div style={{ fontSize: "10px" }}>(This certificate can be verified online using Certificate No. <b>{certificateNo}</b> at the Institute's certificate verification portal.)</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DiplomaCertificateTemplate;
