const express = require("express");
const router = express.Router();
const {
    createInvoice,
    getInvoices,
    getInvoiceById,
    getInvoicePdf,
    sendInvoice,
    deleteInvoice
} = require("../controllers/invoiceController");
const { getInvoiceReturns } = require("../controllers/returnController");

router.route("/")
    .get(getInvoices)
    .post(createInvoice);

router.route("/:id")
    .get(getInvoiceById)
    .delete(deleteInvoice);

router.route("/:id/returns")
    .get(getInvoiceReturns);

router.route("/:id/pdf")
    .get(getInvoicePdf);

router.route("/:id/send")
    .post(sendInvoice);

module.exports = router;
