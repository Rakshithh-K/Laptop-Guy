const mongoose = require("mongoose");
const Return = require("../models/Return");
const Invoice = require("../models/Invoice");
const Laptop = require("../models/Laptop");
const Customer = require("../models/Customer");

// @desc    Process a new product return with backend-authoritative validations
// @route   POST /api/returns
const createReturn = async (req, res, next) => {
    let session = null;
    try {
        const { invoiceId, laptopId, returnedQuantity = 1, refundAmount, reason = "" } = req.body;

        // 1. Basic validation
        if (!invoiceId || !laptopId) {
            return res.status(400).json({
                success: false,
                message: "Invoice ID and Laptop ID are required to process a return."
            });
        }

        const parsedReturnQty = parseInt(returnedQuantity, 10);
        if (isNaN(parsedReturnQty) || parsedReturnQty <= 0) {
            return res.status(400).json({
                success: false,
                message: "Returned quantity must be a positive number greater than 0."
            });
        }

        const parsedRefundAmount = Number(refundAmount);
        if (isNaN(parsedRefundAmount) || parsedRefundAmount < 0) {
            return res.status(400).json({
                success: false,
                message: "Refund amount (Return Value) must be a valid number greater than or equal to 0."
            });
        }

        // 2. Fetch authoritative Invoice and Laptop
        const invoice = await Invoice.findById(invoiceId)
            .populate("customer")
            .populate("items.laptop")
            .populate("laptop");

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found."
            });
        }

        const laptop = await Laptop.findById(laptopId);
        if (!laptop) {
            return res.status(404).json({
                success: false,
                message: "Product not found in inventory."
            });
        }

        // 3. Verify product belongs to the invoice
        let matchedItem = null;
        let itemSellingPrice = 0;
        let soldQuantity = 1;

        if (invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0) {
            matchedItem = invoice.items.find(it => {
                const id = it.laptop?._id || it.laptop;
                return id && id.toString() === laptopId.toString();
            });

            if (matchedItem) {
                itemSellingPrice = Number(matchedItem.sellingPrice) || 0;
                soldQuantity = matchedItem.quantity ? Number(matchedItem.quantity) : 1;
            }
        } else if (invoice.laptop) {
            const legacyLaptopId = invoice.laptop?._id || invoice.laptop;
            if (legacyLaptopId && legacyLaptopId.toString() === laptopId.toString()) {
                matchedItem = { laptop: invoice.laptop, sellingPrice: invoice.sellingPrice || invoice.totalAmount };
                itemSellingPrice = Number(matchedItem.sellingPrice) || 0;
                soldQuantity = 1;
            }
        }

        if (!matchedItem) {
            return res.status(400).json({
                success: false,
                message: `The selected product (${laptop.brand} ${laptop.model}) does not belong to invoice ${invoice.invoiceNumber}.`
            });
        }

        // 4. Validate return quantity limits against past returns
        const existingReturns = await Return.find({
            invoice: invoice._id,
            laptop: laptop._id
        });

        const alreadyReturnedQty = existingReturns.reduce((sum, r) => sum + (Number(r.returnedQuantity) || 0), 0);
        const remainingReturnableQty = Math.max(0, soldQuantity - alreadyReturnedQty);

        if (remainingReturnableQty <= 0) {
            return res.status(400).json({
                success: false,
                message: `This product (${laptop.brand} ${laptop.model}) has already been fully returned for this invoice.`
            });
        }

        if (parsedReturnQty > remainingReturnableQty) {
            return res.status(400).json({
                success: false,
                message: `Cannot return ${parsedReturnQty} unit(s). Only ${remainingReturnableQty} unit(s) remaining for return.`
            });
        }

        // 5. Authoritatively compute discounted selling price
        const invoiceDiscount = Math.max(0, Number(invoice.discount) || 0);
        let itemsSubtotal = 0;

        if (invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0) {
            itemsSubtotal = invoice.items.reduce((sum, it) => sum + (Number(it.sellingPrice) || 0), 0);
        } else {
            itemsSubtotal = itemSellingPrice;
        }

        let itemDiscount = 0;
        if (itemsSubtotal > 0 && invoiceDiscount > 0) {
            itemDiscount = (invoiceDiscount * itemSellingPrice) / itemsSubtotal;
        }

        const originalSellingPriceAfterDiscount = Math.max(0, itemSellingPrice - itemDiscount);

        // 6. Calculate Financial & Profit Impact
        // purchasePrice is fetched directly from database
        const purchasePrice = Number(laptop.purchasePrice) || 0;
        // profitImpact = Returned Cost (restored to inventory) - Refund Amount (given to customer)
        const profitImpact = purchasePrice - parsedRefundAmount;

        const productName = `${laptop.brand} ${laptop.model}`;
        const adminEmail = req.admin?.email || "laptopguysales@gmail.com";

        // 7. Atomic persistence: Create Return & restore Laptop status
        // Attempt MongoDB transaction if replica set supported, else atomic sequence
        let useTransaction = false;
        try {
            session = await mongoose.startSession();
            session.startTransaction();
            useTransaction = true;
        } catch (e) {
            // Standalone MongoDB without replica set
            session = null;
            useTransaction = false;
        }

        let returnDoc;
        if (useTransaction) {
            const created = await Return.create(
                [
                    {
                        invoice: invoice._id,
                        invoiceNumber: invoice.invoiceNumber,
                        customer: invoice.customer?._id || invoice.customer,
                        laptop: laptop._id,
                        productName,
                        serialNumber: laptop.serialNumber,
                        soldQuantity,
                        returnedQuantity: parsedReturnQty,
                        originalSellingPrice: itemSellingPrice,
                        originalSellingPriceAfterDiscount,
                        purchasePrice,
                        refundAmount: parsedRefundAmount,
                        profitImpact,
                        reason: (reason || "").trim(),
                        returnedAt: new Date(),
                        processedBy: adminEmail
                    }
                ],
                { session }
            );
            returnDoc = created[0];

            // Restore laptop status to AVAILABLE in inventory
            await Laptop.findByIdAndUpdate(
                laptop._id,
                { $set: { status: "AVAILABLE" } },
                { session }
            );

            await session.commitTransaction();
            session.endSession();
        } else {
            returnDoc = await Return.create({
                invoice: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                customer: invoice.customer?._id || invoice.customer,
                laptop: laptop._id,
                productName,
                serialNumber: laptop.serialNumber,
                soldQuantity,
                returnedQuantity: parsedReturnQty,
                originalSellingPrice: itemSellingPrice,
                originalSellingPriceAfterDiscount,
                purchasePrice,
                refundAmount: parsedRefundAmount,
                profitImpact,
                reason: (reason || "").trim(),
                returnedAt: new Date(),
                processedBy: adminEmail
            });

            // Restore laptop status to AVAILABLE in inventory
            await Laptop.findByIdAndUpdate(
                laptop._id,
                { $set: { status: "AVAILABLE" } }
            );
        }

        // Return sanitized payload (never expose purchasePrice)
        const sanitizedReturn = {
            _id: returnDoc._id,
            invoice: returnDoc.invoice,
            invoiceNumber: returnDoc.invoiceNumber,
            customer: returnDoc.customer,
            laptop: returnDoc.laptop,
            productName: returnDoc.productName,
            serialNumber: returnDoc.serialNumber,
            soldQuantity: returnDoc.soldQuantity,
            returnedQuantity: returnDoc.returnedQuantity,
            originalSellingPrice: returnDoc.originalSellingPrice,
            originalSellingPriceAfterDiscount: returnDoc.originalSellingPriceAfterDiscount,
            refundAmount: returnDoc.refundAmount,
            reason: returnDoc.reason,
            returnedAt: returnDoc.returnedAt,
            processedBy: returnDoc.processedBy,
            createdAt: returnDoc.createdAt
        };

        res.status(201).json({
            success: true,
            message: `Product (${productName}) returned successfully. Inventory status updated to AVAILABLE.`,
            returnRecord: sanitizedReturn
        });
    } catch (error) {
        if (session) {
            try {
                await session.abortTransaction();
                session.endSession();
            } catch (abortErr) {
                // Ignore abort error
            }
        }
        next(error);
    }
};

// @desc    Get all product returns with search, filters, and summary metrics
// @route   GET /api/returns
const getReturns = async (req, res, next) => {
    try {
        const { search, startDate, endDate, invoiceId, laptopId } = req.query;
        let query = {};

        if (invoiceId) {
            query.invoice = invoiceId;
        }

        if (laptopId) {
            query.laptop = laptopId;
        }

        if (startDate || endDate) {
            query.returnedAt = {};
            if (startDate) {
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                query.returnedAt.$gte = sDate;
            }
            if (endDate) {
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                query.returnedAt.$lte = eDate;
            }
        }

        // Exclude internal purchasePrice from projection
        let returns = await Return.find(query)
            .select("-purchasePrice")
            .populate("customer", "name phone email address")
            .populate({
                path: "laptop",
                select: "brand model serialNumber processor ram storage condition sellingPrice status"
            })
            .populate({
                path: "invoice",
                select: "invoiceNumber totalAmount discount paymentStatus paymentMethod createdAt"
            })
            .sort({ returnedAt: -1 });

        // Apply text search filtering if specified
        if (search && search.trim() !== "") {
            const term = search.trim().toLowerCase();
            returns = returns.filter(r => {
                const invNumMatch = r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(term);
                const prodMatch = r.productName && r.productName.toLowerCase().includes(term);
                const snMatch = r.serialNumber && r.serialNumber.toLowerCase().includes(term);
                const reasonMatch = r.reason && r.reason.toLowerCase().includes(term);
                const custNameMatch = r.customer?.name && r.customer.name.toLowerCase().includes(term);
                const custPhoneMatch = r.customer?.phone && r.customer.phone.toLowerCase().includes(term);

                return invNumMatch || prodMatch || snMatch || reasonMatch || custNameMatch || custPhoneMatch;
            });
        }

        // Summary metrics
        const totalRefundedAmount = returns.reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);
        const totalReturnedUnits = returns.reduce((sum, r) => sum + (Number(r.returnedQuantity) || 0), 0);
        const totalReturnsCount = returns.length;

        res.status(200).json({
            success: true,
            summary: {
                totalRefundedAmount: Math.round(totalRefundedAmount),
                totalReturnedUnits,
                totalReturnsCount
            },
            returns
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single return by ID
// @route   GET /api/returns/:id
const getReturnById = async (req, res, next) => {
    try {
        const returnRecord = await Return.findById(req.params.id)
            .select("-purchasePrice")
            .populate("customer", "name phone email address")
            .populate({
                path: "laptop",
                select: "brand model serialNumber processor ram storage condition sellingPrice status"
            })
            .populate({
                path: "invoice",
                select: "invoiceNumber totalAmount discount paymentStatus paymentMethod createdAt"
            });

        if (!returnRecord) {
            return res.status(404).json({
                success: false,
                message: "Return record not found."
            });
        }

        res.status(200).json({
            success: true,
            returnRecord
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all returns for a specific invoice with item status breakdown
// @route   GET /api/invoices/:invoiceId/returns or GET /api/returns/invoice/:invoiceId
const getInvoiceReturns = async (req, res, next) => {
    try {
        const { invoiceId } = req.params;

        const invoice = await Invoice.findById(invoiceId)
            .populate("items.laptop")
            .populate("laptop");

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found."
            });
        }

        const returns = await Return.find({ invoice: invoiceId })
            .select("-purchasePrice")
            .populate("customer", "name phone email")
            .sort({ returnedAt: -1 });

        // Calculate item return breakdown
        const items = (invoice.items && invoice.items.length > 0)
            ? invoice.items
            : (invoice.laptop ? [{ laptop: invoice.laptop, sellingPrice: invoice.sellingPrice || invoice.totalAmount }] : []);

        const invoiceDiscount = Math.max(0, Number(invoice.discount) || 0);
        const itemsSubtotal = items.reduce((sum, it) => sum + (Number(it.sellingPrice) || 0), 0);

        let totalInvoiceRefunded = 0;
        let totalInvoiceReturnedUnits = 0;

        const itemReturnStatuses = items.map(item => {
            const l = item.laptop || {};
            const laptopId = l._id ? l._id.toString() : "";
            const soldQty = item.quantity ? Number(item.quantity) : 1;
            const itemPrice = Number(item.sellingPrice) || 0;

            let itemDiscount = 0;
            if (itemsSubtotal > 0 && invoiceDiscount > 0) {
                itemDiscount = (invoiceDiscount * itemPrice) / itemsSubtotal;
            }
            const finalSellingPriceAfterDiscount = Math.max(0, itemPrice - itemDiscount);

            const itemReturns = returns.filter(r => {
                const rLaptopId = r.laptop?._id ? r.laptop._id.toString() : r.laptop?.toString();
                return rLaptopId === laptopId;
            });

            const returnedQty = itemReturns.reduce((sum, r) => sum + (Number(r.returnedQuantity) || 0), 0);
            const remainingReturnableQty = Math.max(0, soldQty - returnedQty);
            const itemTotalRefund = itemReturns.reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);

            totalInvoiceRefunded += itemTotalRefund;
            totalInvoiceReturnedUnits += returnedQty;

            let returnStatus = "NOT_RETURNED";
            if (returnedQty >= soldQty) {
                returnStatus = "FULLY_RETURNED";
            } else if (returnedQty > 0) {
                returnStatus = "PARTIALLY_RETURNED";
            }

            return {
                laptopId,
                brand: l.brand || "",
                model: l.model || "",
                serialNumber: l.serialNumber || "",
                processor: l.processor || "",
                ram: l.ram || "",
                storage: l.storage || "",
                condition: l.condition || "",
                soldQuantity: soldQty,
                returnedQuantity: returnedQty,
                remainingReturnableQty,
                originalSellingPrice: itemPrice,
                originalSellingPriceAfterDiscount: finalSellingPriceAfterDiscount,
                refundAmount: itemTotalRefund,
                returnStatus,
                returns: itemReturns
            };
        });

        // Determine overall invoice return status
        const allItemsFullyReturned = itemReturnStatuses.every(it => it.returnStatus === "FULLY_RETURNED");
        const anyItemReturned = itemReturnStatuses.some(it => it.returnedQuantity > 0);

        let overallReturnStatus = "NOT_RETURNED";
        if (allItemsFullyReturned && itemReturnStatuses.length > 0) {
            overallReturnStatus = "FULLY_RETURNED";
        } else if (anyItemReturned) {
            overallReturnStatus = "PARTIALLY_RETURNED";
        }

        res.status(200).json({
            success: true,
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            overallReturnStatus,
            totalRefunded: Math.round(totalInvoiceRefunded),
            totalReturnedUnits: totalInvoiceReturnedUnits,
            itemReturnStatuses,
            returns
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createReturn,
    getReturns,
    getReturnById,
    getInvoiceReturns
};
