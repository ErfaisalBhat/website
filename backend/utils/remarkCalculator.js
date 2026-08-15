// Computes the bilingual result remark from IA/ME marks and their max marks.
// Rules (Item 7):
//  - AB (Absent) in either component -> Fail (E.R.)
//  - Missing/null/empty marks -> Fail (E.R.)
//  - Either component below 40% -> Fail (E.R.)
//  - Both above 40% -> overall percentage determines pass tier
const computeRemark = (iaMarks, iaMaxMarks, meMarks, meMaxMarks) => {
  const FAIL = { english: 'E.R.', hindi: 'अनुत्तीर्ण' };

  const isAB = (v) => v !== null && v !== undefined && v.toString().trim().toUpperCase() === 'AB';
  const iaIsAB = isAB(iaMarks);
  const meIsAB = isAB(meMarks);

  if (iaIsAB && meIsAB) return { english: 'AB', hindi: 'अनुत्तीर्ण' };
  if (iaIsAB || meIsAB) return FAIL;

  // Missing / empty marks = fail
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

  // Below 40% in any component = fail
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