const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || "laptopguy_jwt_secret_key_98374928374";

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

// @desc    Admin login
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

        const adminEmail = (process.env.ADMIN_EMAIL || "nawazlaptop@gmail.com").trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD || "laptopguynawaz";

        const inputEmail = email.trim().toLowerCase();
        const inputPassword = password;

        let isMatch = false;

        if (inputEmail === adminEmail) {
            // Check if stored password is a bcrypt hash or plain string
            if (adminPassword.startsWith("$2a$") || adminPassword.startsWith("$2b$") || adminPassword.startsWith("$2y$")) {
                isMatch = await bcrypt.compare(inputPassword, adminPassword);
            } else {
                isMatch = (inputPassword === adminPassword);
            }
        }

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { email: adminEmail },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Set secure HTTP-only cookie
        res.cookie("token", token, getCookieOptions());

        res.status(200).json({
            success: true,
            message: "Login successful",
            email: adminEmail,
            token
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
        const adminEmail = (process.env.ADMIN_EMAIL || "nawazlaptop@gmail.com").trim().toLowerCase();

        if (decoded.email.toLowerCase() !== adminEmail) {
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
    login,
    logout,
    getMe
};
