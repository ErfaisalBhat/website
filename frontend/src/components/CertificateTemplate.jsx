import React from 'react';

const CertificateTemplate = ({ certificateData }) => {
  const {
    rollNo, enrolmentNo, courseNameHindi, courseNameEnglish,
    courseYearHindi, courseYearEnglish, candidateNameHindi, fatherNameHindi,
    candidateNameEnglish, fatherNameEnglish, durationHindi, durationEnglish,
    modeHindi, modeEnglish, iaSubCode, meSubCode, iaMaxMarks, meMaxMarks,
    maxMarks, iaMarks, meMarks, marksTotal, resultRemarkHindi, resultRemarkEnglish,
    dateOfResultHindi, dateOfResultEnglish, certificateNo, student,
  } = certificateData || {};

  const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';
  const profileImageId = certificateData?.profileImageId || student?.profileImageId;
  const photoSrc = profileImageId
    ? (profileImageId.startsWith('http') ? profileImageId : `${API_URL}/uploads/${profileImageId}`)
    : null;

  const kokila = { fontFamily: "'Kokila','Noto Sans Devanagari',serif" };
  const arya   = { fontFamily: "'Arya','Noto Sans Devanagari',sans-serif", fontWeight: 'bold' };
  const oldEng = { fontFamily: "'Old English Text MT','UnifrakturMaguntia',serif", fontWeight: 'bold' };
  const tahoma = { fontFamily: "'Tahoma','Arial',sans-serif" };

  const th = {
    border: '1px solid #000', padding: '5px 5px', textAlign: 'center',
    verticalAlign: 'middle', backgroundColor: '#f0f0f0',
    WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', fontSize: '11px',
  };
  const td = {
    border: '1px solid #000', padding: '6px 5px',
    textAlign: 'center', verticalAlign: 'middle', fontSize: '11px',
  };
  const hrStyle = { width: '100%', border: 'none', borderTop: '1.5px solid #333', margin: '3px 0' };

  return (
    <>
      <style>{`
        @font-face { font-family: 'Old English Text MT'; src: url('/fonts/oldenglishtextmt.ttf') format('truetype'); }
        @font-face { font-family: 'Kokila'; src: url('/fonts/Kokila.ttf') format('truetype'); }
        @font-face { font-family: 'Arya'; src: url('/fonts/Arya-Bold.ttf') format('truetype'); font-weight: bold; }
        @media print { @page { size: A4; margin: 0; } body { margin: 0; } }
      `}</style>

      {/* Outer A4 shell — clips everything */}
      <div style={{
        width: '794px',
        height: '1123px',
        overflow: 'hidden',
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Background covers full A4 */}
        <img
          src="/certificate-bg.png"
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'fill',
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
          }}
        />

        {/* Content column — fixed width, natural height, scaled to fit */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: '794px',
          transformOrigin: 'top left',
          boxSizing: 'border-box',
          padding: '22px 48px 18px 48px',
        }}>

          {/* ── HEADER ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' ,marginTop: '15px'}}>
            <div style={{ width: '180px' }}>
              <div style={{ ...kokila, fontSize: '13px', lineHeight: 1.3 }}>नामांकन संख्या</div>
              <div style={{ ...tahoma, fontSize: '12px' }}>Enrolment No. {enrolmentNo}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src="/VMI Logo.png" alt="VMI Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            </div>
            <div style={{ width: '180px', textAlign: 'right' }}>
              <div style={{ ...kokila, fontSize: '13px', lineHeight: 1.3 }}>अनुक्रमांक</div>
              <div style={{ ...tahoma, fontSize: '12px' }}>Roll. No. {rollNo}</div>
            </div>
          </div>

          {/* ── STUDENT PHOTO — absolute inside content div ── */}
          {photoSrc && (
            <img src={photoSrc} alt="Student" style={{
              position: 'absolute', top: '110px', right: '48px',
              width: '85px', height: '108px',
              objectFit: 'cover', border: '1.5px solid #444',
            }} />
          )}

          {/* ── INSTITUTE TITLE ── */}
          <div style={{ textAlign: 'center', lineHeight: '1.25', marginBottom: '6px' }}>
            <div style={{ ...oldEng, fontSize: '28px' }}>Varāhamihira Multidisciplinary Institute</div>
            <div style={{ ...kokila, fontSize: '17px', marginTop: '3px' }}>वराहमिहिर बहुविषयक संस्थान</div>
          </div>

          {/* ── COURSE TITLE ── */}
          <div style={{ textAlign: 'center', lineHeight: '1.4', marginBottom: '8px' }}>
            <div style={{ ...kokila, fontSize: '14px' }}>{courseNameHindi} प्रमाणपत्र</div>
            <div style={{ ...tahoma, fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{courseNameEnglish}</div>
          </div>

          {/* ── HINDI BODY ── */}
          <div style={{ textAlign: 'center', lineHeight: '1.65', marginBottom: '4px' }}>
            <div style={{ ...kokila, fontSize: '13px' }}>
              प्रमाणित किया जाता है कि सन् {courseYearHindi} में परीक्षा के उपरांत{' '}
              <b>{courseNameHindi}</b> की प्रमाणपत्र के योग्य सिद्ध होने पर
            </div>
            <div style={{ fontSize: '21px', margin: '4px 0 2px' }}>
              <b style={arya}>{candidateNameHindi}</b>
              <span style={{ ...kokila, fontSize: '14px' }}> सुपुत्र/सुपुत्री </span>
              <b style={arya}>{fatherNameHindi}</b>
            </div>
            <div style={{ borderBottom: '1.5px solid #000', margin: '2px 0 4px' }} />
            <div style={{ ...kokila, fontSize: '12.5px' }}>
              को {courseYearHindi} के संगोष्ठी में उक्त प्रमाणपत्र प्रदान की गई ।
            </div>
          </div>

          {/* ── ENGLISH BODY ── */}
          <div style={{ textAlign: 'center', lineHeight: '1.7', marginBottom: '8px', fontSize: '13px', ...tahoma }}>
            <div>This is to certify that having been examined in <b>{courseYearEnglish}</b> and found qualified for the certificate in</div>
            <div style={{ borderBottom: '1.5px solid #000', margin: '2px 50px' }} />
            <div><b>{courseNameEnglish}</b></div>
            <div style={{ borderBottom: '1.5px solid #000', margin: '2px 0' }} />
            <div><b>{candidateNameEnglish}</b> d/o/s/o <b>{fatherNameEnglish}</b></div>
            <div style={{ borderBottom: '1.5px solid #000', margin: '2px 0' }} />
            <div>was awarded the said certificate at the conclave held in {courseYearEnglish}.</div>
          </div>

          {/* ── COURSE & MARKS HEADING ── */}
          <div style={{ textAlign: 'center', marginBottom: '5px' }}>
            <span style={{ ...kokila, fontSize: '14px' }}>पाठ्यक्रम और अंक विवरण</span>
            <span style={{ margin: '0 5px', fontSize: '14px' }}>✱</span>
            <span style={{ ...tahoma, fontSize: '12px' }}>Course and Marks Description</span>
          </div>

          {/* ── DURATION & MODE ── */}
          <div style={{ marginBottom: '5px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '3px', alignItems: 'baseline', fontSize: '12.5px' }}>
              <span style={{ ...kokila, whiteSpace: 'nowrap' }}>पाठ्यक्रम की अवधि</span>
              <span style={{ ...tahoma, whiteSpace: 'nowrap' }}>/ Duration of the Course:</span>
              <span style={kokila}>{durationHindi}</span>
              <span style={tahoma}>/ {durationEnglish}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', fontSize: '12.5px' }}>
              <span style={{ ...kokila, whiteSpace: 'nowrap' }}>शिक्षण विधि</span>
              <span style={{ ...tahoma, whiteSpace: 'nowrap' }}>/ Mode of Teaching:</span>
              <span style={kokila}>{modeHindi}</span>
              <span style={tahoma}>/ {modeEnglish}</span>
            </div>
          </div>

          {/* ── MARKS TABLE ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '22px' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '7%' }}><span style={kokila}>क्रमांक</span><br /><span style={tahoma}>Sr. No.</span></th>
                <th style={{ ...th, width: '27%', textAlign: 'left', paddingLeft: '8px' }}><span style={kokila}>परीक्षा पत्र</span><br /><span style={tahoma}>Papers</span></th>
                <th style={{ ...th, width: '16%' }}><span style={kokila}>विषय कोड</span><br /><span style={tahoma}>Sub. Code</span></th>
                <th style={{ ...th, width: '14%' }}><span style={kokila}>पूर्णांक</span><br /><span style={tahoma}>Total Marks</span></th>
                <th style={{ ...th, width: '15%' }}><span style={kokila}>प्राप्तांक</span><br /><span style={tahoma}>Obtained Marks</span></th>
                <th style={{ ...th, width: '21%' }}><span style={kokila}>परिणाम का विवरण</span><br /><span style={tahoma}>Details of Result</span></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={td}>1.</td>
                <td style={{ ...td, textAlign: 'left', paddingLeft: '8px' }}>
                  <span style={kokila}>आंतरिक मूल्यांकन</span><br />
                  <span style={{ ...tahoma, fontSize: '10px' }}>Internal Assessment</span>
                </td>
                <td style={td}>{iaSubCode}</td>
                <td style={td}>{iaMaxMarks}</td>
                <td style={td}>{iaMarks}</td>
                <td rowSpan={2} style={{ ...td, verticalAlign: 'middle' }}>
                  <span style={{ ...kokila, fontSize: '11px' }}>{resultRemarkHindi}</span><br />
                  <span style={{ ...tahoma, fontSize: '10px' }}>{resultRemarkEnglish}</span>
                </td>
              </tr>
              <tr>
                <td style={td}>2.</td>
                <td style={{ ...td, textAlign: 'left', paddingLeft: '8px' }}>
                  <span style={kokila}>मुख्य परीक्षा</span><br />
                  <span style={{ ...tahoma, fontSize: '10px' }}>Main Examination</span>
                </td>
                <td style={td}>{meSubCode}</td>
                <td style={td}>{meMaxMarks}</td>
                <td style={td}>{meMarks}</td>
              </tr>
              <tr style={{ fontWeight: 'bold' }}>
                <td colSpan={3} style={{ ...td, textAlign: 'center' }}>
                  <span style={kokila}>योग:</span><br /><span style={tahoma}>Total:</span>
                </td>
                <td style={td}>{maxMarks}</td>
                <td style={td}>{marksTotal}</td>
                <td style={td}></td>
              </tr>
            </tbody>
          </table>

          {/* ── FOOTER ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>

            <div style={{ textAlign: 'center', width: '190px' }}>
              <div style={{ height: '54px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '4px' }}>
                <img src="/Signature.png" alt="Signature" style={{ height: '42px', objectFit: 'contain' }} />
              </div>
              <div style={hrStyle} />
              <div style={{ ...kokila, fontSize: '14px', marginTop: '3px' }}>परीक्षा नियंत्रक</div>
              <div style={{ ...tahoma, fontSize: '11.5px' }}>Controller of Examination</div>
              <div style={{ ...oldEng, fontSize: '8.5px', marginTop: '2px' }}>Varāhamihira Multidisciplinary Institute</div>
            </div>

            <div style={{
              textAlign: 'center', background: '#dbeafe',
              padding: '12px 16px', width: '220px',
              WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
            }}>
              <div style={{ ...kokila, fontSize: '13.5px' }}>दिल्ली, दिनांक {dateOfResultHindi}</div>
              <div style={{ ...tahoma, fontSize: '12px' }}>Delhi, Dated the {dateOfResultEnglish}</div>
            </div>

            <div style={{ textAlign: 'center', width: '190px' }}>
              <div style={{ height: '54px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '4px' }}>
                <img src="/BKG Signature.png" alt="Verifying Authority" style={{ height: '50px', objectFit: 'contain' }} />
              </div>
              <div style={hrStyle} />
              <div style={{ ...kokila, fontSize: '14px', marginTop: '3px' }}>सत्यापन प्राधिकारी</div>
              <div style={{ ...tahoma, fontSize: '11.5px' }}>Verifying Authority</div>
              <div style={{ ...tahoma, fontSize: '9.5px', marginTop: '2px', color: '#444' }}>Asiatic Society for Social Science Research</div>
            </div>
          </div>

          {/* ── CERT NO & DISCLAIMER ── */}
          {certificateNo && (
            <div style={{ ...tahoma, fontSize: '9px', color: '#888', textAlign: 'center', marginTop: '5px', letterSpacing: '0.3px' }}>
              Certificate No. {certificateNo}
            </div>
          )}
          <div style={{ ...tahoma, fontSize: '7.5px', color: '#666', textAlign: 'center', marginTop: '3px', lineHeight: '1.4' }}>
            (यह प्रमाणपत्र डिजिटल रूप से जारी किया गया है और संस्थान के होलोग्राम के बिना इसका प्रिंट अमान्य है / This certificate is digitally issued and printing it is invalid without the Institute hologram.)
          </div>

        </div>
      </div>
    </>
  );
};

const hrStyle = { width: '100%', border: 'none', borderTop: '1.5px solid #333', margin: '3px 0' };

export default CertificateTemplate;