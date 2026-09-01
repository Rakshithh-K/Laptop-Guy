const mongoose = require("mongoose");

const laptopSchema = new mongoose.Schema(
    {
        brand: {
            type: String,
            required: true
        },

        model: {
            type: String,
            required: true
        },

        serialNumber: {
            type: String,
            required: true,
            unique: true
        },

        processor: {
            type: String,
            required: true
        },

        ram: {
            type: String,
            required: true
        },

        storage: {
            type: String,
            required: true
        },

        condition: {
            type: String,
            required: true
        },

        purchasePrice: {
            type: Number,
            required: true
        },

        sellingPrice: {
            type: Number,
            required: true
        },

        warranty: {
            type: String
        },

        status: {
            type: String,
            enum: ["AVAILABLE", "SOLD"],
            default: "AVAILABLE"
        }
    },
    {
        timestamps: true
    }
);

const Laptop = mongoose.model("Laptop", laptopSchema);

module.exports = Laptop;