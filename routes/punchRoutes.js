// routes/punchRoutes.js
const express = require("express");
const {
  getCustomers,
  punchIn,
  punchOut,
  getPendingPunches,
  getCompletedPunches,
  getPunchById,
  getPunchesByDate,
  getRecentPunches,
} = require("../controllers/punchController");
const { protect } = require("../middleware/auth");
const { uploadToCloudinary } = require("../config/cloudinary");

const router = express.Router();

router.use(protect);

// For customer dropdown
router.get("/customers", getCustomers);

// Punch-in with required photo and customer data
router.post("/punch-in", uploadToCloudinary.single("photo"), punchIn);

// Punch-out with optional photo
router.post("/punch-out", uploadToCloudinary.single("photo"), punchOut);

// Get pending and completed punches for current user
router.get("/pending", getPendingPunches);
router.get("/completed", getCompletedPunches);

// Admin dashboard routes for viewing all records
router.get("/date/:date", getPunchesByDate); // Get punches for specific date
router.get("/recent", getRecentPunches); // Get recent punches (default 5 days)

// Get specific punch by ID (must be last to not conflict with other routes)
router.get("/:id", getPunchById);

module.exports = router;
