const xlsx = require('xlsx');

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet([
  ['Date'],
  [35195] // May 10, 1996 in Excel format
]);
ws['A2'].z = 'm/d/yyyy';
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

const readWb = xlsx.read(buffer); // No cellDates: true
const readWs = readWb.Sheets[readWb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(readWs, { header: 1 });

const rawDate = data[1][0];
console.log('Raw Date from sheet_to_json:', rawDate, typeof rawDate);

const tryParseDate = (dateVal) => {
  if (typeof dateVal === 'number') {
    const date = new Date(Math.round((dateVal - 25569) * 864e5));
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
console.log('My parser result:', tryParseDate(rawDate));

const dataFormatted = xlsx.utils.sheet_to_json(readWs, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
console.log('Formatted by sheet_to_json:', dataFormatted[1][0]);
