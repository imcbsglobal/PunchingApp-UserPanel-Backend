//middleware/errorHandler.js
const logger = require("../config/winston");
module.exports = (err, req, res, next) => {
  logger.error(err);
  res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
};
