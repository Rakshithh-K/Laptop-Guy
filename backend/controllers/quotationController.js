const Quotation = require("../models/Quotation");
const Laptop = require("../models/Laptop");
const Customer = require("../models/Customer");
const { generateQuotationPdf } = require("../services/pdfService");

// @desc    Create a new commercial quotation
// @route   POST /api/quotations
const createQuotation = async (req, res, next) => {
    try {
        const {
            customerId,
            newCustomer,
            items,
            discount = 0,
            validityDays = 7,
            notes,
            status = "PENDING"
        } = req.body;

        // 1. Resolve Customer
        let customer;
        if (customerId) {
            customer = await Customer.findById(customerId);
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Selected customer not found."
                });
            }
        } else if (newCustomer && newCustomer.name && newCustomer.phone) {
            customer = await Customer.create({
                name: newCustomer.name.trim(),
                phone: newCustomer.phone.trim(),
                email: newCustomer.email ? newCustomer.email.trim() : "",
                address: newCustomer.address ? newCustomer.address.trim() : "",
                gstin: newCustomer.gstin ? newCustomer.gstin.trim().toUpperCase() : ""
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Please select an existing customer or provide customer name and phone."
            });
        }

        // 2. Validate Items
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select at least one laptop to include in the quotation."
            });
        }

        const laptopIdList = items.map(it => {
            const id = it.laptopId || it.laptop || it._id || it;
            return typeof id === "object" && id._id ? id._id.toString() : id.toString().trim();
        });

        const uniqueLaptopIds = Array.from(new Set(laptopIdList));
        const laptops = await Laptop.find({ _id: { $in: uniqueLaptopIds } });
        const laptopMap = new Map(laptops.map(l => [l._id.toString(), l]));

        let subtotal = 0;
        const quotationItems = [];

        for (const it of items) {
            const idStr = (it.laptopId || it.laptop || it._id || it).toString().trim();
            const laptopDoc = laptopMap.get(idStr);

            if (!laptopDoc) {
                return res.status(404).json({
                    success: false,
                    message: `Laptop with ID ${idStr} was not found.`
                });
            }

            const itemQuotedPrice = (it.quotedPrice !== undefined && Number(it.quotedPrice) >= 0)
                ? Number(it.quotedPrice)
                : Number(laptopDoc.sellingPrice || 0);

            subtotal += itemQuotedPrice;

            quotationItems.push({
                laptop: laptopDoc._id,
                brand: laptopDoc.brand || "",
                model: laptopDoc.model || "",
                serialNumber: laptopDoc.serialNumber || "",
                processor: laptopDoc.processor || "",
                ram: laptopDoc.ram || "",
                storage: laptopDoc.storage || "",
                condition: laptopDoc.condition || "",
                warranty: laptopDoc.warranty || "30 Days Hardware Warranty",
                purchasePrice: Number(laptopDoc.purchasePrice) || 0,
                originalSellingPrice: Number(laptopDoc.sellingPrice) || 0,
                quotedPrice: itemQuotedPrice
            });
        }

        // 3. Totals and Validity
        const parsedDiscount = Math.max(0, Number(discount) || 0);
        if (parsedDiscount > subtotal) {
            return res.status(400).json({
                success: false,
                message: "Quotation discount cannot exceed items subtotal."
            });
        }

        const totalQuotedAmount = subtotal - parsedDiscount;
        const days = Math.max(1, Number(validityDays) || 7);
        const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        // 4. Generate Unique Quotation Number (QTN-YYYYMMDD-XXXX)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const randStr = Math.floor(1000 + Math.random() * 9000);
        const quotationNumber = `QTN-${dateStr}-${randStr}`;

        // 5. Create Quotation Document
        const quotation = await Quotation.create({
            quotationNumber,
            customer: customer._id,
            items: quotationItems,
            subtotal,
            discount: parsedDiscount,
            totalQuotedAmount,
            validityDays: days,
            validUntil,
            notes: notes && notes.trim() ? notes.trim() : "This quotation is valid for " + days + " days from the date of issue. Prices and stock availability are subject to confirmation at the time of purchase.",
            status: status || "PENDING"
        });

        const populated = await Quotation.findById(quotation._id)
            .populate("customer")
            .populate("items.laptop");

        res.status(201).json(populated);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all quotations with search and status filtering
// @route   GET /api/quotations
const getQuotations = async (req, res, next) => {
    try {
        const { search, status } = req.query;
        let query = {};

        if (status && status !== "ALL") {
            query.status = status.toUpperCase();
        }

        let quotations = await Quotation.find(query)
            .populate("customer")
            .populate("items.laptop")
            .sort({ createdAt: -1 });

        if (search && search.trim() !== "") {
            const term = search.trim().toLowerCase();
            quotations = quotations.filter(q => {
                const qNumMatch = q.quotationNumber && q.quotationNumber.toLowerCase().includes(term);
                const custName = q.customer?.name && q.customer.name.toLowerCase().includes(term);
                const custPhone = q.customer?.phone && q.customer.phone.toLowerCase().includes(term);
                const itemMatch = (q.items || []).some(it => {
                    return (
                        (it.brand && it.brand.toLowerCase().includes(term)) ||
                        (it.model && it.model.toLowerCase().includes(term)) ||
                        (it.serialNumber && it.serialNumber.toLowerCase().includes(term))
                    );
                });
                return qNumMatch || custName || custPhone || itemMatch;
            });
        }

        res.status(200).json(quotations);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single quotation by ID
// @route   GET /api/quotations/:id
const getQuotationById = async (req, res, next) => {
    try {
        const quotation = await Quotation.findById(req.params.id)
            .populate("customer")
            .populate("items.laptop");

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: "Quotation not found."
            });
        }

        res.status(200).json(quotation);
    } catch (error) {
        next(error);
    }
};

// @desc    Generate and download Quotation PDF
// @route   GET /api/quotations/:id/pdf
const getQuotationPdf = async (req, res, next) => {
    try {
        const quotation = await Quotation.findById(req.params.id)
            .populate("customer")
            .populate("items.laptop");

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: "Quotation not found."
            });
        }

        const pdfBuffer = await generateQuotationPdf(quotation);

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="Quotation-${quotation.quotationNumber}.pdf"`,
            "Content-Length": pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error) {
        console.error("Quotation PDF generation error:", error);
        next(error);
    }
};

// @desc    Update Quotation status (ACCEPTED, DECLINED, EXPIRED)
// @route   PUT /api/quotations/:id/status
const updateQuotationStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED"];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${validStatuses.join(", ")}`
            });
        }

        const quotation = await Quotation.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        ).populate("customer").populate("items.laptop");

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: "Quotation not found."
            });
        }

        res.status(200).json(quotation);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a quotation
// @route   DELETE /api/quotations/:id
const deleteQuotation = async (req, res, next) => {
    try {
        const quotation = await Quotation.findById(req.params.id);

        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: "Quotation not found."
            });
        }

        await Quotation.findByIdAndDelete(quotation._id);

        res.status(200).json({
            success: true,
            message: `Quotation ${quotation.quotationNumber} deleted successfully.`
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createQuotation,
    getQuotations,
    getQuotationById,
    getQuotationPdf,
    updateQuotationStatus,
    deleteQuotation
};
