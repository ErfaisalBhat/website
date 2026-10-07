import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/* ── Designations (Hindi first, then English) — edit here if the wording changes ── */
const OSD_HINDI        = 'विशेष कार्य अधिकारी (परीक्षा)';
const OSD_ENGLISH      = 'O.S.D. (Examination)';
const CONTROLLER_HINDI = 'परीक्षा नियंत्रक';
const CONTROLLER_ENGLISH = 'Controller of Examination';

/* ── Bottom disclaimer ── */
const DISCLAIMER_HINDI =
  '(यह प्रमाणपत्र डिजिटल रूप से जारी किया गया है और इस संस्थान के होलोग्राम के बिना इसका प्रिंट अमान्य है।)';
const DISCLAIMER_ENGLISH =
  '(This certificate is digitally issued and printing it is invalid without the Institute hologram.)';

const CertificateTemplate = ({ certificateData }) => {
  const {
    rollNo, enrolmentNo, courseNameHindi, courseNameEnglish,
    courseYearHindi, courseYearEnglish, candidateNameHindi, fatherNameHindi,
    candidateNameEnglish, fatherNameEnglish, durationHindi, durationEnglish,
    modeHindi, modeEnglish, iaSubCode, meSubCode, iaMaxMarks, meMaxMarks,
    maxMarks, iaMarks, meMarks, marksTotal, resultRemarkHindi, resultRemarkEnglish,
    dateOfResultHindi, dateOfResultEnglish, certificateNo, student,
    authSignatureImage, controllerSignatureImage,
  } = certificateData || {};

  const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';
  const profileImageId = certificateData?.profileImageId || student?.profileImageId;
  const photoSrc = profileImageId
    ? (profileImageId.startsWith('http') || profileImageId.startsWith('data:')
        ? profileImageId
        : `${API_URL}/uploads/${profileImageId}`)
    : null;

  // Signature image sources — use uploaded file if available, else fall back to static file
  // The backend serves uploads/ folder via the /uploads route (NOT /api/uploads)
  const controllerSigSrc = controllerSignatureImage
    ? (controllerSignatureImage.startsWith('data:') || controllerSignatureImage.startsWith('http')
        ? controllerSignatureImage
        : `${API_URL}/${controllerSignatureImage}`)
    : '/Signature.png';
  const authSigSrc = authSignatureImage
    ? (authSignatureImage.startsWith('data:') || authSignatureImage.startsWith('http')
        ? authSignatureImage
        : `${API_URL}/${authSignatureImage}`)
    : '/BKG Signature.png';
  const formatCertNo = (certNo, roll) => {
    if (!certNo) return '';
    if (certNo.includes('-')) return certNo;
    if (certNo.length > 4 && roll) {
      const seqStr = certNo.substring(4);
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum)) {
        return `VMI-${roll}-${seqNum}`;
      }
    }
    return certNo;
  };
  
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    let str = String(dateStr).trim();
    if (/^\d{5}$/.test(str)) {
      const d = new Date(Math.round((parseInt(str, 10) - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) {
         const day = String(d.getDate()).padStart(2, '0');
         const month = String(d.getMonth() + 1).padStart(2, '0');
         const year = d.getFullYear();
         return `${day}/${month}/${year}`;
      }
    }
    return str;
  };

  const displayCertificateNo = formatCertNo(certificateNo, rollNo);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const qrData = certificateNo
    ? `${currentOrigin}/verify?certNo=${displayCertificateNo}`
    : `${currentOrigin}/verify`;

  /* ── Font shorthand objects ──
     Kokila only ships a regular weight and looks thin on the certificate, so every
     Kokila text is requested bold (browser synthesises the weight). If it is still
     too light, switch HINDI_FONT_WEIGHT to 'bold' + add a real Kokila-Bold.ttf @font-face,
     or use the Arya family for Hindi. */
  const kokila = { fontFamily: "'Kokila','Noto Sans Devanagari',serif", color: '#000' };
  const arya   = { fontFamily: "'Arya','Noto Sans Devanagari',sans-serif", fontWeight: 'bold' };
  const oldEng = { fontFamily: "'Old English Text MT','UnifrakturMaguntia',serif", fontWeight: 'bold' };
  const tahoma = { fontFamily: "'Tahoma','Arial',sans-serif" };

  /* ── Dynamic font sizes ── */
  const hindiNameLen      = (candidateNameHindi   || '').length + (fatherNameHindi   || '').length;
  const hindiNameFontSize = hindiNameLen > 30 ? '17px' : hindiNameLen > 22 ? '19px' : '21px';

  /* ── Shared table-cell styles ── */
  const thBase = {
    border: '1px solid #000',
    padding: '6px 4px 11px 4px',
    lineHeight: 1.25,
    textAlign: 'center',
    verticalAlign: 'middle',
    backgroundColor: 'transparent',
    color: '#000',
    fontWeight: 'normal',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  };
  const tdBase = {
    border: '1px solid #000',
    padding: '5px 4px 11px 4px',
    lineHeight: 1.25,
    textAlign: 'center',
    verticalAlign: 'middle',
  };
  /* Table value cells (codes, marks) — larger and bold so the table looks full */
  const tdValue = { ...tdBase, fontSize: '16px', fontWeight: 'normal' };

  /* ── Mixed Hindi + English lines: every piece of text is its OWN absolutely-positioned layer ──
     Each piece sits in a fixed-height slot (ROW_H). The visible text is position:absolute inside
     that slot, with line-height:1 and a `top` we control, so its position no longer depends on
     the other language's font metrics or on any shared baseline.
       HINDI_Y / ENG_Y : extra nudge in px.  + = DOWN, - = UP.
     Hindi printing high  -> raise HINDI_Y (e.g. 2, 3, 4).  English printing low -> lower ENG_Y (e.g. -1, -2).
     (An invisible copy of the text is kept in the slot only so the row knows how wide each piece is.) */
  const ROW_H   = 28;
  const HINDI_Y = -3;   // Hindi was printing low -> moved UP 3px (more negative = higher)
  const ENG_Y   = 0;

  const piece = (text, font, size, dy, extra = {}) => {
    const top = Math.round((ROW_H - size) / 2) + dy;
    return (
      <span style={{ position:'relative', display:'inline-block', height:`${ROW_H}px`, whiteSpace:'pre', ...extra }}>
        <span aria-hidden="true" style={{ ...font, visibility:'hidden', fontSize:`${size}px`, lineHeight:`${ROW_H}px` }}>{text}</span>
        <span style={{ ...font, position:'absolute', left:0, top:`${top}px`, fontSize:`${size}px`, lineHeight:1, whiteSpace:'pre' }}>{text}</span>
      </span>
    );
  };
  const hi = (text, size = 22, extra = {}) => piece(text, kokila, size, HINDI_Y, extra);
  const en = (text, size = 15, extra = {}) => piece(text, tahoma, size, ENG_Y, extra);
  const lineRow = { display:'flex', alignItems:'flex-start', whiteSpace:'nowrap', height:`${ROW_H}px` };

  /* Flexible gap: leftover page height is shared evenly between sections, so nothing sits empty at the bottom */
  const spacer = <div style={{ flex:'1 1 0', minHeight:0 }} />;

  const divider = { borderBottom: '1.5px solid #000', margin: '8px 0' };
  const hrStyle = { width: '100%', border: 'none', borderTop: '1.5px solid #333', margin: '4px 0 6px' };

  /* Header info block (Enrolment / Roll / Certificate) — identical size + bold for all three */
  const infoHindi = { ...kokila, fontSize: '14px', lineHeight: 1.3,fontWeight:'bold' };
  const infoEng   = { ...tahoma, fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' };

  return (
    <>
      <style>{`
        @font-face { font-family:'Old English Text MT'; src:url('/fonts/oldenglishtextmt.ttf') format('truetype'); }
        @font-face { font-family:'Kokila';              src:url('/fonts/Kokila.ttf')             format('truetype'); }
        @font-face { font-family:'Arya';               src:url('/fonts/Arya-Bold.ttf')           format('truetype'); font-weight:bold; }
        @media print { @page { size:A4; margin:0; } body { margin:0; } }
      `}</style>

      {/* ── Outer wrapper locked to A4 physical dimensions ── */}
      <div style={{
        width: '794px',
        height: '1122px',
        position: 'relative',
        backgroundColor: '#fff',
        overflow: 'hidden', // hides any bleeding
        boxSizing: 'border-box'
      }}>

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
          width:'794px', height:'1122px',
          boxSizing:'border-box',
          padding:'16px 46px 58px 46px',
          display:'flex', flexDirection:'column',
        }}>

          {/* ══ HEADER ROW ══ */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'2px', marginTop:'18px' }}>
            {/* Left: enrolment + certificate no. */}
            <div style={{ width:'230px' }}>
              <div style={infoHindi}>नामांकन संख्या</div>
              <div style={infoEng}>Enrolment No. {enrolmentNo}</div>
              {certificateNo && (
                <div style={{ marginTop:'6px' }}>
                  <div style={infoHindi}>प्रमाणपत्र संख्या</div>
                  <div style={infoEng}>Certificate No.: {displayCertificateNo}</div>
                </div>
              )}
            </div>

            {/* Centre: logo */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <img src="/VMI Logo.png" alt="VMI Logo" style={{ width:'100px', height:'100px', objectFit:'contain', position: 'relative', top: '8px' }} />
            </div>

            {/* Right: roll no */}
            <div style={{ width:'230px', textAlign:'right', position:'relative' }}>
              <div style={infoHindi}>अनुक्रमांक</div>
              <div style={infoEng}>Roll. No. {rollNo}</div>
            </div>
          </div>

          {/* ── Student photo (absolute, top-right) ── */}
          <div style={{
            position:'absolute', top:'114px', right:'46px',
            width:'78px', height:'98px',
            border: photoSrc ? 'none' : '1.5px solid #444',
            overflow:'hidden',
            display:'flex', alignItems:'center', justifyContent:'center',
            backgroundColor:'#f9f9f9',
          }}>
            {photoSrc
              ? <img src={photoSrc} alt="Student" style={{ width:'100%', height:'100%', objectFit:'cover' }} referrerPolicy="no-referrer" />
              : <div style={{ ...tahoma, fontSize:'9px', color:'#999', textAlign:'center' }}>Photo</div>
            }
          </div>

          {/* ══ INSTITUTE TITLE ══ */}
          {/* Hindi is the larger line, English is reduced so the two look balanced */}
          <div style={{ textAlign:'center', lineHeight:1.2, marginBottom:'6px', marginTop:'14px' }}>
            <div style={{ ...arya, color:'#000', fontSize:'21px', marginBottom:'2px' }}>वराहमिहिर बहुविषयक संस्थान</div>
            <div style={{ ...oldEng, fontSize:'19px' }}>Varahamihira Multidisciplinary Institute</div>
          </div>

          {spacer}
          {/* ══ COURSE TITLE ══ */}
          <div style={{ textAlign:'center', lineHeight:1.25, marginBottom:'4px' }}>
            <div style={{ ...kokila, fontSize:'25px',fontWeight:'bold' }}>{courseNameHindi} प्रमाणपत्र</div>
            <div style={{ ...tahoma, fontSize:'17px', fontWeight:'bold', letterSpacing:'0.6px', textTransform:'uppercase' }}>
              {courseNameEnglish}
            </div>
          </div>

          {spacer}
          {/* ══ HINDI BODY ══ */}
          <div style={{ textAlign:'center', lineHeight:1.3, marginBottom:'2px', marginTop:'10px' }}>
            <div style={{ ...kokila, fontSize:'22px' }}>
              प्रमाणित किया जाता है कि सन्&nbsp;
              <b>{courseYearHindi}</b>&nbsp;में परीक्षा के उपरांत&nbsp;
              <b>{courseNameHindi}</b> की प्रमाणपत्र के योग्य सिद्ध होने पर
            </div>
            <div style={{ fontSize:hindiNameFontSize, margin:'4px 0 8px' }}>
              <b style={{ ...arya, verticalAlign: 'baseline' }}>{candidateNameHindi}</b>
              <span style={{ ...kokila, fontSize:'22px', margin:'0 5px', verticalAlign: 'baseline', position: 'relative', top: '-5px' }}>सुपुत्र/सुपुत्री</span>
              <b style={{ ...arya, verticalAlign: 'baseline' }}>{fatherNameHindi}</b>
            </div>
            <div style={divider} />
            <div style={{ ...kokila, fontSize:'22px' }}>
              को {courseYearHindi} के संगोष्ठी में उक्त प्रमाणपत्र प्रदान की गई ।
            </div>
          </div>

          {spacer}
          {/* ══ ENGLISH BODY ══ */}
          <div style={{ textAlign:'center', lineHeight:1.35, marginBottom:'4px', marginTop:'10px', ...tahoma, fontSize:'15px' }}>
            <div>
              This is to certify that having been examined in&nbsp;
              <b>{courseYearEnglish}</b> and found qualified for the certificate in
            </div>
            <div><b>{courseNameEnglish}</b></div>
            <div style={{ fontSize:'15px', marginBottom: '4px' }}>
              <b>{candidateNameEnglish}</b> d/o/s/o <b>{fatherNameEnglish}</b>
            </div>
            <div style={divider} />
            <div>was awarded the said certificate at the conclave held in {courseYearEnglish}.</div>
          </div>

          {spacer}
          {/* ══ SECTION HEADING ══ */}
          <div style={{ ...lineRow, justifyContent:'center', marginBottom:'4px', marginTop:'14px' }}>
            {hi('पाठ्यक्रम और अंक विवरण')}
            {en('✱', 15, { margin:'0 8px' })}
            {en('Course and Marks Description')}
          </div>

          {spacer}
          {/* ══ DURATION & MODE ══ */}
          <div style={{ textAlign:'left', marginLeft:'22px', marginBottom:'6px' }}>
            <div style={{ ...lineRow, marginBottom:'4px' }}>
              {hi('पाठ्यक्रम की अवधि')}
              {en(' / Duration of the Course: ')}
              {hi(durationHindi, 22, { marginLeft:'15px' })}
              {en(` / ${durationEnglish ?? ''}`)}
            </div>
            <div style={lineRow}>
              {hi('शिक्षण विधि')}
              {en(' / Mode of Teaching: ')}
              {hi(modeHindi, 22, { marginLeft:'15px' })}
              {en(` / ${modeEnglish ?? ''}`)}
            </div>
          </div>

          {spacer}
          {/* ══ MARKS TABLE ══ */}
          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'6px', tableLayout:'fixed' }}>
            <colgroup>
              <col style={{ width:'9%'  }} />
              <col style={{ width:'27%' }} />
              <col style={{ width:'15%' }} />
              <col style={{ width:'14%' }} />
              <col style={{ width:'15%' }} />
              <col style={{ width:'20%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={thBase}>
                  <div style={{ ...kokila, fontSize:'18px' }}>क्रमांक</div>
                  <div style={{ ...tahoma, fontSize:'13px' }}>Sr. No.</div>
                </th>
                <th style={thBase}>
                  <div style={{ ...kokila, fontSize:'18px' }}>परीक्षा पत्र</div>
                  <div style={{ ...tahoma, fontSize:'13px' }}>Papers</div>
                </th>
                <th style={thBase}>
                  <div style={{ ...kokila, fontSize:'18px' }}>विषय कोड</div>
                  <div style={{ ...tahoma, fontSize:'13px' }}>Sub. Code</div>
                </th>
                <th style={thBase}>
                  <div style={{ ...kokila, fontSize:'18px' }}>पूर्णांक</div>
                  <div style={{ ...tahoma, fontSize:'13px' }}>Total Marks</div>
                </th>
                <th style={thBase}>
                  <div style={{ ...kokila, fontSize:'18px' }}>प्राप्तांक</div>
                  <div style={{ ...tahoma, fontSize:'13px' }}>Obtained Marks</div>
                </th>
                <th style={thBase}>
                  <div style={{ ...kokila, fontSize:'18px' }}>परिणाम का विवरण</div>
                  <div style={{ ...tahoma, fontSize:'13px' }}>Details of Result</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1 — Internal Assessment */}
              <tr>
                <td style={tdValue}>1.</td>
                <td style={tdBase}>
                  <div style={{ ...kokila, fontSize:'19px' }}>आंतरिक मूल्यांकन</div>
                  <div style={{ ...tahoma, fontSize:'13px',marginBottom:'3px' }}>Internal Assessment</div>
                </td>
                <td style={tdValue}>{iaSubCode}</td>
                <td style={tdValue}>{iaMaxMarks}</td>
                <td style={tdValue}>{iaMarks}</td>
                {/* rowspan 3 — result remark */}
                <td rowSpan={3} style={{ ...tdBase, verticalAlign:'middle' }}>
                  <div style={{ ...kokila, fontSize:'20px' }}>{resultRemarkHindi}</div>
                  <div style={{ ...tahoma, fontSize:'14px' }}>{resultRemarkEnglish}</div>
                </td>
              </tr>

              {/* Row 2 — Main Examination */}
              <tr>
                <td style={tdValue}>2.</td>
                <td style={tdBase}>
                  <div style={{ ...kokila, fontSize:'19px' }}>मुख्य परीक्षा</div>
                  <div style={{ ...tahoma, fontSize:'13px',marginBottom:'3px' }}>Main Examination</div>
                </td>
                <td style={tdValue}>{meSubCode}</td>
                <td style={tdValue}>{meMaxMarks}</td>
                <td style={tdValue}>{meMarks}</td>
              </tr>

              {/* Row 3 — Total */}
              <tr>
                <td colSpan={3} style={{ ...tdBase, textAlign: 'left', paddingLeft: '15px' }}>
                  <div style={{ ...kokila, fontSize:'20px'}}>योग:</div>
                  <div style={{ ...tahoma, fontSize:'13px',marginBottom:'3px' }}>Total:</div>
                </td>
                <td style={{ ...tdValue, fontSize:'17px' }}>{maxMarks}</td>
                <td style={{ ...tdValue, fontSize:'17px' }}>{marksTotal}</td>
              </tr>
            </tbody>
          </table>

          {spacer}
          {/* ══ FOOTER ══ */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:'16px', marginBottom:'2px' }}>

            {/* Left — O.S.D. (Examination) */}
            <div style={{ textAlign:'center', width:'215px' }}>
              <div style={{ height:'90px', display:'flex', alignItems:'flex-end', justifyContent:'center', marginBottom:'3px' }}>
                <img src={authSigSrc} alt="Signature" style={{ width:'85px', height:'85px', objectFit:'contain' }} />
              </div>
              <div style={{ ...kokila, fontSize:'18px', marginTop:'3px', lineHeight:1.3 }}>{OSD_HINDI}</div>
              <div style={{ ...tahoma, fontSize:'12px', marginTop:'1px' }}>{OSD_ENGLISH}</div>
            </div>

            {/* Centre — Date + QR */}
            <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', alignSelf:'flex-end' }}>
              <div style={{
                background:'#dbeafe', padding:'2px 14px 22px 14px',
                WebkitPrintColorAdjust:'exact', printColorAdjust:'exact',
                textAlign:'center', whiteSpace:'nowrap'
              }}>
                <div style={{ ...kokila, fontSize:'16px' }}>दिल्ली, दिनांक {formatDisplayDate(dateOfResultHindi)}</div>
                <div style={{ ...tahoma,  fontSize:'10px'  }}>Delhi, Dated the {formatDisplayDate(dateOfResultEnglish)}</div>
              </div>
              <div style={{ position: 'relative', top: '12px' }}>
                <QRCodeSVG
                  value={qrData}
                  size={55}
                  level="M"
                  bgColor="transparent"
                  fgColor="#000000"
                  style={{ WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' }}
                />
              </div>
            </div>

            {/* Right — Controller of Examination */}
            <div style={{ textAlign:'center', width:'215px' }}>
              <div style={{ height:'90px', display:'flex', alignItems:'flex-end', justifyContent:'center', marginBottom:'3px' }}>
                <img src={controllerSigSrc} alt="Signature" style={{ width:'85px', height:'85px', objectFit:'contain' }} />
              </div>
              <div style={{ ...kokila, fontSize:'18px', marginTop:'3px', lineHeight:1.3 }}>{CONTROLLER_HINDI}</div>
              <div style={{ ...tahoma, fontSize:'12px', marginTop:'1px' }}>{CONTROLLER_ENGLISH}</div>
            </div>
          </div>

          {/* ══ DISCLAIMER (pinned to the bottom of the content area) ══ */}
          <div style={{ paddingTop:'15px', textAlign:'center', lineHeight:1.3 }}>
            <div style={{ ...kokila, fontSize:'13px' }}>{DISCLAIMER_HINDI}</div>
            <div style={{ ...tahoma, fontSize:'10px', fontStyle:'italic' }}>{DISCLAIMER_ENGLISH}</div>
          </div>

        </div>{/* end content layer */}
      </div>{/* end A4 shell */}
    </>
  );
};

export default CertificateTemplate;