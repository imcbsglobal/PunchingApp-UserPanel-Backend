// controllers/authController.js
const asyncHandler = require("../middleware/asyncHandler");
const UserModel = require("../models/userModel");
const { generateToken } = require("../services/tokenService");

exports.login = asyncHandler(async (req, res) => {
  const { id, password, client_id } = req.body;

  // 1) Require client_id in the payload
  if (!id || !password || !client_id) {
    return res
      .status(400)
      .json({ status: "fail", message: "Provide id, password and client_id" });
  }

  // 2) Fetch by id
  const user = await UserModel.findById(id);
  if (!user) {
    return res
      .status(401)
      .json({ status: "fail", message: "Invalid credentials" });
  }

  // 3) Check both password AND client_id match
  if (user.password !== password || user.client_id !== client_id) {
    return res
      .status(401)
      .json({ status: "fail", message: "Invalid credentials" });
  }

  // 4) Issue JWT with both user.id and user.client_id
  const token = generateToken({ id: user.id, client_id: user.client_id });

  res.status(200).json({
    status: "success",
    token,
    data: { id: user.id, client_id: user.client_id },
  });
});
