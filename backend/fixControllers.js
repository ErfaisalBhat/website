const fs = require('fs');

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // Reverse the bad replacement
  content = content.replace(/if \(req\.app\.get\('io'\)\) req\.app\.get\('io'\)\.emit\('data_updated'\);\n\s*res\.json\(\{ message: /g, "res.json({ message: ");
  content = content.replace(/if \(req\.app\.get\('io'\)\) req\.app\.get\('io'\)\.emit\('data_updated'\);\n\s*res\.json\(\{ _id:/g, "res.json({ _id:");
  content = content.replace(/if \(req\.app\.get\('io'\)\) req\.app\.get\('io'\)\.emit\('data_updated'\);\n\s*res\.status\(201\)\.json\(\{/g, "res.status(201).json({");

  // Fix the invalid return statement
  content = content.replace(/return if \(req\.app\.get\('io'\)\) req\.app\.get\('io'\)\.emit\('data_updated'\);\n\s*/g, "return ");

  fs.writeFileSync(file, content);
};

fixFile('C:/Users/bhati/Desktop/web/website/website/backend/controllers/adminController.js');
fixFile('C:/Users/bhati/Desktop/web/website/website/backend/controllers/teacherController.js');
console.log("Files Fixed");
