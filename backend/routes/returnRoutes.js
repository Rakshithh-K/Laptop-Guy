const express = require("express");
const router = express.Router();
const {
    createReturn,
    getReturns,
    getReturnById,
    getInvoiceReturns
} = require("../controllers/returnController");

// Return management endpoints (Auth middleware applied in server.js)
router.post("/", createReturn);
router.get("/", getReturns);
router.get("/invoice/:invoiceId", getInvoiceReturns);
router.get("/:id", getReturnById);

module.exports = router;
