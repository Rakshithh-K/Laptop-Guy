const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const laptopRoutes = require("./routes/laptopRoutes");
const customerRoutes = require("./routes/customerRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const businessRoutes = require("./routes/businessRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const { notFoundHandler, errorHandler } = require("./middleware/errorMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxy for rate-limiting and secure cookies on Render
app.set("trust proxy", 1);

// Security Headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Allowed Origins for CORS with Credentials
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://laptop-guy.onrender.com"
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. mobile apps, curl) or allowed origins
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".onrender.com")) {
            callback(null, true);
        } else {
            callback(new Error("Origin not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Cookie Parser
app.use(cookieParser());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/laptop-bill")
    .then(() => {
        console.log("✓ MongoDB connected successfully");
    })
    .catch((error) => {
        console.error("✗ MongoDB connection failed:", error.message);
    });

// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        name: "Laptop Billing API",
        status: "RUNNING",
        version: "1.0.0",
        timestamp: new Date()
    });
});

// Authentication Routes (Public / Unprotected)
app.use("/api/auth", authRoutes);

// Protected Business Routes (Require single-admin auth)
app.use("/api/laptops", authMiddleware, laptopRoutes);
app.use("/api/customers", authMiddleware, customerRoutes);
app.use("/api/invoices", authMiddleware, invoiceRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api/business-info", authMiddleware, businessRoutes);

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Only listen if not required by tests
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✓ Laptop Billing Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;