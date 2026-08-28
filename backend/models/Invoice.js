const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true
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

        sellingPrice: {
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

        totalAmount: {
            type: Number,
            required: true
        },

        paymentMethod: {
            type: String,
            enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER"],
            required: true
        },

        paymentStatus: {
            type: String,
            enum: ["PAID", "PARTIAL", "PENDING"],
            default: "PENDING"
        },

        amountPaid: {
            type: Number,
            default: 0
        },

        warranty: {
            type: String
        },

        emailStatus: {
            type: String,
            enum: ["PENDING", "SENT", "FAILED"],
            default: "PENDING"
        },

        emailSentAt: {
            type: Date
        },

        emailError: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;