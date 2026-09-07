const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema(
    {
        invoice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice",
            required: true
        },
        invoiceNumber: {
            type: String,
            required: true
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true
        },
        laptop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Laptop",
            required: true
        },
        productName: {
            type: String,
            required: true
        },
        serialNumber: {
            type: String,
            required: true
        },
        soldQuantity: {
            type: Number,
            default: 1,
            min: 1
        },
        returnedQuantity: {
            type: Number,
            required: true,
            default: 1,
            min: 1
        },
        originalSellingPrice: {
            type: Number,
            required: true
        },
        originalSellingPriceAfterDiscount: {
            type: Number,
            required: true
        },
        // purchasePrice is strictly internal for backend financial and profit calculation
        // NEVER expose this field in customer-facing APIs or UI
        purchasePrice: {
            type: Number,
            required: true
        },
        refundAmount: {
            type: Number,
            required: true,
            min: 0
        },
        // profitImpact = purchasePrice - refundAmount
        // (Reverses the sale profit impact while accounting for the refund)
        profitImpact: {
            type: Number,
            required: true
        },
        reason: {
            type: String,
            trim: true,
            default: ""
        },
        returnedAt: {
            type: Date,
            default: Date.now
        },
        processedBy: {
            type: String,
            default: "laptopguysales@gmail.com"
        }
    },
    {
        timestamps: true
    }
);

// Index for fast search and aggregation
returnSchema.index({ invoice: 1 });
returnSchema.index({ laptop: 1 });
returnSchema.index({ returnedAt: -1 });

module.exports = mongoose.model("Return", returnSchema);
