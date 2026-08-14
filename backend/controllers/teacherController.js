const Result = require('../models/Result');
const { computeRemark } = require('../utils/remarkCalculator');

// Get all batches assigned to teacher
const getAssignedBatches = async (req, res) => {
  try {
    const batches = await Result.aggregate([
      { 
        $match: { 
          uploadedBy: req.user._id 
        } 
      },
      {
        $group: {
          _id: '$batchId',
          batchName: { $first: '$batchName' },
          subject: { $first: '$subject' },
          status: { $first: '$status' },
          createdAt: { $first: '$createdAt' },
          studentCount: { $sum: 1 }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assigned batches', error: error.message });
  }
};

const getBatchResults = async (req, res) => {
  try {
    const { batchId } = req.params;
    // Sort results by rollNo naturally (numerically)
    const results = await Result.find({ batchId, uploadedBy: req.user._id })
                                .populate('student', 'name email')
                                .collation({ locale: "en_US", numericOrdering: true })
                                .sort({ rollNo: 1 });
    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching results', error: error.message });
  }
};

// Save progress — teacher can only submit marks; remarks are auto-computed here.
const saveProgress = async (req, res) => {
  try {
    const { results } = req.body; // Array of { resultId, iaMarks, meMarks }

    await Promise.all(results.map(async (item) => {
      const existing = await Result.findById(item.resultId);
      if (!existing) return;

      // Treat 'AB' (absent) as 0 for total calculation only
      const isAB = (v) => v !== null && v !== undefined && v.toString().trim().toUpperCase() === 'AB';
      const iaNum = isAB(item.iaMarks) ? 0 : (parseFloat(item.iaMarks) || 0);
      const meNum = isAB(item.meMarks) ? 0 : (parseFloat(item.meMarks) || 0);
      const marksTotal = iaNum + meNum;

      // Backend always computes the remark — teacher cannot override
      const remark = computeRemark(item.iaMarks, existing.iaMaxMarks, item.meMarks, existing.meMaxMarks);

      return Result.findByIdAndUpdate(item.resultId, {
        iaMarks: item.iaMarks,
        meMarks: item.meMarks,
        marksTotal,
        resultRemarkEnglish: remark.english,
        resultRemarkHindi: remark.hindi
      });
    }));

    res.json({ message: 'Progress saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving progress', error: error.message });
  }
};

// Submit batch -> status "pending"
const submitBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    await Result.updateMany(
      { batchId, uploadedBy: req.user._id },
      { status: 'pending', submittedAt: new Date() }
    );
    res.json({ message: 'Batch submitted for approval' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting batch', error: error.message });
  }
};

const getDistinctAcademicYears = async (req, res) => {
  try {
    const years = await Result.distinct('academicYear');
    res.json(years);
  } catch (error) {
    console.error('Error getting academic years:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const searchByAcademicYear = async (req, res) => { 
  const { academicYear } = req.body;
  if (!academicYear) return res.status(400).json({ message: 'Academic Year is required' });

  try {
    const results = await Result.aggregate([
      { $match: { academicYear } },
      {
        $group: {
          _id: {
            semester: "$semester",
            subjectCode: "$subjectCode",
            examFlag: "$examFlag",
            part: "$part",
            courseName: "$courseName",
            academicYear: "$academicYear"
          }
        }
      },
      {
        $project: {
          _id: 0,
          semester: "$_id.semester",
          subjectCode: "$_id.subjectCode",
          examFlag: "$_id.examFlag",
          part: "$_id.part",
          courseName: "$_id.courseName",
          academicYear: "$_id.academicYear"
        }
      }
    ]);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  getAssignedBatches,
  getBatchResults,
  saveProgress,
  submitBatch,
  getDistinctAcademicYears,
  searchByAcademicYear
};
