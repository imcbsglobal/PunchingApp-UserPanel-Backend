//services/tokenService.js
const jwt = require("jsonwebtoken");
exports.generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
