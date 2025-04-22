//config/db.js
const { createLogger, format, transports } = require("winston");
module.exports = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/combined.log" }),
  ],
});
// This code creates a logger using the winston library. It logs messages to the console and to files, with different log levels and formats.
