const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    email: {
        type: String
    },

    address: {
        type: String,
        required: true
    },

    gstin: {
        type: String
    }
});

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;