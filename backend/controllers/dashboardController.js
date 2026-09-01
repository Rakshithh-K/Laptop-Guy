const Laptop = require("../models/Laptop");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Helper to compute profit and sold units for an invoice doc without leaking purchasePrice
// Profit = Final Selling Price After Discount - Laptop Purchase Price
// For multi-item invoices, discount is allocated proportionally based on each item's selling price:
// itemDiscount = (invoiceDiscount * itemSellingPrice) / itemsSubtotal
// finalSellingPrice = itemSellingPrice - itemDiscount
// itemProfit = finalSellingPrice - item.laptop.purchasePrice
const getInvoiceItemMetrics = (inv) => {
    let profit = 0;
    let itemsCount = 0;
    const invoiceDiscount = Math.max(0, Number(inv.discount) || 0);

    if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
        // Calculate items subtotal
        const subtotal = inv.items.reduce((sum, item) => sum + (Number(item.sellingPrice) || 0), 0);

        inv.items.forEach((item) => {
            const itemSellingPrice = Number(item.sellingPrice) || 0;
            let itemDiscount = 0;

            if (subtotal > 0 && invoiceDiscount > 0) {
                itemDiscount = (invoiceDiscount * itemSellingPrice) / subtotal;
            }

            const finalSellingPrice = itemSellingPrice - itemDiscount;
            const laptop = item.laptop;
            const purchasePrice = (laptop && typeof laptop === "object") ? (Number(laptop.purchasePrice) || 0) : 0;
            
            const itemProfit = finalSellingPrice - purchasePrice;
            profit += itemProfit;

            if (laptop) {
                itemsCount += 1;
            }
        });
    } else if (inv.laptop) {
        // Legacy single-item format
        const itemSellingPrice = Number(inv.sellingPrice !== undefined ? inv.sellingPrice : (inv.subtotal || inv.totalAmount)) || 0;
        const finalSellingPrice = Math.max(0, itemSellingPrice - invoiceDiscount);
        const laptop = inv.laptop;
        const purchasePrice = (laptop && typeof laptop === "object") ? (Number(laptop.purchasePrice) || 0) : 0;
        
        const itemProfit = finalSellingPrice - purchasePrice;
        profit += itemProfit;
        itemsCount += 1;
    }

    return { profit, itemsCount };
};

// @desc    Get comprehensive dashboard metrics & recent invoices
// @route   GET /api/dashboard/stats
const getDashboardStats = async (req, res, next) => {
    try {
        // Laptop metrics
        const totalLaptops = await Laptop.countDocuments();
        const availableLaptops = await Laptop.countDocuments({ status: "AVAILABLE" });
        const soldLaptops = await Laptop.countDocuments({ status: "SOLD" });
        const totalCustomers = await Customer.countDocuments();

        // Invoice metrics (populate laptop internally for profit calculation only)
        const allInvoices = await Invoice.find()
            .populate("items.laptop")
            .populate("laptop");

        let totalSales = 0;
        let totalPaid = 0;
        let pendingPayments = 0;
        let totalProfit = 0;

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

            const { profit } = getInvoiceItemMetrics(inv);
            totalProfit += profit;
        });

        // 5 most recent invoices (explicitly exclude purchasePrice from populated laptops)
        const recentInvoices = await Invoice.find()
            .populate("customer")
            .populate({ path: "items.laptop", select: "-purchasePrice" })
            .populate({ path: "laptop", select: "-purchasePrice" })
            .sort({ createdAt: -1 })
            .limit(5);

        // Brand breakdown for available stock
        const brandStats = await Laptop.aggregate([
            { $match: { status: "AVAILABLE" } },
            { $group: { _id: "$brand", count: { $sum: 1 }, totalValue: { $sum: "$sellingPrice" } } },
            { $sort: { count: -1 } }
        ]);

        // Inventory financial metrics
        const allLaptopsData = await Laptop.find();
        const availableLaptopsData = allLaptopsData.filter(l => l.status === "AVAILABLE");
        const stockPurchaseValue = availableLaptopsData.reduce((acc, l) => acc + (l.purchasePrice || 0), 0);
        const stockSellingValue = availableLaptopsData.reduce((acc, l) => acc + (l.sellingPrice || 0), 0);
        const totalHistoricalInvestment = allLaptopsData.reduce((acc, l) => acc + (l.purchasePrice || 0), 0);

        res.status(200).json({
            metrics: {
                totalLaptops,
                availableLaptops,
                soldLaptops,
                totalCustomers,
                totalSales,
                todaySales,
                pendingPayments,
                totalProfit: Math.round(totalProfit),
                stockPurchaseValue: Math.round(stockPurchaseValue),
                stockSellingValue: Math.round(stockSellingValue),
                totalInvestment: Math.round(totalHistoricalInvestment)
            },
            recentInvoices,
            brandStats
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get detailed profit analytics and month-wise profit distribution
// @route   GET /api/dashboard/profit
const getProfitAnalytics = async (req, res, next) => {
    try {
        // Fetch all invoices and populate laptop references for calculation
        const allInvoices = await Invoice.find()
            .populate("items.laptop")
            .populate("laptop")
            .sort({ createdAt: 1 });

        let overallProfit = 0;
        let totalSoldUnits = 0;
        let totalRevenue = 0;

        const monthMap = new Map();

        allInvoices.forEach(inv => {
            const { profit, itemsCount } = getInvoiceItemMetrics(inv);
            const amount = Number(inv.totalAmount) || 0;

            overallProfit += profit;
            totalSoldUnits += itemsCount;
            totalRevenue += amount;

            const invDate = new Date(inv.createdAt);
            const year = invDate.getFullYear();
            const monthIndex = invDate.getMonth();
            const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

            if (!monthMap.has(monthKey)) {
                monthMap.set(monthKey, {
                    year,
                    monthIndex,
                    profit: 0,
                    soldUnits: 0,
                    revenue: 0,
                    invoiceCount: 0
                });
            }

            const current = monthMap.get(monthKey);
            current.profit += profit;
            current.soldUnits += itemsCount;
            current.revenue += amount;
            current.invoiceCount += 1;
        });

        // Build continuous chronological timeline
        let monthlyProfit = [];

        if (monthMap.size > 0) {
            const sortedKeys = Array.from(monthMap.keys()).sort();
            const [earliestYear, earliestMonth] = sortedKeys[0].split("-").map(Number);
            
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;

            const [latestYear, latestMonth] = sortedKeys[sortedKeys.length - 1].split("-").map(Number);
            
            // Span up to whichever is later: current date or latest invoice
            const endYear = Math.max(currentYear, latestYear);
            const endMonth = (endYear === latestYear && endYear === currentYear)
                ? Math.max(currentMonth, latestMonth)
                : (endYear > latestYear ? currentMonth : latestMonth);

            let curY = earliestYear;
            let curM = earliestMonth;

            while (curY < endYear || (curY === endYear && curM <= endMonth)) {
                const key = `${curY}-${String(curM).padStart(2, "0")}`;
                const mIndex = curM - 1;
                const existing = monthMap.get(key);

                monthlyProfit.push({
                    key,
                    month: `${MONTH_NAMES[mIndex]} ${curY}`,
                    fullMonth: `${FULL_MONTH_NAMES[mIndex]} ${curY}`,
                    shortMonth: MONTH_NAMES[mIndex],
                    year: curY,
                    monthNumber: curM,
                    profit: existing ? Math.round(existing.profit) : 0,
                    soldUnits: existing ? existing.soldUnits : 0,
                    revenue: existing ? Math.round(existing.revenue) : 0,
                    invoiceCount: existing ? existing.invoiceCount : 0
                });

                curM += 1;
                if (curM > 12) {
                    curM = 1;
                    curY += 1;
                }
            }
        }

        res.status(200).json({
            success: true,
            overallProfit: Math.round(overallProfit),
            totalSoldUnits,
            totalRevenue: Math.round(totalRevenue),
            monthlyProfit
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get detailed investment analytics and month-wise inventory acquisition cost
// @route   GET /api/dashboard/investment
const getInvestmentAnalytics = async (req, res, next) => {
    try {
        // Fetch all laptops (both AVAILABLE and SOLD)
        const allLaptops = await Laptop.find().sort({ createdAt: 1, _id: 1 });

        let currentInvestment = 0;
        let totalInvestment = 0;
        let inventoryCount = 0;
        const totalLaptopsCount = allLaptops.length;

        const monthMap = new Map();

        allLaptops.forEach((laptop) => {
            const purchasePrice = Number(laptop.purchasePrice) || 0;
            totalInvestment += purchasePrice;

            if (laptop.status === "AVAILABLE") {
                currentInvestment += purchasePrice;
                inventoryCount += 1;
            }

            // Determine stock purchase/entry date from createdAt or _id timestamp
            let purchaseDate;
            if (laptop.createdAt) {
                purchaseDate = new Date(laptop.createdAt);
            } else if (laptop._id && typeof laptop._id.getTimestamp === "function") {
                purchaseDate = laptop._id.getTimestamp();
            } else {
                purchaseDate = new Date();
            }

            const year = purchaseDate.getFullYear();
            const monthIndex = purchaseDate.getMonth();
            const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

            if (!monthMap.has(monthKey)) {
                monthMap.set(monthKey, {
                    year,
                    monthIndex,
                    investment: 0,
                    laptopCount: 0
                });
            }

            const current = monthMap.get(monthKey);
            current.investment += purchasePrice;
            current.laptopCount += 1;
        });

        const averagePurchasePrice = inventoryCount > 0 ? (currentInvestment / inventoryCount) : 0;
        const historicalAveragePrice = totalLaptopsCount > 0 ? (totalInvestment / totalLaptopsCount) : 0;

        // Build continuous chronological timeline
        let monthlyInvestment = [];

        if (monthMap.size > 0) {
            const sortedKeys = Array.from(monthMap.keys()).sort();
            const [earliestYear, earliestMonth] = sortedKeys[0].split("-").map(Number);

            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;

            const [latestYear, latestMonth] = sortedKeys[sortedKeys.length - 1].split("-").map(Number);

            const endYear = Math.max(currentYear, latestYear);
            const endMonth = (endYear === latestYear && endYear === currentYear)
                ? Math.max(currentMonth, latestMonth)
                : (endYear > latestYear ? currentMonth : latestMonth);

            let curY = earliestYear;
            let curM = earliestMonth;

            while (curY < endYear || (curY === endYear && curM <= endMonth)) {
                const key = `${curY}-${String(curM).padStart(2, "0")}`;
                const mIndex = curM - 1;
                const existing = monthMap.get(key);

                monthlyInvestment.push({
                    key,
                    month: `${MONTH_NAMES[mIndex]} ${curY}`,
                    fullMonth: `${FULL_MONTH_NAMES[mIndex]} ${curY}`,
                    shortMonth: MONTH_NAMES[mIndex],
                    year: curY,
                    monthNumber: curM,
                    investment: existing ? Math.round(existing.investment) : 0,
                    laptopCount: existing ? existing.laptopCount : 0
                });

                curM += 1;
                if (curM > 12) {
                    curM = 1;
                    curY += 1;
                }
            }
        }

        res.status(200).json({
            success: true,
            currentInvestment: Math.round(currentInvestment),
            totalInvestment: Math.round(totalInvestment),
            inventoryCount,
            totalLaptopsCount,
            averagePurchasePrice: Math.round(averagePurchasePrice),
            historicalAveragePrice: Math.round(historicalAveragePrice),
            monthlyInvestment
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardStats,
    getProfitAnalytics,
    getInvestmentAnalytics
};
