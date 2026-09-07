const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const Laptop = require("../models/Laptop");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Return = require("../models/Return");
const { getProfitAnalytics } = require("../controllers/dashboardController");

async function testMonthWiseProfit() {
    console.log("==================================================");
    console.log("TESTING MONTH-WISE PROFIT ATTRIBUTION");
    console.log("==================================================");

    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/laptop-bill";
    await mongoose.connect(mongoUri);

    let createdLaptops = [];
    let createdInvoices = [];
    let createdCustomers = [];
    let createdReturns = [];

    try {
        const customer = await Customer.create({
            name: "Month Wise Test Customer",
            phone: "9123456780",
            email: "monthwise@example.com",
            address: "Mysore"
        });
        createdCustomers.push(customer._id);

        // Laptop 1: Purchase 40k, Selling 50k
        const laptop = await Laptop.create({
            brand: "Dell",
            model: "Latitude Month Test",
            serialNumber: `MONTH-SN-${Date.now()}`,
            processor: "i7",
            ram: "16GB",
            storage: "512GB",
            condition: "Mint",
            purchasePrice: 40000,
            sellingPrice: 50000,
            status: "SOLD"
        });
        createdLaptops.push(laptop._id);

        // August 15, 2026 Sale: SP = 50k, PP = 40k -> Profit = 10,000
        const augustDate = new Date("2026-08-15T10:00:00.000Z");
        const invoice = await Invoice.create({
            invoiceNumber: `INV-AUG-${Date.now()}`,
            customer: customer._id,
            items: [{ laptop: laptop._id, sellingPrice: 50000 }],
            subtotal: 50000,
            discount: 0,
            tax: 0,
            totalAmount: 50000,
            paymentMethod: "CASH",
            paymentStatus: "PAID",
            amountPaid: 50000,
            createdAt: augustDate,
            updatedAt: augustDate
        });
        createdInvoices.push(invoice._id);

        // September 5, 2026 Return: Customer Refund = 45k, Purchase = 40k -> Profit Impact = -5,000
        const septemberDate = new Date("2026-09-05T10:00:00.000Z");
        const returnDoc = await Return.create({
            invoice: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            customer: customer._id,
            laptop: laptop._id,
            productName: "Dell Latitude Month Test",
            serialNumber: laptop.serialNumber,
            soldQuantity: 1,
            returnedQuantity: 1,
            originalSellingPrice: 50000,
            originalSellingPriceAfterDiscount: 50000,
            purchasePrice: 40000,
            refundAmount: 45000,
            profitImpact: -5000,
            reason: "Returned in September",
            returnedAt: septemberDate,
            createdAt: septemberDate
        });
        createdReturns.push(returnDoc._id);

        let profitRes = null;
        await getProfitAnalytics({}, { status: () => ({ json: (d) => { profitRes = d; } }) }, (err) => { throw err; });

        const augMonth = profitRes.monthlyProfit.find(m => m.key === "2026-08");
        const sepMonth = profitRes.monthlyProfit.find(m => m.key === "2026-09");

        console.log("August 2026 Metrics:");
        console.log(`  - Gross Sales Profit: ₹${augMonth?.grossSalesProfit}`);
        console.log(`  - Refunds: ₹${augMonth?.refunds}`);
        console.log(`  - Net Profit: ₹${augMonth?.profit}`);

        console.log("\nSeptember 2026 Metrics:");
        console.log(`  - Gross Sales Profit: ₹${sepMonth?.grossSalesProfit}`);
        console.log(`  - Refunds: ₹${sepMonth?.refunds}`);
        console.log(`  - Return Impact: ₹${sepMonth?.returnProfitImpact}`);
        console.log(`  - Net Profit: ₹${sepMonth?.profit}`);

        // Verify August profit has no refunds and recorded the 10,000 profit
        if (augMonth && augMonth.grossSalesProfit >= 10000 && (augMonth.refunds || 0) === 0) {
            console.log("✓ PASS: August sales profit recorded in August without September refund interference");
        } else {
            throw new Error(`FAIL: August metrics unexpected: ${JSON.stringify(augMonth)}`);
        }

        // Verify September recorded the refund and profit impact
        if (sepMonth && sepMonth.refunds >= 45000 && sepMonth.returnProfitImpact <= -5000) {
            console.log("✓ PASS: September correctly recorded the return refund (₹45k) and profit impact (-₹5k)");
        } else {
            throw new Error(`FAIL: September metrics unexpected: ${JSON.stringify(sepMonth)}`);
        }

        console.log("\n✓ MONTH-WISE PROFIT ATTRIBUTION TEST PASSED 100%!");
    } finally {
        if (createdReturns.length > 0) await Return.deleteMany({ _id: { $in: createdReturns } });
        if (createdInvoices.length > 0) await Invoice.deleteMany({ _id: { $in: createdInvoices } });
        if (createdLaptops.length > 0) await Laptop.deleteMany({ _id: { $in: createdLaptops } });
        if (createdCustomers.length > 0) await Customer.deleteMany({ _id: { $in: createdCustomers } });
        await mongoose.disconnect();
    }
}

testMonthWiseProfit()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
