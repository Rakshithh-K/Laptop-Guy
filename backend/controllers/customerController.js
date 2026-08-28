const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");

// @desc    Get all customers with aggregated purchase statistics
// @route   GET /api/customers
const getCustomers = async (req, res, next) => {
    try {
        const { search } = req.query;
        let filter = {};

        if (search && search.trim() !== "") {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { name: searchRegex },
                { phone: searchRegex },
                { email: searchRegex },
                { gstin: searchRegex }
            ];
        }

        const customers = await Customer.find(filter).sort({ _id: -1 });

        // Calculate purchase counts and total spent per customer from invoices
        const customerIds = customers.map(c => c._id);
        const invoiceAgg = await Invoice.aggregate([
            { $match: { customer: { $in: customerIds } } },
            {
                $group: {
                    _id: "$customer",
                    purchaseCount: { $sum: 1 },
                    totalSpent: { $sum: "$totalAmount" }
                }
            }
        ]);

        const statsMap = {};
        invoiceAgg.forEach(item => {
            statsMap[item._id.toString()] = {
                purchaseCount: item.purchaseCount,
                totalSpent: item.totalSpent
            };
        });

        const result = customers.map(cust => {
            const stats = statsMap[cust._id.toString()] || { purchaseCount: 0, totalSpent: 0 };
            return {
                ...cust.toObject(),
                purchaseCount: stats.purchaseCount,
                totalSpent: stats.totalSpent
            };
        });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single customer by ID with invoice history
// @route   GET /api/customers/:id
const getCustomerById = async (req, res, next) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        const invoices = await Invoice.find({ customer: customer._id })
            .populate("laptop")
            .sort({ createdAt: -1 });

        const totalSpent = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);

        res.status(200).json({
            ...customer.toObject(),
            purchaseCount: invoices.length,
            totalSpent,
            invoices
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new customer
// @route   POST /api/customers
const createCustomer = async (req, res, next) => {
    try {
        const { name, phone, email, address, gstin } = req.body;

        if (!name || !phone || !address) {
            return res.status(400).json({
                success: false,
                message: "Name, phone number, and address are required fields."
            });
        }

        // Validate email format if provided
        if (email && email.trim() !== "") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid email address."
                });
            }
        }

        const customer = await Customer.create({
            name: name.trim(),
            phone: phone.trim(),
            email: email ? email.trim() : "",
            address: address.trim(),
            gstin: gstin ? gstin.trim().toUpperCase() : ""
        });

        res.status(201).json(customer);
    } catch (error) {
        next(error);
    }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res, next) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        const { name, phone, email, address, gstin } = req.body;

        if (name) customer.name = name.trim();
        if (phone) customer.phone = phone.trim();
        if (email !== undefined) customer.email = email ? email.trim() : "";
        if (address) customer.address = address.trim();
        if (gstin !== undefined) customer.gstin = gstin ? gstin.trim().toUpperCase() : "";

        const updated = await customer.save();
        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res, next) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        // Check if customer has invoices
        const hasInvoice = await Invoice.findOne({ customer: customer._id });
        if (hasInvoice) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete customer with existing invoice records."
            });
        }

        await Customer.findByIdAndDelete(req.params.id);
        res.status(200).json({
            success: true,
            message: "Customer removed successfully"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
};
