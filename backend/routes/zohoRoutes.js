const express = require('express');
const router = express.Router();
const Result = require('../models/Result');

// POST /api/zoho/webhook
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    console.log("💳 Zoho Webhook Received:", JSON.stringify(payload, null, 2));

    // Zoho usually sends event type or status. Adjust this if their payload differs!
    if (payload.event_type === 'payment_success' || payload.status === 'success') {
      
      // We mapped Result._id to "reference_id" in our API call
      // Depending on Zoho's response, it could be payload.reference_id or payload.data.reference_id
      const resultId = payload.reference_id || (payload.data && payload.data.reference_id);

      if (resultId) {
        await Result.findByIdAndUpdate(resultId, {
          paymentStatus: 'paid',
          lastPaidAt: new Date()
        });
        console.log(`✅ Successfully unlocked certificate for Result ID: ${resultId}`);
      } else {
        console.warn("⚠️ Webhook received but no Result ID found in payload!");
      }
    }

    // Always return 200 OK
    res.status(200).send("Webhook processed successfully");
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
