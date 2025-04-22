// routes/punchRoutes.js
const express = require("express");
const {
  getCustomers,
  punchIn,
  punchOut,
} = require("../controllers/punchController");
const { protect } = require("../middleware/auth");
const router = express.Router();

router.use(protect);

router.get("/customers", getCustomers); // for dropdown
router.post("/punch-in", punchIn); // record in
router.post("/punch-out", punchOut); // record out

module.exports = router;
