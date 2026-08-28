const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const laptopRoutes = require("./routes/laptopRoutes");
const customerRoutes = require("./routes/customerRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const businessRoutes = require("./routes/businessRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "https://laptop-guy.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

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

// API Routes
app.use("/api/laptops", laptopRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/business-info", businessRoutes);

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