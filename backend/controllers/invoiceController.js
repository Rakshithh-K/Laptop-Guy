const Invoice = require("../models/Invoice");
const Laptop = require("../models/Laptop");
const Customer = require("../models/Customer");
const { generateInvoicePdf } = require("../services/pdfService");
const { sendInvoiceEmail } = require("../services/emailService");

// @desc    Create a new invoice and mark laptop as SOLD
// @route   POST /api/invoices
const createInvoice = async (req, res, next) => {
    try {
        let {
            customerId,
            newCustomer,
            laptopId,
            discount = 0,
            tax = 0,
            paymentMethod = "CASH",
            paymentStatus = "PENDING",
            amountPaid = 0,
            warranty
        } = req.body;

        // 1. Resolve Customer
        let customer;
        if (customerId) {
            customer = await Customer.findById(customerId);
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found."
                });
            }
        } else if (newCustomer && newCustomer.name && newCustomer.phone && newCustomer.address) {
            customer = await Customer.create({
                name: newCustomer.name.trim(),
                phone: newCustomer.phone.trim(),
                email: newCustomer.email ? newCustomer.email.trim() : "",
                address: newCustomer.address.trim(),
                gstin: newCustomer.gstin ? newCustomer.gstin.trim().toUpperCase() : ""
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Please select an existing customer or provide complete new customer details."
            });
        }

        // 2. Validate Laptop & Availability
        if (!laptopId) {
            return res.status(400).json({
                success: false,
                message: "Please select a laptop to bill."
            });
        }

        const laptop = await Laptop.findById(laptopId);
        if (!laptop) {
            return res.status(404).json({
                success: false,
                message: "Selected laptop was not found in inventory."
            });
        }

        if (laptop.status === "SOLD") {
            return res.status(400).json({
                success: false,
                message: `Laptop ${laptop.brand} ${laptop.model} (S/N: ${laptop.serialNumber}) is already marked as SOLD. Cannot create duplicate bill.`
            });
        }

        // 3. Authoritative Calculations from DB Selling Price
        const sellingPrice = Number(laptop.sellingPrice);
        const parsedDiscount = Math.max(0, Number(discount) || 0);
        const parsedTax = Math.max(0, Number(tax) || 0);

        if (parsedDiscount > sellingPrice) {
            return res.status(400).json({
                success: false,
                message: "Discount cannot exceed laptop selling price."
            });
        }

        const taxableAmount = sellingPrice - parsedDiscount;
        const totalAmount = taxableAmount + parsedTax;

        // 4. Validate Payment
        const validPaymentMethods = ["CASH", "UPI", "CARD", "BANK_TRANSFER"];
        if (!validPaymentMethods.includes(paymentMethod)) {
            paymentMethod = "CASH";
        }

        let parsedAmountPaid = Math.max(0, Number(amountPaid) || 0);
        if (parsedAmountPaid > totalAmount) {
            return res.status(400).json({
                success: false,
                message: "Amount paid cannot exceed total invoice amount."
            });
        }

        // Auto determine paymentStatus if not accurately set
        let finalPaymentStatus = paymentStatus;
        if (parsedAmountPaid >= totalAmount && totalAmount > 0) {
            finalPaymentStatus = "PAID";
        } else if (parsedAmountPaid > 0 && parsedAmountPaid < totalAmount) {
            finalPaymentStatus = "PARTIAL";
        } else if (parsedAmountPaid === 0) {
            finalPaymentStatus = "PENDING";
        }

        // 5. Generate Unique Invoice Number (INV-YYYYMMDD-XXXX)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const randStr = Math.floor(1000 + Math.random() * 9000);
        const invoiceNumber = `INV-${dateStr}-${randStr}`;

        // 6. Create Invoice
        const invoice = await Invoice.create({
            invoiceNumber,
            customer: customer._id,
            laptop: laptop._id,
            sellingPrice,
            discount: parsedDiscount,
            tax: parsedTax,
            totalAmount,
            paymentMethod,
            paymentStatus: finalPaymentStatus,
            amountPaid: parsedAmountPaid,
            warranty: warranty ? warranty.trim() : laptop.warranty || "30 Days Hardware Warranty"
        });

        // 7. Mark Laptop as SOLD
        laptop.status = "SOLD";
        await laptop.save();

        const populatedInvoice = await Invoice.findById(invoice._id)
            .populate("customer")
            .populate("laptop");

        res.status(201).json(populatedInvoice);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all invoices with search and filters
// @route   GET /api/invoices
const getInvoices = async (req, res, next) => {
    try {
        const { search, paymentStatus } = req.query;
        let query = {};

        if (paymentStatus && paymentStatus !== "ALL") {
            query.paymentStatus = paymentStatus.toUpperCase();
        }

        let invoices = await Invoice.find(query)
            .populate("customer")
            .populate("laptop")
            .sort({ createdAt: -1 });

        // Search filtering across invoiceNumber, customer name/phone, laptop serial/model/brand
        if (search && search.trim() !== "") {
            const term = search.trim().toLowerCase();
            invoices = invoices.filter(inv => {
                const invNumMatch = inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(term);
                const custNameMatch = inv.customer && inv.customer.name && inv.customer.name.toLowerCase().includes(term);
                const custPhoneMatch = inv.customer && inv.customer.phone && inv.customer.phone.toLowerCase().includes(term);
                const laptopSerialMatch = inv.laptop && inv.laptop.serialNumber && inv.laptop.serialNumber.toLowerCase().includes(term);
                const laptopBrandMatch = inv.laptop && inv.laptop.brand && inv.laptop.brand.toLowerCase().includes(term);
                const laptopModelMatch = inv.laptop && inv.laptop.model && inv.laptop.model.toLowerCase().includes(term);

                return invNumMatch || custNameMatch || custPhoneMatch || laptopSerialMatch || laptopBrandMatch || laptopModelMatch;
            });
        }

        res.status(200).json(invoices);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single invoice by ID
// @route   GET /api/invoices/:id
const getInvoiceById = async (req, res, next) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate("customer")
            .populate("laptop");

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found"
            });
        }

        res.status(200).json(invoice);
    } catch (error) {
        next(error);
    }
};

// @desc    Generate and download invoice PDF
// @route   GET /api/invoices/:id/pdf
const getInvoicePdf = async (req, res, next) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate("customer")
            .populate("laptop");

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found"
            });
        }

        const pdfBuffer = await generateInvoicePdf(invoice);

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
            "Content-Length": pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error) {
        console.error("PDF generation error:", error);
        next(error);
    }
};
// @desc    Send invoice PDF to customer email
// @route   POST /api/invoices/:id/send
const sendInvoice = async (req, res, next) => {
    let invoice;
    try {
        invoice = await Invoice.findById(req.params.id)
            .populate("customer")
            .populate("laptop");

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found"
            });
        }

        const customer = invoice.customer;
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer associated with this invoice was not found"
            });
        }

        if (!customer.email || !customer.email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Customer email address is required to send the invoice."
            });
        }

        // Generate the exact same PDF as download
        const pdfBuffer = await generateInvoicePdf(invoice);

        // Send email
        await sendInvoiceEmail({
            to: customer.email.trim(),
            customerName: customer.name,
            invoiceNumber: invoice.invoiceNumber,
            invoice,
            pdfBuffer
        });

        // Update email tracking status
        invoice.emailStatus = "SENT";
        invoice.emailSentAt = new Date();
        invoice.emailError = null;
        await invoice.save();

        res.status(200).json({
            success: true,
            message: "Invoice sent successfully",
            email: customer.email
        });
    } catch (error) {
        console.error("Invoice email delivery error:", error);

        if (invoice) {
            invoice.emailStatus = "FAILED";
            invoice.emailError = error.message;
            await invoice.save().catch(() => { });
        }

        res.status(500).json({
            success: false,
            message: "Failed to send invoice email",
            error: error.message
        });
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    getInvoicePdf,
    sendInvoice
};
