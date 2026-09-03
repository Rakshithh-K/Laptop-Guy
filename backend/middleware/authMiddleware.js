const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "laptopguy_jwt_secret_key_98374928374";
const ALLOWED_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "laptopguysales@gmail.com").trim().toLowerCase();

const authMiddleware = (req, res, next) => {
    try {
        let token = null;

        // 1. Check HTTP-only cookie
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } 
        // 2. Check Authorization header as fallback
        else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify that the token corresponds to the authorized single admin
        if (!decoded.email || decoded.email.trim().toLowerCase() !== ALLOWED_ADMIN_EMAIL) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        req.admin = {
            email: decoded.email
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }
};

module.exports = authMiddleware;
