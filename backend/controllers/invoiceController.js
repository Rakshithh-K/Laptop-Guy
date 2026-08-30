const Invoice = require("../models/Invoice");
const Laptop = require("../models/Laptop");
const Customer = require("../models/Customer");
const { generateInvoicePdf } = require("../services/pdfService");
const { sendInvoiceEmail } = require("../services/emailService");

// Helper to normalize legacy invoices into multi-item structure
const normalizeInvoice = (invoiceDoc) => {
    if (!invoiceDoc) return invoiceDoc;
    const inv = invoiceDoc.toObject ? invoiceDoc.toObject() : { ...invoiceDoc };

    if (!inv.items || inv.items.length === 0) {
        if (inv.laptop) {
            inv.items = [
                {
                    laptop: inv.laptop,
                    sellingPrice: inv.sellingPrice || inv.totalAmount || 0
                }
            ];
        } else {
            inv.items = [];
        }
    }
    if (inv.subtotal === undefined) {
        inv.subtotal = inv.items.reduce((acc, it) => acc + (it.sellingPrice || 0), 0) || inv.sellingPrice || 0;
    }
    return inv;
};

// @desc    Create a new invoice (supports multiple products) and mark laptops as SOLD
// @route   POST /api/invoices
const createInvoice = async (req, res, next) => {
    try {
        let {
            customerId,
            newCustomer,
            items,
            laptopId,
            laptopIds,
            discount = 0,
            tax = 0,
            paymentMethod = "CASH",
            transactionId = "",
            utrNumber = "",
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

        // 2. Resolve Multi-Item Laptops
        let rawItems = [];
        if (Array.isArray(items) && items.length > 0) {
            rawItems = items;
        } else if (laptopId) {
            rawItems = [{ laptopId, sellingPrice: req.body.sellingPrice }];
        } else if (Array.isArray(laptopIds) && laptopIds.length > 0) {
            rawItems = laptopIds.map(id => ({ laptopId: id }));
        }

        if (rawItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select at least one laptop to bill."
            });
        }

        // Extract laptop IDs and ensure no duplicates within the same invoice
        const laptopIdList = rawItems.map(it => {
            const id = it.laptopId || it.laptop || it._id || it;
            return typeof id === "object" && id._id ? id._id.toString() : id.toString().trim();
        });

        const uniqueLaptopIds = new Set(laptopIdList);
        if (uniqueLaptopIds.size !== laptopIdList.length) {
            return res.status(400).json({
                success: false,
                message: "Duplicate laptops detected. The same laptop cannot be added more than once to the same invoice."
            });
        }

        // Fetch all laptops from DB
        const laptops = await Laptop.find({ _id: { $in: Array.from(uniqueLaptopIds) } });
        if (laptops.length !== uniqueLaptopIds.size) {
            return res.status(404).json({
                success: false,
                message: "One or more selected laptops were not found in inventory."
            });
        }

        // Check availability
        const soldLaptops = laptops.filter(l => l.status === "SOLD");
        if (soldLaptops.length > 0) {
            const soldNames = soldLaptops.map(l => `${l.brand} ${l.model} (S/N: ${l.serialNumber})`).join(", ");
            return res.status(400).json({
                success: false,
                message: `The following laptop(s) are already SOLD and cannot be billed: ${soldNames}`
            });
        }

        // 3. Build Invoice Items & Calculate Subtotal
        const laptopMap = new Map(laptops.map(l => [l._id.toString(), l]));
        let subtotal = 0;
        const invoiceItems = [];

        for (const item of rawItems) {
            const idStr = (item.laptopId || item.laptop || item._id || item).toString().trim();
            const laptopDoc = laptopMap.get(idStr);
            const itemSellingPrice = (item.sellingPrice !== undefined && Number(item.sellingPrice) >= 0)
                ? Number(item.sellingPrice)
                : Number(laptopDoc.sellingPrice);

            subtotal += itemSellingPrice;
            invoiceItems.push({
                laptop: laptopDoc._id,
                sellingPrice: itemSellingPrice
            });
        }

        // 4. Authoritative Calculations
        const parsedDiscount = Math.max(0, Number(discount) || 0);
        const parsedTax = Math.max(0, Number(tax) || 0);

        if (parsedDiscount > subtotal) {
            return res.status(400).json({
                success: false,
                message: "Discount cannot exceed total items subtotal."
            });
        }

        const taxableAmount = subtotal - parsedDiscount;
        const totalAmount = taxableAmount + parsedTax;

        // 5. Validate Payment Method & Transaction ID / UTR
        const validPaymentMethods = ["CASH", "UPI", "CARD", "BANK_TRANSFER"];
        let finalPaymentMethod = (paymentMethod || "CASH").toUpperCase();
        if (!validPaymentMethods.includes(finalPaymentMethod)) {
            finalPaymentMethod = "CASH";
        }

        let finalTransactionId = (transactionId || utrNumber || "").trim();
        const onlinePaymentMethods = ["UPI", "CARD", "BANK_TRANSFER"];

        if (onlinePaymentMethods.includes(finalPaymentMethod)) {
            if (!finalTransactionId) {
                return res.status(400).json({
                    success: false,
                    message: "Transaction ID / UTR Number is required for online payments (UPI, Card, Bank Transfer)."
                });
            }
        } else {
            finalTransactionId = ""; // Always clear transaction ID for Cash
        }

        let parsedAmountPaid = Math.max(0, Number(amountPaid) || 0);
        if (parsedAmountPaid > totalAmount) {
            return res.status(400).json({
                success: false,
                message: "Amount paid cannot exceed total invoice amount."
            });
        }

        // Auto determine paymentStatus
        let finalPaymentStatus = paymentStatus;
        if (parsedAmountPaid >= totalAmount && totalAmount > 0) {
            finalPaymentStatus = "PAID";
        } else if (parsedAmountPaid > 0 && parsedAmountPaid < totalAmount) {
            finalPaymentStatus = "PARTIAL";
        } else if (parsedAmountPaid === 0) {
            finalPaymentStatus = "PENDING";
        }

        // 6. Generate Unique Invoice Number (INV-YYYYMMDD-XXXX)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const randStr = Math.floor(1000 + Math.random() * 9000);
        const invoiceNumber = `INV-${dateStr}-${randStr}`;

        // 7. Create Invoice Record
        const invoice = await Invoice.create({
            invoiceNumber,
            customer: customer._id,
            items: invoiceItems,
            // Legacy single-item fields for backward compatibility
            laptop: invoiceItems[0]?.laptop,
            sellingPrice: subtotal,
            subtotal,
            discount: parsedDiscount,
            tax: parsedTax,
            totalAmount,
            paymentMethod: finalPaymentMethod,
            transactionId: finalTransactionId,
            paymentStatus: finalPaymentStatus,
            amountPaid: parsedAmountPaid,
            warranty: warranty ? warranty.trim() : (laptops[0]?.warranty || "30 Days Hardware Warranty")
        });

        // 8. Mark all selected Laptops as SOLD
        await Laptop.updateMany(
            { _id: { $in: Array.from(uniqueLaptopIds) } },
            { $set: { status: "SOLD" } }
        );

        const populatedInvoice = await Invoice.findById(invoice._id)
            .populate("customer")
            .populate("items.laptop")
            .populate("laptop");

        res.status(201).json(normalizeInvoice(populatedInvoice));
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
            .populate("items.laptop")
            .populate("laptop")
            .sort({ createdAt: -1 });

        // Normalize invoices
        let normalizedInvoices = invoices.map(normalizeInvoice);

        // Search filtering across invoiceNumber, customer, transactionId, laptop serial/model/brand
        if (search && search.trim() !== "") {
            const term = search.trim().toLowerCase();
            normalizedInvoices = normalizedInvoices.filter(inv => {
                const invNumMatch = inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(term);
                const txMatch = inv.transactionId && inv.transactionId.toLowerCase().includes(term);
                const custNameMatch = inv.customer && inv.customer.name && inv.customer.name.toLowerCase().includes(term);
                const custPhoneMatch = inv.customer && inv.customer.phone && inv.customer.phone.toLowerCase().includes(term);

                // Check across all items
                const itemMatch = (inv.items || []).some(it => {
                    const l = it.laptop || {};
                    return (
                        (l.serialNumber && l.serialNumber.toLowerCase().includes(term)) ||
                        (l.brand && l.brand.toLowerCase().includes(term)) ||
                        (l.model && l.model.toLowerCase().includes(term))
                    );
                });

                return invNumMatch || txMatch || custNameMatch || custPhoneMatch || itemMatch;
            });
        }

        res.status(200).json(normalizedInvoices);
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
            .populate("items.laptop")
            .populate("laptop");

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found"
            });
        }

        res.status(200).json(normalizeInvoice(invoice));
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
            .populate("items.laptop")
            .populate("laptop");

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found"
            });
        }

        const normalized = normalizeInvoice(invoice);
        const pdfBuffer = await generateInvoicePdf(normalized);

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="Invoice-${normalized.invoiceNumber}.pdf"`,
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
            .populate("items.laptop")
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

        const normalized = normalizeInvoice(invoice);

        // Generate the exact same PDF as download
        const pdfBuffer = await generateInvoicePdf(normalized);

        // Send email
        await sendInvoiceEmail({
            to: customer.email.trim(),
            customerName: customer.name,
            invoiceNumber: normalized.invoiceNumber,
            invoice: normalized,
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
        console.error("[EmailService] Invoice delivery error:", error);

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