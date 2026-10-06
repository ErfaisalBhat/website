/**
 * studentCertificateHTML.js
 *
 * Server-side mirror of frontend/src/components/CertificateTemplate.jsx
 * Generates a self-contained HTML string for the student certificate.
 * Puppeteer renders this into a true vector PDF (text stays as text).
 *
 * @param {Object} data  - Certificate data (same shape as generateCertificate sends to frontend)
 * @param {Object} paths - { bgImage, logoImage, fonts: { oldEng, kokila, arya }, defaultAuthSig, defaultCtrlSig }
 */

const fs   = require('fs');
const path = require('path');

function toDataUri(filePath) {
  try {
    const ext    = path.extname(filePath).slice(1).toLowerCase() || 'png';
    const mime   = ext === 'ttf' ? 'font/truetype' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const buffer = fs.readFileSync(filePath);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (e) {
    console.error('[studentCertHTML] Could not embed file:', filePath, e.message);
    return '';
  }
}

function esc(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatCertNo(certNo, rollNo) {
  if (!certNo) return '';
  if (certNo.includes('-')) return certNo;
  if (certNo.length > 4 && rollNo) {
    const seqNum = parseInt(certNo.substring(4), 10);
    if (!isNaN(seqNum)) return `VMI-${rollNo}-${seqNum}`;
  }
  return certNo;
}

function buildStudentCertificateHTML(data, paths, origin) {
  const {
    rollNo, enrolmentNo, courseNameHindi, courseNameEnglish,
    courseYearHindi, courseYearEnglish, candidateNameHindi, fatherNameHindi,
    candidateNameEnglish, fatherNameEnglish, durationHindi, durationEnglish,
    modeHindi, modeEnglish, iaSubCode, meSubCode, iaMaxMarks, meMaxMarks,
    maxMarks, iaMarks, meMarks, marksTotal, resultRemarkHindi, resultRemarkEnglish,
    dateOfResultHindi, dateOfResultEnglish, certificateNo,
    profileImageId,
    authSignatureImage, authSignatureLabel,
    controllerSignatureImage, controllerSignatureLabel,
  } = data;

  const displayCertNo = formatCertNo(certificateNo, rollNo);
  const qrData = certificateNo
    ? `${origin}/verify?certNo=${displayCertNo}`
    : `${origin}/verify`;

  // ── Embed assets as data URIs so Puppeteer needs no network ──
  const bgDataUri   = toDataUri(paths.bgImage);
  const logoDataUri = toDataUri(paths.logoImage);

  const oldEngUri = toDataUri(paths.fonts.oldEng);
  const kokilaUri = toDataUri(paths.fonts.kokila);
  const aryaUri   = toDataUri(paths.fonts.arya);

  // Signature images — could be a data: URI from DB, a file path, or a URL
  function sigSrc(rawSig, fallbackPath) {
    if (!rawSig) return toDataUri(fallbackPath);
    if (rawSig.startsWith('data:') || rawSig.startsWith('http')) return rawSig;
    // relative file path stored in DB (e.g. uploads/cert-sig-xxx.png)
    try { return toDataUri(path.join(path.dirname(paths.bgImage), '..', rawSig)); } catch(e) {}
    return toDataUri(fallbackPath);
  }
  const ctrlSigSrc = sigSrc(controllerSignatureImage, paths.defaultCtrlSig);
  const authSigSrc = sigSrc(authSignatureImage,       paths.defaultAuthSig);

  // Photo
  const photoHTML = profileImageId
    ? `<img src="${profileImageId}" alt="Student"
           style="width:100%;height:100%;object-fit:cover;" />`
    : `<div style="font-family:'Tahoma','Arial',sans-serif;font-size:9px;color:#999;text-align:center;">Photo</div>`;

  // Dynamic font sizes (mirrors CertificateTemplate.jsx logic)
  const hindiNameLen      = (candidateNameHindi || '').length + (fatherNameHindi || '').length;
  const hindiNameFontSize = hindiNameLen > 30 ? '17px' : hindiNameLen > 22 ? '19px' : '21px';
  const engNameLen        = (candidateNameEnglish || '').length + (fatherNameEnglish || '').length;
  const engNameFontSize   = engNameLen > 40 ? '11.5px' : '13px';
  const remarkLen         = (resultRemarkEnglish || '').length;
  const remarkHindiFontSize = remarkLen > 15 ? '10px' : '11px';
  const remarkEngFontSize   = remarkLen > 15 ? '9px'  : '10px';

  // QR code — we generate a simple SVG QR using the qrcode library
  // We'll use an inline data-URI approach via a tiny QR SVG generator included in node
  let qrSvg = '';
  try {
    const QRCode = require('qrcode');
    qrSvg = QRCode.toString(qrData, { type: 'svg', margin: 1, width: 55, errorCorrectionLevel: 'M' });
    // Remove XML declaration if present
    qrSvg = qrSvg.replace(/<\?xml[^?]*\?>\s*/gi, '').trim();
  } catch(e) {
    console.error('[studentCertHTML] qrcode not available:', e.message);
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Certificate - ${esc(rollNo)}</title>
<style>
  @font-face { font-family:'Old English Text MT'; src:url('${oldEngUri}') format('truetype'); font-weight:bold; }
  @font-face { font-family:'Kokila';              src:url('${kokilaUri}') format('truetype'); }
  @font-face { font-family:'Arya';               src:url('${aryaUri}')   format('truetype'); font-weight:bold; }

  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; }

  .a4-shell {
    width: 794px;
    height: 1122px;
    position: relative;
    background-color: #fff;
    overflow: hidden;
  }
  .bg-img {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: fill;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .content-layer {
    position: absolute; top: 0; left: 0;
    width: 794px; height: 1122px;
    box-sizing: border-box;
    padding: 22px 46px 20px 46px;
    display: flex; flex-direction: column;
  }

  /* ── fonts ── */
  .f-kokila  { font-family:'Kokila','Noto Sans Devanagari',serif; }
  .f-arya    { font-family:'Arya','Noto Sans Devanagari',sans-serif; font-weight:bold; }
  .f-oldeng  { font-family:'Old English Text MT','UnifrakturMaguntia',serif; font-weight:bold; }
  .f-tahoma  { font-family:'Tahoma','Arial',sans-serif; }

  /* ── header ── */
  .header-row {
    display: flex; align-items: center;
    justify-content: space-between;
    margin-bottom: 4px; margin-top: 10px;
  }
  .header-left  { width: 195px; }
  .header-right { width: 195px; text-align: right; position: relative; }

  /* ── student photo ── */
  .student-photo {
    position: absolute; top: 114px; right: 46px;
    width: 78px; height: 98px;
    border: 1.5px solid #444;
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    background-color: #f9f9f9;
  }

  /* ── marks table ── */
  .marks-table {
    width: 100%; border-collapse: collapse;
    margin-bottom: 10px; table-layout: fixed;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .marks-table th, .marks-table td {
    border: 1px solid #000;
    padding: 6px 4px 8px 4px;
    line-height: 1.35; text-align: center; vertical-align: middle;
  }
  .marks-table th {
    background-color: transparent; color: #000; font-weight: bold;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .marks-table .td-left { text-align: left; padding-left: 8px; }

  /* ── footer ── */
  .footer-row {
    display: flex; justify-content: space-between;
    align-items: flex-start; margin-top: 44px; margin-bottom: 2px;
  }
  .footer-block { text-align: center; width: 190px; }
  .sig-holder {
    height: 48px; display: flex; align-items: flex-end;
    justify-content: center; margin-bottom: 3px;
  }
  .sig-holder img { height: 40px; object-fit: contain; }
  .sig-holder-auth img { height: 48px; object-fit: contain; }
  .hr-sig { width: 100%; border: none; border-top: 1.5px solid #333; margin: 3px 0; }

  .divider { border-bottom: 1.5px solid #000; margin: 2px 0; }
  .blue-box {
    background: #dbeafe; padding: 7px 14px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .centre-footer {
    text-align: center; display: flex; flex-direction: column;
    align-items: center; gap: 4px; align-self: flex-end;
  }
  .qr-wrap { position: relative; top: 12px; }
  .qr-wrap svg { display: block; }
</style>
</head>
<body>
<div class="a4-shell">
  <img class="bg-img" src="${bgDataUri}" alt="" />

  <div class="content-layer">

    <!-- HEADER ROW -->
    <div class="header-row">
      <!-- Left: enrolment + cert no -->
      <div class="header-left">
        <div class="f-kokila" style="font-size:13px;line-height:1.3;">नामांकन संख्या</div>
        <div class="f-tahoma" style="font-size:12px;">Enrolment No. ${esc(enrolmentNo)}</div>
        ${certificateNo ? `
        <div style="margin-top:6px;color:#333;">
          <div class="f-kokila" style="font-size:13px;line-height:1.3;">प्रमाणपत्र संख्या</div>
          <div class="f-tahoma" style="font-size:11px;">Certificate No.: ${esc(displayCertNo)}</div>
        </div>` : ''}
      </div>

      <!-- Centre: logo -->
      <div style="display:flex;flex-direction:column;align-items:center;">
        <img src="${logoDataUri}" alt="VMI Logo"
             style="width:95px;height:95px;object-fit:contain;position:relative;top:15px;" />
      </div>

      <!-- Right: roll no -->
      <div class="header-right">
        <div class="f-kokila" style="font-size:13px;line-height:1.3;">अनुक्रमांक</div>
        <div class="f-tahoma" style="font-size:12px;">Roll. No. ${esc(rollNo)}</div>
      </div>
    </div>

    <!-- Student photo (absolute, top-right) -->
    <div class="student-photo">${photoHTML}</div>

    <!-- INSTITUTE TITLE -->
    <div style="text-align:center;line-height:1.2;margin-bottom:6px;margin-top:8px;">
      <div class="f-kokila" style="font-size:20px;margin-bottom:2px;">वराहमिहिर बहुविषयक संस्थान</div>
      <div class="f-oldeng" style="font-size:26px;">Varāhamihira Multidisciplinary Institute</div>
    </div>

    <!-- COURSE TITLE -->
    <div style="text-align:center;line-height:1.25;margin-bottom:4px;">
      <div class="f-kokila" style="font-size:25px;">${esc(courseNameHindi)} प्रमाणपत्र</div>
      <div class="f-tahoma" style="font-size:20px;letter-spacing:0.6px;text-transform:uppercase;">
        ${esc(courseNameEnglish)}
      </div>
    </div>

    <!-- HINDI BODY -->
    <div style="text-align:center;line-height:1.4;margin-bottom:4px;margin-top:20px;">
      <div class="f-kokila" style="font-size:22px;">
        प्रमाणित किया जाता है कि सन्&nbsp;<b>${esc(courseYearHindi)}</b>&nbsp;में परीक्षा के उपरांत&nbsp;
        <b>${esc(courseNameHindi)}</b> की प्रमाणपत्र के योग्य सिद्ध होने पर
      </div>
      <div style="font-size:${hindiNameFontSize};margin:4px 0 8px;">
        <b class="f-arya" style="vertical-align:baseline;">${esc(candidateNameHindi)}</b>
        <span class="f-kokila" style="font-size:22px;margin:0 5px;vertical-align:baseline;position:relative;top:-2px;">सुपुत्र/सुपुत्री</span>
        <b class="f-arya" style="vertical-align:baseline;">${esc(fatherNameHindi)}</b>
      </div>
      <div class="divider"></div>
      <div class="f-kokila" style="font-size:22px;">
        को ${esc(courseYearHindi)} के संगोष्ठी में उक्त प्रमाणपत्र प्रदान की गई ।
      </div>
    </div>

    <!-- ENGLISH BODY -->
    <div class="f-tahoma" style="text-align:center;line-height:1.45;margin-bottom:6px;margin-top:22px;font-size:15px;">
      <div>
        This is to certify that having been examined in&nbsp;
        <b>${esc(courseYearEnglish)}</b> and found qualified for the certificate in
      </div>
      <div><b>${esc(courseNameEnglish)}</b></div>
      <div style="font-size:15px;margin-bottom:4px;">
        <b>${esc(candidateNameEnglish)}</b> d/o/s/o <b>${esc(fatherNameEnglish)}</b>
      </div>
      <div class="divider"></div>
      <div>was awarded the said certificate at the conclave held in ${esc(courseYearEnglish)}.</div>
    </div>

    <!-- SECTION HEADING -->
    <div style="display:flex;justify-content:center;align-items:center;margin-bottom:6px;margin-top:32px;">
      <span class="f-kokila" style="font-size:22px;display:inline-block;height:28px;line-height:28px;white-space:nowrap;">पाठ्यक्रम और अंक विवरण</span>
      <span style="display:inline-block;height:28px;line-height:28px;margin:0 8px;font-size:15px;">✱</span>
      <span class="f-tahoma" style="font-size:15px;display:inline-block;height:28px;line-height:28px;white-space:nowrap;">Course and Marks Description</span>
    </div>

    <!-- DURATION & MODE -->
    <div style="text-align:left;margin-left:22px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;margin-bottom:4px;">
        <span class="f-kokila" style="font-size:22px;display:inline-block;height:28px;line-height:28px;white-space:nowrap;">पाठ्यक्रम की अवधि</span>
        <span class="f-tahoma" style="font-size:15px;display:inline-block;height:28px;line-height:28px;white-space:pre;"> / Duration of the Course: </span>
        <span class="f-kokila" style="font-size:22px;margin-left:15px;display:inline-block;height:28px;line-height:28px;white-space:nowrap;">${esc(durationHindi)}</span>
        <span class="f-tahoma" style="font-size:15px;display:inline-block;height:28px;line-height:28px;white-space:pre;"> / ${esc(durationEnglish)}</span>
      </div>
      <div style="display:flex;align-items:center;">
        <span class="f-kokila" style="font-size:22px;display:inline-block;height:28px;line-height:28px;white-space:nowrap;">शिक्षण विधि</span>
        <span class="f-tahoma" style="font-size:15px;display:inline-block;height:28px;line-height:28px;white-space:pre;"> / Mode of Teaching: </span>
        <span class="f-kokila" style="font-size:22px;margin-left:15px;display:inline-block;height:28px;line-height:28px;white-space:nowrap;">${esc(modeHindi)}</span>
        <span class="f-tahoma" style="font-size:15px;display:inline-block;height:28px;line-height:28px;white-space:pre;"> / ${esc(modeEnglish)}</span>
      </div>
    </div>

    <!-- MARKS TABLE -->
    <table class="marks-table">
      <colgroup>
        <col style="width:7%"  />
        <col style="width:27%" />
        <col style="width:16%" />
        <col style="width:14%" />
        <col style="width:15%" />
        <col style="width:21%" />
      </colgroup>
      <thead>
        <tr>
          <th>
            <div class="f-kokila" style="font-size:18px;">क्रमांक</div>
            <div class="f-tahoma" style="font-size:11px;">Sr. No.</div>
          </th>
          <th class="td-left">
            <div class="f-kokila" style="font-size:18px;">परीक्षा पत्र</div>
            <div class="f-tahoma" style="font-size:11px;">Papers</div>
          </th>
          <th>
            <div class="f-kokila" style="font-size:18px;">विषय कोड</div>
            <div class="f-tahoma" style="font-size:11px;">Sub. Code</div>
          </th>
          <th>
            <div class="f-kokila" style="font-size:18px;">पूर्णांक</div>
            <div class="f-tahoma" style="font-size:11px;">Total Marks</div>
          </th>
          <th>
            <div class="f-kokila" style="font-size:18px;">प्राप्तांक</div>
            <div class="f-tahoma" style="font-size:11px;">Obtained Marks</div>
          </th>
          <th>
            <div class="f-kokila" style="font-size:18px;">परिणाम का विवरण</div>
            <div class="f-tahoma" style="font-size:11px;">Details of Result</div>
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- Row 1: Internal Assessment -->
        <tr>
          <td style="font-size:11px;">1.</td>
          <td class="td-left">
            <div class="f-kokila" style="font-size:18px;">आंतरिक मूल्यांकन</div>
            <div class="f-tahoma" style="font-size:11px;">Internal Assessment</div>
          </td>
          <td style="font-size:11px;">${esc(iaSubCode)}</td>
          <td style="font-size:11px;">${esc(iaMaxMarks)}</td>
          <td style="font-size:11px;">${esc(iaMarks)}</td>
          <td rowspan="3" style="vertical-align:middle;">
            <div class="f-kokila" style="font-size:18px;">${esc(resultRemarkHindi)}</div>
            <div class="f-tahoma" style="font-size:11px;">${esc(resultRemarkEnglish)}</div>
          </td>
        </tr>
        <!-- Row 2: Main Examination -->
        <tr>
          <td style="font-size:11px;">2.</td>
          <td class="td-left">
            <div class="f-kokila" style="font-size:18px;">मुख्य परीक्षा</div>
            <div class="f-tahoma" style="font-size:10px;">Main Examination</div>
          </td>
          <td style="font-size:11px;">${esc(meSubCode)}</td>
          <td style="font-size:11px;">${esc(meMaxMarks)}</td>
          <td style="font-size:11px;">${esc(meMarks)}</td>
        </tr>
        <!-- Row 3: Total -->
        <tr>
          <td colspan="3" class="td-left" style="font-weight:bold;">
            <div class="f-kokila" style="font-size:20px;">योग:</div>
            <div class="f-tahoma" style="font-size:11px;">Total:</div>
          </td>
          <td style="font-size:11px;font-weight:bold;">${esc(maxMarks)}</td>
          <td style="font-size:11px;font-weight:bold;">${esc(marksTotal)}</td>
        </tr>
      </tbody>
    </table>

    <!-- FOOTER -->
    <div class="footer-row">

      <!-- Left: Controller of Examination -->
      <div class="footer-block">
        <div class="sig-holder">
          ${ctrlSigSrc ? `<img src="${ctrlSigSrc}" alt="Signature" />` : ''}
        </div>
        <hr class="hr-sig" />
        <div class="f-tahoma" style="font-size:11px;margin-top:4px;">
          ${esc(controllerSignatureLabel || 'Controller of Examination')}
        </div>
        <div class="f-oldeng" style="font-size:11px;margin-top:1px;">Varāhamihira Multidisciplinary Institute</div>
      </div>

      <!-- Centre: date + QR -->
      <div class="centre-footer">
        <div class="blue-box">
          <div class="f-kokila" style="font-size:18px;">दिल्ली, दिनांक ${esc(dateOfResultHindi)}</div>
          <div class="f-tahoma" style="font-size:11px;">Delhi, Dated the ${esc(dateOfResultEnglish)}</div>
        </div>
        <div class="qr-wrap">
          ${qrSvg
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="55" height="55" viewBox="0 0 ${qrSvg.match(/viewBox="([^"]+)"/)?.[1] || '0 0 37 37'}">${qrSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>`
            : ''}
        </div>
      </div>

      <!-- Right: Verifying Authority -->
      <div class="footer-block">
        <div class="sig-holder sig-holder-auth">
          ${authSigSrc ? `<img src="${authSigSrc}" alt="Signature" style="height:48px;object-fit:contain;" />` : ''}
        </div>
        <hr class="hr-sig" />
        <div class="f-tahoma" style="font-size:11px;margin-top:4px;">
          ${esc(authSignatureLabel || 'O.S.D. (Examination)')}
        </div>
        <div class="f-tahoma" style="font-size:11px;margin-top:1px;color:#444;">
          Asiatic Society for Social Science Research
        </div>
      </div>

    </div><!-- /footer-row -->
  </div><!-- /content-layer -->
</div><!-- /a4-shell -->
</body>
</html>`;
}

module.exports = { buildStudentCertificateHTML };
