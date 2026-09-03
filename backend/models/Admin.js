const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        passwordHash: {
            type: String,
            default: null
        },

        // OTP verification fields
        otpHash: {
            type: String,
            default: null
        },

        otpExpiresAt: {
            type: Date,
            default: null
        },

        otpAttempts: {
            type: Number,
            default: 0
        },

        otpLastSentAt: {
            type: Date,
            default: null
        },

        // Password reset/setup session token
        resetToken: {
            type: String,
            default: null
        },

        resetTokenExpiresAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
