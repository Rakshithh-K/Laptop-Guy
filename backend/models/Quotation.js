const mongoose = require("mongoose");

const quotationItemSchema = new mongoose.Schema(
    {
        laptop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Laptop",
            required: true
        },
        // Snapshot fields to preserve specs at time of quotation
        brand: { type: String, default: "" },
        model: { type: String, default: "" },
        serialNumber: { type: String, default: "" },
        processor: { type: String, default: "" },
        ram: { type: String, default: "" },
        storage: { type: String, default: "" },
        condition: { type: String, default: "" },
        warranty: { type: String, default: "" },
        purchasePrice: {
            type: Number,
            required: true,
            default: 0
        },
        originalSellingPrice: {
            type: Number,
            required: true,
            default: 0
        },
        quotedPrice: {
            type: Number,
            required: true
        }
    },
    { _id: true }
);

const quotationSchema = new mongoose.Schema(
    {
        quotationNumber: {
            type: String,
            required: true,
            unique: true
        },

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true
        },

        items: [quotationItemSchema],

        subtotal: {
            type: Number,
            required: true
        },

        discount: {
            type: Number,
            default: 0
        },

        tax: {
            type: Number,
            default: 0
        },

        totalQuotedAmount: {
            type: Number,
            required: true
        },

        validityDays: {
            type: Number,
            default: 7
        },

        validUntil: {
            type: Date
        },

        notes: {
            type: String,
            default: "This quotation is valid for 7 days from the date of issue. Prices and stock availability are subject to confirmation at the time of purchase."
        },

        status: {
            type: String,
            enum: ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED"],
            default: "PENDING"
        }
    },
    {
        timestamps: true
    }
);

const Quotation = mongoose.model("Quotation", quotationSchema);

module.exports = Quotation;
