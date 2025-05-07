// controllers/punchController.js
const asyncHandler = require("../middleware/asyncHandler");
const logger = require("../config/winston");
const PunchModel = require("../models/punchModel");
const { DateTime } = require("luxon");
const { deleteCloudinaryImage } = require("../config/cloudinary");

exports.getCustomers = asyncHandler(async (req, res) => {
  const clientId = req.user.client_id;
  const customers = await PunchModel.findCustomers(clientId);
  res.status(200).json({
    status: "success",
    results: customers.length,
    data: customers, // [{ name: 'Cust A' }, …]
  });
});

exports.punchIn = asyncHandler(async (req, res) => {
  const { customerName, punchInLocation, punchInTime, punchDate } = req.body;

  if (!customerName || !punchInLocation || !punchInTime || !punchDate) {
    return res.status(400).json({
      status: "fail",
      message:
        "Provide customerName, punchInLocation, punchInTime, and punchDate",
    });
  }

  // 1) Validate incoming time
  const dt = DateTime.fromISO(punchInTime, { zone: "Asia/Kolkata" });
  if (!dt.isValid) {
    return res
      .status(400)
      .json({ status: "fail", message: "Invalid punchInTime format" });
  }

  // 2) Use punchDate from frontend, but validate it
  const dateParts = punchDate.split("-");
  if (dateParts.length !== 3 || !/^\d{4}-\d{2}-\d{2}$/.test(punchDate)) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid punchDate format. Use YYYY-MM-DD",
    });
  }

  // 3) Check for uploaded image (using Cloudinary)
  if (!req.file) {
    return res.status(400).json({
      status: "fail",
      message: "Photo is required for punch-in",
    });
  }

  // Get the Cloudinary URL and public ID
  const imageUrl = req.file.path; // Cloudinary URL from multer-storage-cloudinary
  const publicId = req.file.filename; // Cloudinary public ID

  // 4) Persist with required customer name
  const record = await PunchModel.createPunchIn({
    punchDate,
    punchInTime: dt.toISO(), // ISO string including time zone offset
    punchInLocation,
    photoFilename: publicId, // Store public ID
    photoUrl: imageUrl, // Store full URL
    clientId: req.user.client_id,
    customerName,
    username: req.user.id,
    status: "PENDING",
  });

  res.status(201).json({ status: "success", data: record });
});

exports.punchOut = asyncHandler(async (req, res) => {
  const { id, punchOutLocation, punchOutTime, punchOutDate } = req.body;

  if (!id || !punchOutLocation || !punchOutTime || !punchOutDate) {
    return res.status(400).json({
      status: "fail",
      message: "Provide id, punchOutLocation, punchOutTime, and punchOutDate",
    });
  }

  // 1) Fetch existing record
  const existing = await PunchModel.findPunchById(id);
  if (!existing) {
    return res
      .status(404)
      .json({ status: "fail", message: "Record not found" });
  }

  // Verify this punch record belongs to current user
  if (existing.username !== req.user.id) {
    return res.status(403).json({
      status: "fail",
      message: "Not authorized to update this punch record",
    });
  }

  // 2) Parse the times differently based on type
  let inTime;
  if (
    typeof existing.punch_in_time === "object" &&
    existing.punch_in_time instanceof Date
  ) {
    // If it's already a JavaScript Date object
    inTime = DateTime.fromJSDate(existing.punch_in_time);
  } else {
    // If it's a string
    inTime = DateTime.fromISO(existing.punch_in_time);
  }

  const outTime = DateTime.fromISO(punchOutTime);

  if (!inTime.isValid || !outTime.isValid) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid punchInTime or punchOutTime format",
    });
  }

  // 3) Compare times in the same timezone system
  const diffSeconds = outTime.diff(inTime, "seconds").seconds;
  if (diffSeconds < 0) {
    return res
      .status(400)
      .json({ status: "fail", message: "Punch-out must be after punch-in" });
  }
  const totalTimeSpent = Math.floor(diffSeconds);

  // 4) Handle photo upload (optional for punch-out)
  let photoPublicId = existing.photo_filename;
  let photoUrl = existing.photo_url;

  if (req.file) {
    // If a new photo is uploaded, delete the old one if it exists
    if (existing.photo_filename) {
      try {
        await deleteCloudinaryImage(existing.photo_filename);
      } catch (err) {
        logger.error(`Failed to delete old image: ${err.message}`);
        // Continue anyway - don't fail the request if image deletion fails
      }
    }

    // Update with new Cloudinary info
    photoPublicId = req.file.filename;
    photoUrl = req.file.path;
  }

  // 5) Persist with updated fields
  const updated = await PunchModel.updatePunchOut({
    id,
    punchOutTime: outTime.toISO(),
    punchOutLocation,
    punchOutDate,
    totalTimeSpent,
    status: "COMPLETED",
    photoFilename: photoPublicId,
    photoUrl: photoUrl,
  });

  res.status(200).json({ status: "success", data: updated });
});

// New endpoint to get pending punches for current user
exports.getPendingPunches = asyncHandler(async (req, res) => {
  const username = req.user.id;
  const pendingPunches = await PunchModel.findPendingPunchesByUser(username);
  res.status(200).json({
    status: "success",
    results: pendingPunches.length,
    data: pendingPunches,
  });
});

// Get completed punches for current user
exports.getCompletedPunches = asyncHandler(async (req, res) => {
  const username = req.user.id;
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;

  const completedPunches = await PunchModel.findCompletedPunchesByUser(
    username,
    limit
  );

  res.status(200).json({
    status: "success",
    results: completedPunches.length,
    data: completedPunches,
  });
});

// Get all punch records for a specific date (for admin dashboard)
exports.getPunchesByDate = asyncHandler(async (req, res) => {
  // Check if user has admin privileges
  if (!req.user.is_admin) {
    return res.status(403).json({
      status: "fail",
      message: "Only admins can access all records by date",
    });
  }

  const { date } = req.params;
  const clientId = req.user.client_id;

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid date format. Use YYYY-MM-DD",
    });
  }

  // Get records for the specific date
  const records = await PunchModel.findPunchesByDate(date, clientId);

  res.status(200).json({
    status: "success",
    results: records.length,
    data: records,
  });
});

// Get recent punch records (last 5 days) for admin dashboard
exports.getRecentPunches = asyncHandler(async (req, res) => {
  // Check if user has admin privileges
  if (!req.user.is_admin) {
    return res.status(403).json({
      status: "fail",
      message: "Only admins can access recent records",
    });
  }

  const clientId = req.user.client_id;
  const days = req.query.days ? parseInt(req.query.days) : 5; // Default to 5 days

  // Get recent records
  const records = await PunchModel.findRecentPunches(days, clientId);

  res.status(200).json({
    status: "success",
    results: records.length,
    data: records,
  });
});

// Add a new endpoint to get a specific punch record by ID
exports.getPunchById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const username = req.user.id;

  const punch = await PunchModel.findPunchById(id);

  if (!punch) {
    return res.status(404).json({
      status: "fail",
      message: "Punch record not found",
    });
  }

  // Verify this punch record belongs to current user
  if (punch.username !== username) {
    return res.status(403).json({
      status: "fail",
      message: "Not authorized to access this punch record",
    });
  }

  res.status(200).json({
    status: "success",
    data: punch,
  });
});
