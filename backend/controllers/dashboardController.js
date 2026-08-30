const Laptop = require("../models/Laptop");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");

// @desc    Get comprehensive dashboard metrics & recent invoices
// @route   GET /api/dashboard/stats
const getDashboardStats = async (req, res, next) => {
    try {
        // Laptop metrics
        const totalLaptops = await Laptop.countDocuments();
        const availableLaptops = await Laptop.countDocuments({ status: "AVAILABLE" });
        const soldLaptops = await Laptop.countDocuments({ status: "SOLD" });
        const totalCustomers = await Customer.countDocuments();

        // Invoice metrics
        const allInvoices = await Invoice.find();

        let totalSales = 0;
        let totalPaid = 0;
        let pendingPayments = 0;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        let todaySales = 0;

        allInvoices.forEach(inv => {
            const amount = inv.totalAmount || 0;
            const paid = inv.amountPaid || 0;
            totalSales += amount;
            totalPaid += paid;
            
            const bal = Math.max(0, amount - paid);
            pendingPayments += bal;

            if (new Date(inv.createdAt) >= startOfToday) {
                todaySales += amount;
            }
        });

        // 5 most recent invoices
        const recentInvoices = await Invoice.find()
            .populate("customer")
            .populate("items.laptop")
            .populate("laptop")
            .sort({ createdAt: -1 })
            .limit(5);

        // Brand breakdown for available stock
        const brandStats = await Laptop.aggregate([
            { $match: { status: "AVAILABLE" } },
            { $group: { _id: "$brand", count: { $sum: 1 }, totalValue: { $sum: "$sellingPrice" } } },
            { $sort: { count: -1 } }
        ]);

        // Inventory financial metrics
        const availableLaptopsData = await Laptop.find({ status: "AVAILABLE" });
        const stockPurchaseValue = availableLaptopsData.reduce((acc, l) => acc + (l.purchasePrice || 0), 0);
        const stockSellingValue = availableLaptopsData.reduce((acc, l) => acc + (l.sellingPrice || 0), 0);

        res.status(200).json({
            metrics: {
                totalLaptops,
                availableLaptops,
                soldLaptops,
                totalCustomers,
                totalSales,
                todaySales,
                pendingPayments,
                stockPurchaseValue,
                stockSellingValue
            },
            recentInvoices,
            brandStats
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardStats
};
