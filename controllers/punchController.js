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
  // No need for photo field here since we'll handle it separately
  const { customerName, punchInLocation, punchInTime } = req.body;
  if (!punchInLocation || !punchInTime) {
    return res.status(400).json({
      status: "fail",
      message: "Provide punchInLocation and punchInTime",
    });
  }

  // 1) Validate incoming time
  const dt = DateTime.fromISO(punchInTime, { zone: "Asia/Kolkata" });
  if (!dt.isValid) {
    return res
      .status(400)
      .json({ status: "fail", message: "Invalid punchInTime format" });
  }

  // 2) Derive punchDate (yyyy‑MM‑dd) in IST
  const punchDate = dt.toISODate(); // e.g. "2025-04-22"

  // 3) Get photo filename if available (if user uploads during punch-in)
  const photoFilename = req.file ? req.file.filename : null;

  // 4) Persist - now includes username from req.user
  const record = await PunchModel.createPunchIn({
    punchDate,
    punchInTime: dt.toISO(), // ISO string including time zone offset
    punchInLocation,
    photoFilename: photoFilename, // Store filename instead of binary data
    clientId: req.user.client_id,
    customerName: customerName || null, // Allow customerName to be added later
    username: req.user.id, // Add username from auth token
    status: "PENDING", // Set initial status as PENDING
  });

  // Add photo URL to response
  if (photoFilename) {
    record.photoUrl = `/uploads/${photoFilename}`;
  }

  res.status(201).json({ status: "success", data: record });
});

exports.punchOut = asyncHandler(async (req, res) => {
  const { id, customerName, punchOutLocation, punchOutTime } = req.body;
  if (!id || !punchOutLocation || !punchOutTime || !customerName) {
    return res.status(400).json({
      status: "fail",
      message: "Provide id, punchOutLocation, customerName and punchOutTime",
    });
  }

  // 1) Fetch existing record
  const existing = await PunchModel.findPunchById(id);
  if (!existing) {
    return res
      .status(404)
      .json({ status: "fail", message: "Record not found" });
  }

  // Verify this punch record belongs to current user (if username field exists)
  if (existing.username && existing.username !== req.user.id) {
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
      .json({ status: "fail", message: "Punch‑out must be after punch‑in" });
  }
  const totalTimeSpent = Math.floor(diffSeconds);

  // 4) Get photo filename from upload middleware
  const photoFilename = req.file ? req.file.filename : null;

  // 5) Persist with updated fields
  const updated = await PunchModel.updatePunchOut({
    id,
    punchOutTime: outTime.toISO(),
    punchOutLocation,
    totalTimeSpent,
    status: "COMPLETED",
    customerName: customerName || existing.customer_name,
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

// Optional: Add endpoint to get completed punches for current user
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
