// controllers/punchController.js
const asyncHandler = require("../middleware/asyncHandler");
const logger = require("../config/winston");
const PunchModel = require("../models/punchModel");
const { DateTime } = require("luxon");
const path = require("path");
const { deleteImage } = require("../config/fileStorage");

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
  // Now customerName is required
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
    return res
      .status(400)
      .json({
        status: "fail",
        message: "Invalid punchDate format. Use YYYY-MM-DD",
      });
  }

  // 3) Get photo filename if available (required for punch-in)
  const photoFilename = req.file ? req.file.filename : null;
  if (!photoFilename) {
    return res.status(400).json({
      status: "fail",
      message: "Photo is required for punch-in",
    });
  }

  // 4) Persist with required customer name
  const record = await PunchModel.createPunchIn({
    punchDate,
    punchInTime: dt.toISO(), // ISO string including time zone offset
    punchInLocation,
    photoFilename,
    clientId: req.user.client_id,
    customerName, // Now required
    username: req.user.id,
    status: "PENDING",
  });

  // Add photo URL to response
  if (photoFilename) {
    record.photoUrl = `/uploads/${photoFilename}`;
  }

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

  // 4) Get photo filename from upload middleware (optional for punch-out)
  const photoFilename = req.file ? req.file.filename : null;

  // 5) Persist with updated fields - no need to update customer_name as it's already set during punch-in
  const updated = await PunchModel.updatePunchOut({
    id,
    punchOutTime: outTime.toISO(),
    punchOutLocation,
    punchOutDate, // Add the punch-out date
    totalTimeSpent,
    status: "COMPLETED",
    photoFilename: photoFilename || existing.photo_filename,
  });

  // Add photo URL to response
  if (updated.photo_filename) {
    updated.photoUrl = `/uploads/${updated.photo_filename}`;
  }

  res.status(200).json({ status: "success", data: updated });
});

// New endpoint to get pending punches for current user
exports.getPendingPunches = asyncHandler(async (req, res) => {
  const username = req.user.id;
  const pendingPunches = await PunchModel.findPendingPunchesByUser(username);

  // Add photo URLs to responses
  pendingPunches.forEach((punch) => {
    if (punch.photo_filename) {
      punch.photoUrl = `/uploads/${punch.photo_filename}`;
    }
  });

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

  // Add photo URLs to responses
  completedPunches.forEach((punch) => {
    if (punch.photo_filename) {
      punch.photoUrl = `/uploads/${punch.photo_filename}`;
    }
  });

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

  // Add photo URLs to responses
  records.forEach((punch) => {
    if (punch.photo_filename) {
      punch.photoUrl = `/uploads/${punch.photo_filename}`;
    }
  });

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

  // Add photo URLs to responses
  records.forEach((punch) => {
    if (punch.photo_filename) {
      punch.photoUrl = `/uploads/${punch.photo_filename}`;
    }
  });

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

  // Add photo URL to response
  if (punch.photo_filename) {
    punch.photoUrl = `/uploads/${punch.photo_filename}`;
  }

  res.status(200).json({
    status: "success",
    data: punch,
  });
});
