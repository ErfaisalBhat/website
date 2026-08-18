const fs = require('fs');
const file = 'C:/Users/bhati/Desktop/web/website/website/backend/controllers/adminController.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/res\.json\(\{/g, "if (req.app.get('io')) req.app.get('io').emit('data_updated');\n    res.json({");
content = content.replace(/res\.status\(201\)\.json\(\{/g, "if (req.app.get('io')) req.app.get('io').emit('data_updated');\n    res.status(201).json({");

fs.writeFileSync(file, content);
console.log("Admin Controller Updated");
