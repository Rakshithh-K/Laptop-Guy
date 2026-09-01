const express = require("express");
const router = express.Router();
const {
    getDashboardStats,
    getProfitAnalytics,
    getInvestmentAnalytics
} = require("../controllers/dashboardController");

router.get("/stats", getDashboardStats);
router.get("/profit", getProfitAnalytics);
router.get("/investment", getInvestmentAnalytics);

module.exports = router;
