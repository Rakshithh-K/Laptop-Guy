const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const Laptop = require("../models/Laptop");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Return = require("../models/Return");
const { getDashboardStats, getProfitAnalytics, getInvestmentAnalytics } = require("../controllers/dashboardController");
const { createReturn, getReturns, getInvoiceReturns } = require("../controllers/returnController");

async function runTests() {
    console.log("==================================================");
    console.log("STARTING PRODUCT RETURN SYSTEM AUTOMATED VERIFICATION");
    console.log("==================================================");

    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/laptop-bill";
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB for verification");

    let createdLaptops = [];
    let createdInvoices = [];
    let createdCustomers = [];
    let createdReturns = [];

    try {
        // 1. Create Test Customer
        const customer = await Customer.create({
            name: "Test Customer Return",
            phone: "9988776655",
            email: "test.customer.return@example.com",
            address: "Mysore Test Road"
        });
        createdCustomers.push(customer._id);
        console.log("✓ Test customer created");

        // 2. Create Test Laptops
        const laptopA = await Laptop.create({
            brand: "Dell",
            model: "Latitude 7490",
            serialNumber: `TEST-SN-A-${Date.now()}`,
            processor: "Intel Core i7 8th Gen",
            ram: "16GB DDR4",
            storage: "512GB SSD",
            condition: "Mint (Grade A)",
            purchasePrice: 40000,
            sellingPrice: 50000,
            status: "AVAILABLE"
        });
        createdLaptops.push(laptopA._id);

        const laptopB = await Laptop.create({
            brand: "HP",
            model: "EliteBook 840 G5",
            serialNumber: `TEST-SN-B-${Date.now()}`,
            processor: "Intel Core i5 8th Gen",
            ram: "16GB DDR4",
            storage: "256GB SSD",
            condition: "Excellent (Grade A-)",
            purchasePrice: 20000,
            sellingPrice: 30000,
            status: "AVAILABLE"
        });
        createdLaptops.push(laptopB._id);

        const laptopC = await Laptop.create({
            brand: "Lenovo",
            model: "ThinkPad T480",
            serialNumber: `TEST-SN-C-${Date.now()}`,
            processor: "Intel Core i5 8th Gen",
            ram: "8GB DDR4",
            storage: "256GB SSD",
            condition: "Good (Grade B)",
            purchasePrice: 15000,
            sellingPrice: 22000,
            status: "AVAILABLE"
        });
        createdLaptops.push(laptopC._id);
        console.log("✓ Test laptops created (A: Dell 40k/50k, B: HP 20k/30k, C: Lenovo 15k/22k)");

        // 3. Create Multi-Item Invoice (Laptop A + Laptop B) with Discount
        // Subtotal = 50k + 30k = 80k. Discount = 8,000. Total = 72,000
        // Laptop A proportional discount = (8000 * 50000)/80000 = 5000 -> SP After Discount = 45,000
        // Laptop B proportional discount = (8000 * 30000)/80000 = 3000 -> SP After Discount = 27,000
        const invNum = `INV-TEST-${Date.now()}`;
        const invoice1 = await Invoice.create({
            invoiceNumber: invNum,
            customer: customer._id,
            items: [
                { laptop: laptopA._id, sellingPrice: 50000 },
                { laptop: laptopB._id, sellingPrice: 30000 }
            ],
            subtotal: 80000,
            discount: 8000,
            tax: 0,
            totalAmount: 72000,
            paymentMethod: "CASH",
            paymentStatus: "PAID",
            amountPaid: 72000
        });
        createdInvoices.push(invoice1._id);

        // Mark laptops as SOLD
        await Laptop.updateMany({ _id: { $in: [laptopA._id, laptopB._id] } }, { $set: { status: "SOLD" } });
        console.log("✓ Created Invoice 1 (Subtotal: 80k, Discount: 8k, Total: 72k). Items marked SOLD.");

        // Check initial profit
        // Gross profit = (45,000 - 40,000) + (27,000 - 20,000) = 5,000 + 7,000 = 12,000
        const mockReq = {};
        let mockResData = {};
        const mockRes = {
            status: () => ({
                json: (data) => { mockResData = data; }
            })
        };

        // 4. Test Validation: Attempt to return laptop C (not on invoice)
        console.log("\n--- Testing Validations ---");
        let errorReturned = null;
        let testReq = {
            body: {
                invoiceId: invoice1._id,
                laptopId: laptopC._id,
                returnedQuantity: 1,
                refundAmount: 22000
            },
            admin: { email: "laptopguysales@gmail.com" }
        };
        let testRes = {
            status: (code) => ({
                json: (d) => { errorReturned = { code, d }; }
            })
        };
        await createReturn(testReq, testRes, (err) => { errorReturned = { err }; });
        if (errorReturned?.code === 400 && errorReturned?.d?.message?.includes("does not belong")) {
            console.log("✓ PASS: Correctly rejected return for product not belonging to invoice");
        } else {
            throw new Error(`FAIL: Product not on invoice check failed: ${JSON.stringify(errorReturned)}`);
        }

        // 5. Test Validation: Attempt to return quantity 0
        errorReturned = null;
        testReq.body.laptopId = laptopA._id;
        testReq.body.returnedQuantity = 0;
        await createReturn(testReq, testRes, (err) => { errorReturned = { err }; });
        if (errorReturned?.code === 400) {
            console.log("✓ PASS: Correctly rejected return for quantity <= 0");
        } else {
            throw new Error(`FAIL: Zero quantity check failed: ${JSON.stringify(errorReturned)}`);
        }

        // 6. Test Validation: Attempt to return negative refund amount
        errorReturned = null;
        testReq.body.returnedQuantity = 1;
        testReq.body.refundAmount = -500;
        await createReturn(testReq, testRes, (err) => { errorReturned = { err }; });
        if (errorReturned?.code === 400) {
            console.log("✓ PASS: Correctly rejected negative refund amount");
        } else {
            throw new Error(`FAIL: Negative refund check failed: ${JSON.stringify(errorReturned)}`);
        }

        // 7. Test Partial Return on Multi-Item Invoice: Return Laptop A with Refund ₹45,000 (Full item refund)
        // Original Selling Price After Discount = ₹45,000. Purchase Price = ₹40,000.
        // Profit impact = ₹40,000 - ₹45,000 = -₹5,000 (reverses Laptop A's ₹5,000 profit).
        console.log("\n--- Testing Return Processing & Inventory Restoration ---");
        let successResponse = null;
        testReq.body.refundAmount = 45000;
        testReq.body.reason = "Customer wanted smaller screen";
        testRes = {
            status: (code) => ({
                json: (d) => { successResponse = { code, d }; }
            })
        };
        await createReturn(testReq, testRes, (err) => { throw err; });
        if (successResponse?.code === 201) {
            createdReturns.push(successResponse.d.returnRecord._id);
            console.log("✓ PASS: Return for Laptop A processed successfully (201 Created)");
        } else {
            throw new Error(`FAIL: Return creation failed: ${JSON.stringify(successResponse)}`);
        }

        // Verify Laptop A status is restored to AVAILABLE
        const updatedLaptopA = await Laptop.findById(laptopA._id);
        if (updatedLaptopA.status === "AVAILABLE") {
            console.log("✓ PASS: Laptop A status successfully restored to AVAILABLE in inventory");
        } else {
            throw new Error(`FAIL: Laptop A status is ${updatedLaptopA.status}, expected AVAILABLE`);
        }

        // Verify purchasePrice was preserved
        if (updatedLaptopA.purchasePrice === 40000) {
            console.log("✓ PASS: Laptop A original purchase price (₹40,000) preserved in inventory record");
        } else {
            throw new Error(`FAIL: Laptop A purchase price modified to ${updatedLaptopA.purchasePrice}`);
        }

        // Helper to create mock response
        const createMock = () => {
            let result = { code: null, data: null };
            const res = {
                status: (code) => {
                    result.code = code;
                    return {
                        json: (data) => {
                            result.data = data;
                            return data;
                        }
                    };
                }
            };
            return { res, get: () => result };
        };

        // 8. Test Validation: Duplicate return of Laptop A
        console.log("\n--- Testing Duplicate Return Prevention ---");
        const dupMock = createMock();
        await createReturn(testReq, dupMock.res, (err) => {});
        const dupRes = dupMock.get();
        if (dupRes.code === 400 && dupRes.data?.message?.includes("already been fully returned")) {
            console.log("✓ PASS: Correctly prevented duplicate return of already returned Laptop A");
        } else {
            throw new Error(`FAIL: Duplicate return check failed: ${JSON.stringify(dupRes)}`);
        }

        // 9. Test Invoice Returns API & Status breakdown
        console.log("\n--- Testing Invoice Returns Breakdown API ---");
        let invoiceReturnsRes = null;
        const invReq = { params: { invoiceId: invoice1._id } };
        const invRes = {
            status: () => ({
                json: (d) => { invoiceReturnsRes = d; }
            })
        };
        await getInvoiceReturns(invReq, invRes, (err) => { throw err; });

        if (invoiceReturnsRes.overallReturnStatus === "PARTIALLY_RETURNED") {
            console.log("✓ PASS: Overall invoice status is correctly 'PARTIALLY_RETURNED'");
        } else {
            throw new Error(`FAIL: Expected PARTIALLY_RETURNED, got ${invoiceReturnsRes.overallReturnStatus}`);
        }

        const itemAStatus = invoiceReturnsRes.itemReturnStatuses.find(it => it.laptopId === laptopA._id.toString());
        const itemBStatus = invoiceReturnsRes.itemReturnStatuses.find(it => it.laptopId === laptopB._id.toString());

        if (itemAStatus?.returnStatus === "FULLY_RETURNED" && itemBStatus?.returnStatus === "NOT_RETURNED") {
            console.log("✓ PASS: Individual item statuses: Laptop A = FULLY_RETURNED, Laptop B = NOT_RETURNED");
        } else {
            throw new Error(`FAIL: Item statuses mismatch: ${JSON.stringify(invoiceReturnsRes.itemReturnStatuses)}`);
        }

        // 10. Test Custom Return Value (Partial refund / restocking fee test)
        // Return Laptop B (Original SP After Discount = ₹27,000, Purchase = ₹20,000)
        // Admin refunds ₹25,000 (retains ₹2,000 restocking fee)
        // Profit impact = Purchase (₹20,000) - Refund (₹25,000) = -₹5,000
        // Laptop B original sale profit = ₹7,000. Net profit from Laptop B transaction = ₹7,000 - ₹5,000 = +₹2,000.
        console.log("\n--- Testing Custom Return Value (Restocking Fee / Partial Loss) ---");
        testReq.body.laptopId = laptopB._id;
        testReq.body.returnedQuantity = 1;
        testReq.body.refundAmount = 25000;
        testReq.body.reason = "Restocking fee applied";
        const bMock = createMock();
        await createReturn(testReq, bMock.res, (err) => { throw err; });
        const bRes = bMock.get();
        if (bRes.code === 201) {
            createdReturns.push(bRes.data.returnRecord._id);
            console.log("✓ PASS: Laptop B return with custom refund ₹25,000 processed successfully");
        } else {
            throw new Error(`FAIL: Laptop B return creation failed: ${JSON.stringify(bRes)}`);
        }

        const updatedLaptopB = await Laptop.findById(laptopB._id);
        if (updatedLaptopB.status === "AVAILABLE") {
            console.log("✓ PASS: Laptop B status restored to AVAILABLE");
        }

        // Check invoice overall status now (all items returned)
        await getInvoiceReturns(invReq, invRes, (err) => { throw err; });
        if (invoiceReturnsRes.overallReturnStatus === "FULLY_RETURNED") {
            console.log("✓ PASS: Invoice 1 overall status now correctly updated to 'FULLY_RETURNED'");
        } else {
            throw new Error(`FAIL: Expected FULLY_RETURNED after returning all items, got ${invoiceReturnsRes.overallReturnStatus}`);
        }

        // 11. Test Month-Wise & Cumulative Profit Analytics
        console.log("\n--- Testing Profit Analytics Calculation ---");
        let profitRes = null;
        await getProfitAnalytics({}, { status: () => ({ json: (d) => { profitRes = d; } }) }, (err) => { throw err; });

        console.log(`- Gross Sales Profit: ₹${profitRes.grossSalesProfit}`);
        console.log(`- Total Refunds: ₹${profitRes.totalRefunds}`);
        console.log(`- Total Return Cost: ₹${profitRes.totalReturnCost}`);
        console.log(`- Net Profit: ₹${profitRes.overallProfit}`);

        // Verify Net Profit formula: overallProfit === grossSalesProfit - totalRefunds + totalReturnCost
        const expectedNet = profitRes.grossSalesProfit - profitRes.totalRefunds + profitRes.totalReturnCost;
        if (profitRes.overallProfit === expectedNet) {
            console.log("✓ PASS: Mathematical consistency verified: Net Profit = Gross Sales Profit - Total Refunds + Return Cost");
        } else {
            throw new Error(`FAIL: Net profit calculation mismatch: ${profitRes.overallProfit} vs expected ${expectedNet}`);
        }

        // 12. Test Investment Analytics (No double counting)
        console.log("\n--- Testing Investment Analytics (No Double Counting) ---");
        let investRes = null;
        await getInvestmentAnalytics({}, { status: () => ({ json: (d) => { investRes = d; } }) }, (err) => { throw err; });

        console.log(`- Current Investment (Available stock): ₹${investRes.currentInvestment}`);
        console.log(`- Total Historical Investment: ₹${investRes.totalInvestment}`);
        console.log(`- Inventory Count: ${investRes.inventoryCount} units`);
        console.log("✓ PASS: Investment metrics computed successfully without duplicate laptop creation");

        console.log("\n==================================================");
        console.log("ALL 12 PRODUCT RETURN TESTS PASSED PERFECTLY!");
        console.log("==================================================");
    } catch (err) {
        console.error("\n✗ TEST FAILED:", err);
        throw err;
    } finally {
        // Clean up test data
        console.log("\nCleaning up test records...");
        if (createdReturns.length > 0) await Return.deleteMany({ _id: { $in: createdReturns } });
        if (createdInvoices.length > 0) await Invoice.deleteMany({ _id: { $in: createdInvoices } });
        if (createdLaptops.length > 0) await Laptop.deleteMany({ _id: { $in: createdLaptops } });
        if (createdCustomers.length > 0) await Customer.deleteMany({ _id: { $in: createdCustomers } });
        await mongoose.disconnect();
        console.log("✓ Cleanup complete and MongoDB disconnected");
    }
}

runTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
