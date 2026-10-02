const express = require("express");
const router = express.Router();
const {
    createQuotation,
    getQuotations,
    getQuotationById,
    getQuotationPdf,
    updateQuotationStatus,
    deleteQuotation
} = require("../controllers/quotationController");

router.route("/")
    .get(getQuotations)
    .post(createQuotation);

router.route("/:id")
    .get(getQuotationById)
    .delete(deleteQuotation);

router.route("/:id/pdf")
    .get(getQuotationPdf);

router.route("/:id/status")
    .put(updateQuotationStatus);

module.exports = router;
