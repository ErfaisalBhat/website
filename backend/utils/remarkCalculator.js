// Computes the bilingual result remark from IA/ME marks and their max marks.
// Rules:
//  - Missing/absent marks (null or undefined) -> Fail (E.R.)
//  - Either component below 40% -> Fail (E.R.)
//  - Otherwise, overall percentage determines the pass tier.
const computeRemark = (iaMarks, iaMaxMarks, meMarks, meMaxMarks) => {
  const FAIL = { english: 'E.R.', hindi: 'अनुत्तीर्ण' };

  if (iaMarks === null || iaMarks === undefined || iaMarks === '' ||
      meMarks === null || meMarks === undefined || meMarks === '') {
    return FAIL;
  }

  const ia = parseFloat(iaMarks);
  const me = parseFloat(meMarks);
  const iaMax = parseFloat(iaMaxMarks) || 0;
  const meMax = parseFloat(meMaxMarks) || 0;

  if (isNaN(ia) || isNaN(me)) return FAIL;

  const iaPercent = iaMax > 0 ? (ia / iaMax) * 100 : 0;
  const mePercent = meMax > 0 ? (me / meMax) * 100 : 0;

  if (iaPercent < 40 || mePercent < 40) return FAIL;

  const totalMax = iaMax + meMax;
  const overallPercent = totalMax > 0 ? ((ia + me) / totalMax) * 100 : 0;

  if (overallPercent >= 75) {
    return { english: 'Passed, Distinction', hindi: 'उत्तीर्ण, विशिष्टता' };
  }
  if (overallPercent >= 60) {
    return { english: 'Passed, First Division', hindi: 'उत्तीर्ण, प्रथम श्रेणी' };
  }
  if (overallPercent >= 55) {
    return { english: 'Passed, Second Division', hindi: 'उत्तीर्ण, द्वितीय श्रेणी' };
  }
  if (overallPercent >= 40) {
    return { english: 'Passed', hindi: 'उत्तीर्ण' };
  }
  return FAIL;
};

module.exports = { computeRemark };