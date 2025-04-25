// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path"); // Add this import
const authRoutes = require("./routes/authRoutes");
const punchRoutes = require("./routes/punchRoutes");
const errorHandler = require("./middleware/errorHandler");
const { setupCleanupJob } = require("./config/fileStorage"); // Add this import

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: "https://peekayadmin.imcbs.com",
    credentials: true, // Only if your frontend needs to send credentials (cookies/auth headers)
  })
);
app.use(express.json());

// Health route
app.get("/health", (req, res) => {
  res.send("🚀 IMC Punching System API is up and running!");
});

// auth and punch endpoints
app.use("/api/auth", authRoutes);
app.use("/api/punch", punchRoutes);

// Add static route to serve images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Start the image cleanup job
setupCleanupJob();

app.use(errorHandler);

module.exports = app;
