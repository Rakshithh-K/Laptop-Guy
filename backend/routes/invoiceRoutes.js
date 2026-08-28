const express = require("express");
const router = express.Router();
const {
    createInvoice,
    getInvoices,
    getInvoiceById,
    getInvoicePdf,
    sendInvoice
} = require("../controllers/invoiceController");

router.route("/")
    .get(getInvoices)
    .post(createInvoice);

router.route("/:id")
    .get(getInvoiceById);

router.route("/:id/pdf")
    .get(getInvoicePdf);

router.route("/:id/send")
    .post(sendInvoice);

module.exports = router;
