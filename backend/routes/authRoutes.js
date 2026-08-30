const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { login, logout, getMe } = require("../controllers/authController");

// Rate limiter for login endpoint to prevent brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // limit each IP to 15 login requests per windowMs
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false
});

router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", getMe);

module.exports = router;
