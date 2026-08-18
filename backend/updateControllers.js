const fs = require('fs');

const modifyFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // We find specific functions and add emit before they send successful response
  const endpoints = [
    'uploadStudents', 'assignBatch', 'deleteApprovedBatch', 'approveBatch', 
    'disapproveBatch', 'addTeacher', 'removeTeacher', 'changeTeacherPassword', 
    'deleteDraftBatch', 'updateBatchResults', 'uploadStudentPhoto',
    'saveProgress', 'submitBatch'
  ];

  endpoints.forEach(ep => {
    const startIndex = content.indexOf(`const ${ep} = async (req, res) => {`);
    if (startIndex !== -1) {
      const catchIndex = content.indexOf('} catch (error) {', startIndex);
      if (catchIndex !== -1) {
        // Find the last res.json or res.status().json before catchIndex
        const segment = content.substring(startIndex, catchIndex);
        let updatedSegment = segment.replace(/res\.status\(\d+\)\.json\(\{/g, "if (req.app.get('io')) req.app.get('io').emit('data_updated');\n    res.status(201).json({");
        
        // Only replace the res.json that is not inside an error condition (usually 400 or 404).
        // Actually, let's just insert it before 'res.json({ message:' or similar success messages.
        updatedSegment = updatedSegment.replace(/res\.json\(\{ message: /g, "if (req.app.get('io')) req.app.get('io').emit('data_updated');\n    res.json({ message: ");
        updatedSegment = updatedSegment.replace(/res\.json\(\{ _id:/g, "if (req.app.get('io')) req.app.get('io').emit('data_updated');\n    res.json({ _id:");
        
        content = content.substring(0, startIndex) + updatedSegment + content.substring(catchIndex);
      }
    }
  });

  fs.writeFileSync(file, content);
};

modifyFile('C:/Users/bhati/Desktop/web/website/website/backend/controllers/adminController.js');
modifyFile('C:/Users/bhati/Desktop/web/website/website/backend/controllers/teacherController.js');
console.log("Controllers Updated");
