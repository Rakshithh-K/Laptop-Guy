const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Admin = require("../models/Admin");
const { sendOtpEmail } = require("../services/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "laptopguy_jwt_secret_key_98374928374";
const ALLOWED_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "laptopguysales@gmail.com").trim().toLowerCase();

// Determine if we should use secure cross-origin cookies for Render production deployment
const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
};

// Helper to find or initialize the single Admin document in MongoDB
const getOrCreateAdmin = async () => {
    let admin = await Admin.findOne({ email: ALLOWED_ADMIN_EMAIL });
    if (!admin) {
        admin = await Admin.create({
            email: ALLOWED_ADMIN_EMAIL,
            passwordHash: null
        });
    }
    return admin;
};

// @desc    Check whether the admin password has been configured
// @route   GET /api/auth/setup-status
const getSetupStatus = async (req, res, next) => {
    try {
        const admin = await getOrCreateAdmin();
        const isConfigured = Boolean(admin.passwordHash);

        res.status(200).json({
            success: true,
            isConfigured,
            allowedEmail: ALLOWED_ADMIN_EMAIL
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin password login
// @route   POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const inputEmail = email.trim().toLowerCase();

        // Enforce strict single-admin email restriction
        if (inputEmail !== ALLOWED_ADMIN_EMAIL) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const admin = await getOrCreateAdmin();

        if (!admin.passwordHash) {
            return res.status(400).json({
                success: false,
                needsSetup: true,
                message: "Admin password has not been set yet. Please set your password first."
            });
        }

        // Verify password against stored bcrypt hash
        const isMatch = await bcrypt.compare(password, admin.passwordHash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { email: ALLOWED_ADMIN_EMAIL },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Set secure HTTP-only cookie
        res.cookie("token", token, getCookieOptions());

        res.status(200).json({
            success: true,
            message: "Login successful",
            email: ALLOWED_ADMIN_EMAIL,
            token
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate and send a 6-digit OTP to the admin email
// @route   POST /api/auth/send-otp
const sendOtp = async (req, res, next) => {
    try {
        const { email, purpose } = req.body;

        if (!email || typeof email !== "string") {
            return res.status(400).json({
                success: false,
                message: "Email address is required."
            });
        }

        const inputEmail = email.trim().toLowerCase();

        // Strict rejection of non-admin emails
        if (inputEmail !== ALLOWED_ADMIN_EMAIL) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized email address. Only the authorized administrator email can receive verification codes."
            });
        }

        const admin = await getOrCreateAdmin();

        // Rate limit: 60-second cooldown between resend requests
        if (admin.otpLastSentAt) {
            const timeSinceLastOtp = Date.now() - new Date(admin.otpLastSentAt).getTime();
            if (timeSinceLastOtp < 60 * 1000) {
                const waitSeconds = Math.ceil((60 * 1000 - timeSinceLastOtp) / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${waitSeconds} seconds before requesting another code.`
                });
            }
        }

        // Generate cryptographically secure 6-digit numeric OTP
        const otpNumber = crypto.randomInt(100000, 1000000).toString();

        // Hash the OTP with bcrypt before storing
        const otpHash = await bcrypt.hash(otpNumber, 10);
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        admin.otpHash = otpHash;
        admin.otpExpiresAt = otpExpiresAt;
        admin.otpAttempts = 0;
        admin.otpLastSentAt = new Date();
        admin.resetToken = null;
        admin.resetTokenExpiresAt = null;
        await admin.save();

        // Send email via Brevo
        await sendOtpEmail({
            to: ALLOWED_ADMIN_EMAIL,
            otp: otpNumber,
            purpose: purpose || (admin.passwordHash ? "RESET" : "SETUP")
        });

        res.status(200).json({
            success: true,
            message: `A 6-digit verification code has been sent to ${ALLOWED_ADMIN_EMAIL}.`,
            expiresInSeconds: 300
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify submitted OTP and issue a reset/setup session token
// @route   POST /api/auth/verify-otp
const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP code are required."
            });
        }

        const inputEmail = email.trim().toLowerCase();
        if (inputEmail !== ALLOWED_ADMIN_EMAIL) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized email address."
            });
        }

        const admin = await getOrCreateAdmin();

        if (!admin.otpHash || !admin.otpExpiresAt) {
            return res.status(400).json({
                success: false,
                message: "No active verification code found. Please request a new OTP."
            });
        }

        // Check expiration
        if (new Date() > new Date(admin.otpExpiresAt)) {
            admin.otpHash = null;
            admin.otpExpiresAt = null;
            await admin.save();
            return res.status(400).json({
                success: false,
                message: "The verification code has expired. Please request a new OTP."
            });
        }

        // Check attempts limit (max 5)
        if (admin.otpAttempts >= 5) {
            admin.otpHash = null;
            admin.otpExpiresAt = null;
            await admin.save();
            return res.status(400).json({
                success: false,
                message: "Too many failed attempts. The code has been invalidated. Please request a new OTP."
            });
        }

        const inputOtp = otp.toString().trim();
        const isMatch = await bcrypt.compare(inputOtp, admin.otpHash);

        if (!isMatch) {
            admin.otpAttempts += 1;
            await admin.save();
            const remainingAttempts = 5 - admin.otpAttempts;
            return res.status(400).json({
                success: false,
                message: remainingAttempts > 0
                    ? `Invalid verification code. ${remainingAttempts} attempts remaining.`
                    : "Too many failed attempts. Please request a new OTP."
            });
        }

        // OTP is valid -> Invalidate it immediately (single-use)
        admin.otpHash = null;
        admin.otpExpiresAt = null;
        admin.otpAttempts = 0;

        // Generate a cryptographically secure 10-minute reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        admin.resetToken = resetToken;
        admin.resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await admin.save();

        res.status(200).json({
            success: true,
            message: "OTP verified successfully. You may now create your password.",
            resetToken
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Set or reset the admin password using the verified reset token
// @route   POST /api/auth/set-password
const setPassword = async (req, res, next) => {
    try {
        const { email, resetToken, password, confirmPassword } = req.body;

        if (!email || !resetToken || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Email, reset token, password, and confirmation are required."
            });
        }

        const inputEmail = email.trim().toLowerCase();
        if (inputEmail !== ALLOWED_ADMIN_EMAIL) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized email address."
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long."
            });
        }

        const admin = await getOrCreateAdmin();

        // Validate reset token and its expiration
        if (
            !admin.resetToken ||
            admin.resetToken !== resetToken ||
            !admin.resetTokenExpiresAt ||
            new Date() > new Date(admin.resetTokenExpiresAt)
        ) {
            return res.status(400).json({
                success: false,
                message: "Your verification session has expired or is invalid. Please request a new OTP."
            });
        }

        // Hash new password with bcrypt
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        admin.passwordHash = passwordHash;
        admin.resetToken = null;
        admin.resetTokenExpiresAt = null;
        admin.otpHash = null;
        admin.otpExpiresAt = null;
        await admin.save();

        res.status(200).json({
            success: true,
            message: "Password has been successfully updated. You can now log in with your new password."
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin logout
// @route   POST /api/auth/logout
const logout = async (req, res) => {
    const cookieOpts = getCookieOptions();
    delete cookieOpts.maxAge;

    res.clearCookie("token", cookieOpts);

    res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
};

// @desc    Get currently authenticated admin session
// @route   GET /api/auth/me
const getMe = async (req, res) => {
    try {
        let token = null;

        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(200).json({
                authenticated: false
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.email.toLowerCase() !== ALLOWED_ADMIN_EMAIL) {
            return res.status(200).json({
                authenticated: false
            });
        }

        return res.status(200).json({
            authenticated: true,
            email: decoded.email
        });
    } catch (error) {
        return res.status(200).json({
            authenticated: false
        });
    }
};

module.exports = {
    getSetupStatus,
    login,
    sendOtp,
    verifyOtp,
    setPassword,
    logout,
    getMe,
    ALLOWED_ADMIN_EMAIL
};
