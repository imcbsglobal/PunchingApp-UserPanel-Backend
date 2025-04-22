//controllers/authController.js
const asyncHandler = require("../middleware/asyncHandler");
const UserModel = require("../models/userModel");
const { generateToken } = require("../services/tokenService");

exports.login = asyncHandler(async (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) {
    return res
      .status(400)
      .json({ status: "fail", message: "Provide id + password" });
  }

  const user = await UserModel.findById(id);
  if (!user || user.password !== password) {
    return res
      .status(401)
      .json({ status: "fail", message: "Invalid credentials" });
  }

  // Issue JWT with both user.id and user.client_id
  const token = generateToken({ id: user.id, client_id: user.client_id });

  res.status(200).json({
    status: "success",
    token,
    data: { id: user.id, client_id: user.client_id },
  });
});
