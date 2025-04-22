// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const punchRoutes = require("./routes/punchRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(helmet(), cors(), express.json());

// Health route
app.get("/health", (req, res) => {
  res.send("🚀 IMC Punching System API is up and running!");
});

// auth and punch endpoints
app.use("/api/auth", authRoutes);
app.use("/api/punch", punchRoutes);

app.use(errorHandler);

module.exports = app;
