// controllers/punchController.js
const asyncHandler = require("../middleware/asyncHandler");
const logger = require("../config/winston");
const PunchModel = require("../models/punchModel");
const { DateTime } = require("luxon");

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
  const { customerName, photo, punchInLocation, punchInTime } = req.body;
  if (!customerName || !photo || !punchInLocation || !punchInTime) {
    return res.status(400).json({
      status: "fail",
      message: "Provide customerName, photo, punchInLocation and punchInTime",
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

  // 3) Persist
  const record = await PunchModel.createPunchIn({
    punchDate,
    punchInTime: dt.toISO(), // ISO string including time zone offset
    punchInLocation,
    photo,
    clientId: req.user.client_id,
    customerName,
  });

  res.status(201).json({ status: "success", data: record });
});

exports.punchOut = asyncHandler(async (req, res) => {
  const { id, punchOutLocation, punchOutTime } = req.body;
  if (!id || !punchOutLocation || !punchOutTime) {
    return res.status(400).json({
      status: "fail",
      message: "Provide id, punchOutLocation and punchOutTime",
    });
  }

  // 1) Fetch existing record
  const existing = await PunchModel.findPunchById(id);
  if (!existing) {
    return res
      .status(404)
      .json({ status: "fail", message: "Record not found" });
  }

  console.log("Raw punch_in_time from DB:", existing.punch_in_time);
  console.log("Type:", typeof existing.punch_in_time);

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

  //   console.log("🕒 inTime parsed =", inTime.toString());
  //   console.log("🕒 outTime parsed =", outTime.toString());

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

  // 4) Persist
  const updated = await PunchModel.updatePunchOut({
    id,
    punchOutTime: outTime.toISO(),
    punchOutLocation,
    totalTimeSpent,
  });

  res.status(200).json({ status: "success", data: updated });
});
