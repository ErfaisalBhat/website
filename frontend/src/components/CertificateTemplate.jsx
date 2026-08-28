import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

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
    ? (profileImageId.startsWith('http') || profileImageId.startsWith('data:') 
        ? profileImageId 
        : `${API_URL}/uploads/${profileImageId}`)
    : null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const qrData = certificateNo
    ? `${currentOrigin}/verify?certNo=${certificateNo}`
    : `${currentOrigin}/verify`;

  const authSigImage = certificateData?.authSignatureImage 
    ? `${API_URL}/${certificateData.authSignatureImage.replace(/^uploads\//, '')}` 
    : null;
    
  const controllerSigImage = certificateData?.controllerSignatureImage 
    ? `${API_URL}/${certificateData.controllerSignatureImage.replace(/^uploads\//, '')}` 
    : null;

  /* ── Font shorthand objects ── */
  const kokila = { fontFamily: "'Kokila','Noto Sans Devanagari',serif" };
  const arya   = { fontFamily: "'Arya','Noto Sans Devanagari',sans-serif", fontWeight: 'bold' };
  const oldEng = { fontFamily: "'Old English Text MT','UnifrakturMaguntia',serif", fontWeight: 'bold' };
  const tahoma = { fontFamily: "'Tahoma','Arial',sans-serif" };

  /* ── Dynamic font sizes ── */
  const hindiNameLen      = (candidateNameHindi   || '').length + (fatherNameHindi   || '').length;
  const hindiNameFontSize = hindiNameLen > 30 ? '17px' : hindiNameLen > 22 ? '19px' : '21px';
  const engNameLen        = (candidateNameEnglish || '').length + (fatherNameEnglish || '').length;
  const engNameFontSize   = engNameLen > 40 ? '11.5px' : '13px';
  const remarkLen         = (resultRemarkEnglish  || '').length;
  const remarkHindiFontSize = remarkLen > 15 ? '10px' : '11px';
  const remarkEngFontSize   = remarkLen > 15 ? '9px'  : '10px';

  /* ── Shared table-cell styles ── */
  const thBase = {
    border: '1px solid #000',
    padding: '5px 4px',
    textAlign: 'center',
    verticalAlign: 'middle',
    backgroundColor: 'transparent',
    color: '#000',
    fontWeight: 'bold',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  };
  const tdBase = {
    border: '1px solid #000',
    padding: '5px 4px',
    textAlign: 'center',
    verticalAlign: 'middle',
  };

  const divider = { borderBottom: '1.5px solid #000', margin: '2px 0' };
  const hrStyle = { width: '100%', border: 'none', borderTop: '1.5px solid #333', margin: '3px 0' };

  return (
    <>
      <style>{`
        @font-face { font-family:'Old English Text MT'; src:url('/fonts/oldenglishtextmt.ttf') format('truetype'); }
        @font-face { font-family:'Kokila';              src:url('/fonts/Kokila.ttf')             format('truetype'); }
        @font-face { font-family:'Arya';               src:url('/fonts/Arya-Bold.ttf')           format('truetype'); font-weight:bold; }
        @media print { @page { size:A4; margin:0; } body { margin:0; } }
      `}</style>

      {/* ── Outer A4 shell ── */}
      <div style={{ width:'794px', height:'1123px', overflow:'hidden', margin:'0 auto', position:'relative' }}>

        {/* Background image */}
        <img
          src="/certificate-bg.png" alt=""
          style={{
            position:'absolute', inset:0,
            width:'100%', height:'100%', objectFit:'fill',
            WebkitPrintColorAdjust:'exact', printColorAdjust:'exact',
          }}
        />

        {/* ── Content layer ── */}
        <div style={{
          position:'absolute', top:0, left:0,
          width:'794px', height:'1123px',
          boxSizing:'border-box',
          padding:'83px 46px 20px 46px',
          display:'flex', flexDirection:'column',
        }}>

          {/* ══ HEADER ROW — enrolment left, logo centre, roll right (matches cert.pdf) ══ */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'4px' }}>
            <div style={{ width:'195px' }}>
              <div style={{ ...kokila, fontSize:'13px', lineHeight:1.3 }}>नामांकन संख्या</div>
              <div style={{ ...tahoma, fontSize:'12px' }}>Enrolment No. {enrolmentNo}</div>
            </div>
            <div style={{ textAlign:'center', flex:'0 0 auto' }}>
              <img src="/VMI Logo.png" alt="VMI Logo" style={{ width:'95px', height:'95px', objectFit:'contain' }} />
            </div>
            <div style={{ width:'195px', textAlign:'right' }}>
              <div style={{ ...kokila, fontSize:'13px', lineHeight:1.3 }}>अनुक्रमांक</div>
              <div style={{ ...tahoma, fontSize:'12px' }}>Roll. No. {rollNo}</div>
            </div>
          </div>

          {/* ── Student photo (absolute, top-right, below roll no) ── */}
          <div style={{
            position:'absolute', top:'135px', right:'46px',
            width:'78px', height:'98px',
            border: photoSrc ? 'none' : '1.5px solid #444',
            overflow:'hidden',
            display:'flex', alignItems:'center', justifyContent:'center',
            backgroundColor:'#f9f9f9',
          }}>
            {photoSrc
              ? <img src={photoSrc} alt="Student" style={{ width:'100%', height:'100%', objectFit:'fill' }} />
              : <div style={{ ...tahoma, fontSize:'9px', color:'#999', textAlign:'center' }}>Photo</div>
            }
          </div>

          {/* ══ INSTITUTE TITLE ══ */}
          <div style={{ textAlign:'center', lineHeight:1.25, marginBottom:'6px' }}>
            <div style={{ ...kokila, fontSize:'17px', marginBottom:'2px' }}>वराहमिहिर बहुविषयक संस्थान</div>
            <div style={{ ...oldEng, fontSize:'26px' }}>Varāhamihira Multidisciplinary Institute</div>
          </div>

          {/* ══ COURSE TITLE ══ */}
          {/* Hindi on top, English below in uppercase to match the PDF */}
          <div style={{ textAlign:'center', lineHeight:1.4, marginBottom:'8px' }}>
            <div style={{ ...kokila, fontSize:'14px' }}>{courseNameHindi} प्रमाणपत्र</div>
            <div style={{ ...tahoma, fontSize:'12px', letterSpacing:'0.6px', textTransform:'uppercase' }}>
              {courseNameEnglish}
            </div>
          </div>

          {/* ══ HINDI BODY ══ */}
          <div style={{ textAlign:'center', lineHeight:1.65, marginBottom:'4px' }}>
            <div style={{ ...kokila, fontSize:'13px' }}>
              प्रमाणित किया जाता है कि सन्&nbsp;
              <b>{courseYearHindi}</b>&nbsp;में परीक्षा के उपरांत&nbsp;
              <b>{courseNameHindi}</b> की प्रमाणपत्र के योग्य सिद्ध होने पर
            </div>
            <div style={{ fontSize:hindiNameFontSize, margin:'4px 0 2px' }}>
              <b style={arya}>{candidateNameHindi}</b>
              <span style={{ ...kokila, fontSize:'13px', margin:'0 5px' }}>सुपुत्र/सुपुत्री</span>
              <b style={arya}>{fatherNameHindi}</b>
            </div>
            <div style={{ ...kokila, fontSize:'13px' }}>
              को {courseYearHindi} के संगोष्ठी में उक्त प्रमाणपत्र प्रदान की गई ।
            </div>
          </div>

          {/* ══ ENGLISH BODY ══ */}
          <div style={{ textAlign:'center', lineHeight:1.75, marginBottom:'8px', ...tahoma, fontSize:'13px' }}>
            <div>
              This is to certify that having been examined in&nbsp;
              <b>{courseYearEnglish}</b> and found qualified for the certificate in
            </div>
            <div><b>{courseNameEnglish}</b></div>
            <div style={{ fontSize:engNameFontSize }}>
              <b>{candidateNameEnglish}</b> d/o/s/o <b>{fatherNameEnglish}</b>
            </div>
            <div style={divider} />
            <div>was awarded the said certificate at the conclave held in {courseYearEnglish}.</div>
          </div>

          {/* ══ SECTION HEADING ══ */}
          <div style={{ textAlign:'center', marginBottom:'6px' }}>
            <span style={{ ...kokila, fontSize:'14px' }}>पाठ्यक्रम और अंक विवरण</span>
            <span style={{ margin:'0 5px', fontSize:'13px' }}>✱</span>
            <span style={{ ...tahoma, fontSize:'12px' }}>Course and Marks Description</span>
          </div>

          {/* ══ DURATION & MODE ══ */}
          <div style={{ marginBottom:'6px' }}>
            <div style={{ marginBottom:'2px' }}>
              <span style={{ ...kokila, fontSize:'12.5px' }}>पाठ्यक्रम की अवधि</span>
              <span style={{ ...tahoma, fontSize:'12px' }}> / Duration of the Course: </span>
              <span style={{ ...kokila, fontSize:'12.5px' }}>{durationHindi}</span>
              <span style={{ ...tahoma, fontSize:'12px' }}> / {durationEnglish}</span>
            </div>
            <div>
              <span style={{ ...kokila, fontSize:'12.5px' }}>शिक्षण विधि</span>
              <span style={{ ...tahoma, fontSize:'12px' }}> / Mode of Teaching: </span>
              <span style={{ ...kokila, fontSize:'12.5px' }}>{modeHindi}</span>
              <span style={{ ...tahoma, fontSize:'12px' }}> / {modeEnglish}</span>
            </div>
          </div>

          {/* ══ MARKS TABLE ══ */}
          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'10px', tableLayout:'fixed' }}>
            <colgroup>
              <col style={{ width:'7%'  }} />
              <col style={{ width:'27%' }} />
              <col style={{ width:'16%' }} />
              <col style={{ width:'14%' }} />
              <col style={{ width:'15%' }} />
              <col style={{ width:'21%' }} />
            </colgroup>
            <thead>
              <tr>
                {/* Sr. No. */}
                <th style={thBase}>
                  <div style={{ ...kokila, fontSize:'11px' }}>क्रमांक</div>
                  <div style={{ ...tahoma, fontSize:'10px' }}>Sr. No.</div>
                </th>
                {/* Papers */}
                <th style={{ ...thBase, textAlign:'left', paddingLeft:'8px' }}>
                  <div style={{ ...kokila, fontSize:'11px' }}>परीक्षा पत्र</div>
                  <div style={{ ...tahoma, fontSize:'10px' }}>Papers</div>
                </th>
                {/* Sub Code */}
                <th style={thBase}>
                  <div style={{ ...kokila, fontSize:'11px' }}>विषय कोड</div>
                  <div style={{ ...tahoma, fontSize:'10px' }}>Sub. Code</div>
                </th>
                {/* Total Marks */}
                <th style={thBase}>
                  <div style={{ ...kokila, fontSize:'11px' }}>पूर्णांक</div>
                  <div style={{ ...tahoma, fontSize:'10px' }}>Total Marks</div>
                </th>
                {/* Obtained Marks */}
                <th style={thBase}>
                  <div style={{ ...kokila, fontSize:'11px' }}>प्राप्तांक</div>
                  <div style={{ ...tahoma, fontSize:'10px' }}>Obtained Marks</div>
                </th>
                {/* Details of Result */}
                <th style={thBase}>
                  <div style={{ ...kokila, fontSize:'11px' }}>परिणाम का विवरण</div>
                  <div style={{ ...tahoma, fontSize:'10px' }}>Details of Result</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1 — Internal Assessment */}
              <tr>
                <td style={{ ...tdBase, fontSize:'11px' }}>1.</td>
                <td style={{ ...tdBase, textAlign:'left', paddingLeft:'8px' }}>
                  <div style={{ ...kokila, fontSize:'11px' }}>आंतरिक मूल्यांकन</div>
                  <div style={{ ...tahoma, fontSize:'10px' }}>Internal Assessment</div>
                </td>
                <td style={{ ...tdBase, fontSize:'11px' }}>{iaSubCode}</td>
                <td style={{ ...tdBase, fontSize:'11px' }}>{iaMaxMarks}</td>
                <td style={{ ...tdBase, fontSize:'11px' }}>{iaMarks}</td>
                {/* rowspan 3 — result remark */}
                <td rowSpan={3} style={{ ...tdBase, verticalAlign:'middle' }}>
                  <div style={{ ...kokila, fontSize:remarkHindiFontSize }}>{resultRemarkHindi}</div>
                  <div style={{ ...tahoma, fontSize:remarkEngFontSize   }}>{resultRemarkEnglish}</div>
                </td>
              </tr>

              {/* Row 2 — Main Examination */}
              <tr>
                <td style={{ ...tdBase, fontSize:'11px' }}>2.</td>
                <td style={{ ...tdBase, textAlign:'left', paddingLeft:'8px' }}>
                  <div style={{ ...kokila, fontSize:'11px' }}>मुख्य परीक्षा</div>
                  <div style={{ ...tahoma, fontSize:'10px' }}>Main Examination</div>
                </td>
                <td style={{ ...tdBase, fontSize:'11px' }}>{meSubCode}</td>
                <td style={{ ...tdBase, fontSize:'11px' }}>{meMaxMarks}</td>
                <td style={{ ...tdBase, fontSize:'11px' }}>{meMarks}</td>
              </tr>

              {/* Row 3 — Total */}
              <tr>
                <td colSpan={3} style={{ ...tdBase, fontWeight:'bold' }}>
                  <span style={{ ...kokila, fontSize:'11px' }}>योग:</span>
                  &nbsp;/&nbsp;
                  <span style={{ ...tahoma, fontSize:'10px' }}>Total:</span>
                </td>
                <td style={{ ...tdBase, fontWeight:'bold', fontSize:'11px' }}>{maxMarks}</td>
                <td style={{ ...tdBase, fontWeight:'bold', fontSize:'11px' }}>{marksTotal}</td>
              </tr>
            </tbody>
          </table>

          {/* ══ FOOTER — positioned at bottom, inside border ══ */}
          <div style={{
            position:'absolute', bottom:'60px', left:'46px', right:'46px',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'2px' }}>

              {/* Left — Controller of Examination */}
              <div style={{ textAlign:'center', width:'190px' }}>
                <div style={{ height:'48px', display:'flex', alignItems:'flex-end', justifyContent:'center', marginBottom:'3px' }}>
                  <img src={controllerSigImage || "/Signature.png"} alt="Signature" style={{ height:'40px', objectFit:'contain' }} />
                </div>
                <div style={hrStyle} />
                <div style={{ ...kokila, fontSize:'12.5px', marginTop:'2px' }}>परीक्षा नियंत्रक</div>
                <div style={{ ...tahoma, fontSize:'11px' }}>Controller of Examination</div>
                <div style={{ ...oldEng, fontSize:'8px', marginTop:'1px' }}>Varāhamihira Multidisciplinary Institute</div>
              </div>

              {/* Centre — Date + QR */}
              <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                <div style={{
                  background:'#dbeafe', padding:'7px 14px',
                  WebkitPrintColorAdjust:'exact', printColorAdjust:'exact',
                }}>
                  <div style={{ ...kokila, fontSize:'12.5px' }}>दिल्ली, दिनांक {dateOfResultHindi}</div>
                  <div style={{ ...tahoma,  fontSize:'11px'  }}>Delhi, Dated the {dateOfResultEnglish}</div>
                </div>
                <QRCodeSVG
                  value={qrData}
                  size={55}
                  level="M"
                  bgColor="transparent"
                  fgColor="#000000"
                  style={{ WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' }}
                />
                <div style={{ ...tahoma, fontSize:'7px', color:'#888' }}>Scan to Verify</div>
              </div>

              {/* Right — Verifying Authority */}
              <div style={{ textAlign:'center', width:'190px' }}>
                <div style={{ height:'48px', display:'flex', alignItems:'flex-end', justifyContent:'center', marginBottom:'3px' }}>
                  <img src={authSigImage || "/BKG Signature.png"} alt="Verifying Authority" style={{ height:'48px', objectFit:'contain' }} />
                </div>
                <div style={hrStyle} />
                <div style={{ ...kokila, fontSize:'12.5px', marginTop:'2px' }}>सत्यापन प्राधिकारी</div>
                <div style={{ ...tahoma, fontSize:'11px' }}>Verifying Authority</div>
                <div style={{ ...tahoma, fontSize:'9px', marginTop:'1px', color:'#444' }}>
                  Asiatic Society for Social Science Research
                </div>
              </div>
            </div>

            {/* Certificate No */}
            {certificateNo && (
              <div style={{ 
                position: 'absolute',
                left: '-15px',
                bottom: '100px',
                transform: 'rotate(-90deg)',
                transformOrigin: 'left bottom',
                whiteSpace: 'nowrap',
                ...tahoma, 
                fontSize:'9px', 
                color:'#444', 
                letterSpacing:'0.5px' 
              }}>
                Certificate No. {certificateNo}
              </div>
            )}

            {/* Disclaimer */}
            <div style={{ ...tahoma, fontSize:'7px', color:'#666', textAlign:'center', marginTop:'1px', lineHeight:1.3 }}>
              (यह प्रमाणपत्र डिजिटल रूप से जारी किया गया है और संस्थान के होलोग्राम के बिना इसका प्रिंट अमान्य है / This certificate is digitally issued and printing it is invalid without the Institute hologram.)
            </div>
          </div>

        </div>{/* end content layer */}
      </div>{/* end A4 shell */}
    </>
  );
};

export default CertificateTemplate;