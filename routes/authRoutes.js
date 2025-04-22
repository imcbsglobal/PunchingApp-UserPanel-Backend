//route/authRoutes.js
const express = require("express");
const router = express.Router();
const { login } = require("../controllers/authController");

router.post("/login", login);

module.exports = router;
// This code sets up an Express router for handling authentication routes. It imports the necessary modules, defines a POST route for user login, and exports the router for use in other parts of the application.
