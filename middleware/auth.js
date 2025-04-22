// middleware/auth.js
const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check for Authorization header
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ status: "fail", message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, client_id }
    next();
  } catch (err) {
    return res.status(401).json({ status: "fail", message: "Token invalid" });
  }
};

module.exports = { protect };
