const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const {
    getSetupStatus,
    login,
    sendOtp,
    verifyOtp,
    setPassword,
    logout,
    getMe
} = require("../controllers/authController");

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

// Rate limiter for OTP requests to prevent spamming email delivery
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 6, // limit each IP to 6 OTP requests per 15 minutes
    message: {
        success: false,
        message: "Too many OTP requests. Please wait a few minutes before trying again."
    },
    standardHeaders: true,
    legacyHeaders: false
});

router.get("/setup-status", getSetupStatus);
router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/set-password", setPassword);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", getMe);

module.exports = router;
