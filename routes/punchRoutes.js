// routes/punchRoutes.js
const express = require("express");
const {
  getCustomers,
  punchIn,
  punchOut,
  getPendingPunches,
  getCompletedPunches,
} = require("../controllers/punchController");
const { protect } = require("../middleware/auth");
const { upload } = require("../config/fileStorage"); // Import the upload middleware
const router = express.Router();

router.use(protect);

router.get("/customers", getCustomers); // for dropdown

// Add upload.single('photo') middleware to handle photo uploads
router.post("/punch-in", upload.single("photo"), punchIn); // record in
router.post("/punch-out", upload.single("photo"), punchOut); // record out

router.get("/pending", getPendingPunches);
router.get("/completed", getCompletedPunches);

// // Add to your routes for testing only - REMOVE in production
// router.get("/test-cleanup", async (req, res) => {
//   const { testCleanup } = require("../config/fileStorage");
//   await testCleanup();
//   res.send("Cleanup test executed");
// });

module.exports = router;
