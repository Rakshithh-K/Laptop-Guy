const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const businessConfig = require("../config/businessConfig");

/**
 * Load logo as base64 data URI from the single source of truth (frontend/src/assets/logo.jpeg)
 */
const getLogoBase64 = () => {
    try {
        const possiblePaths = [
            path.resolve(__dirname, "../../frontend/src/assets/logo.jpeg"),
            path.resolve(process.cwd(), "frontend/src/assets/logo.jpeg"),
            path.resolve(process.cwd(), "../frontend/src/assets/logo.jpeg")
        ];
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                const imgBuffer = fs.readFileSync(p);
                return `data:image/jpeg;base64,${imgBuffer.toString("base64")}`;
            }
        }
        console.warn("[pdfService] Logo not found at frontend/src/assets/logo.jpeg");
    } catch (e) {
        console.error("Failed to read logo image for PDF:", e);
    }
    return "";
};

/**
 * Load signature as base64 data URI from the single source of truth (frontend/src/assets/nawsig.jpeg)
 */
const getSignatureBase64 = () => {
    try {
        const possiblePaths = [
            path.resolve(__dirname, "../../frontend/src/assets/nawsig.jpeg"),
            path.resolve(process.cwd(), "frontend/src/assets/nawsig.jpeg"),
            path.resolve(process.cwd(), "../frontend/src/assets/nawsig.jpeg")
        ];
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                const imgBuffer = fs.readFileSync(p);
                return `data:image/jpeg;base64,${imgBuffer.toString("base64")}`;
            }
        }
        console.warn("[pdfService] Signature not found at frontend/src/assets/nawsig.jpeg");
    } catch (e) {
        console.error("Failed to read signature image for PDF:", e);
    }
    return "";
};

/**
 * Format currency in Indian format
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount || 0);
};

/**
 * Format date in readable format
 */
const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const d = new Date(dateString);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * Generates HTML string for the invoice
 */
const generateInvoiceHtml = (invoice) => {
    const customer = invoice.customer || {};
    const amountPaid = invoice.amountPaid || 0;
    const totalAmount = invoice.totalAmount || 0;
    const balance = Math.max(0, totalAmount - amountPaid);

    // Multi-item normalization for backward compatibility
    const items = (invoice.items && invoice.items.length > 0)
        ? invoice.items
        : (invoice.laptop ? [{ laptop: invoice.laptop, sellingPrice: invoice.sellingPrice || invoice.totalAmount }] : []);

    const subtotal = invoice.subtotal !== undefined
        ? invoice.subtotal
        : items.reduce((sum, it) => sum + (Number(it.sellingPrice) || 0), 0) || invoice.sellingPrice || 0;

    const discount = invoice.discount || 0;
    const tax = invoice.tax || 0;
    const taxableAmount = Math.max(0, subtotal - discount);

    const logoBase64 = getLogoBase64();
    const sigBase64 = getSignatureBase64();
    const transactionId = invoice.transactionId ? invoice.transactionId.trim() : "";

    const paymentStatusColor = invoice.paymentStatus === "PAID" ? "#10b981" : invoice.paymentStatus === "PARTIAL" ? "#f59e0b" : "#ef4444";
    const paymentStatusBg = invoice.paymentStatus === "PAID" ? "#ecfdf5" : invoice.paymentStatus === "PARTIAL" ? "#fffbeb" : "#fef2f2";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1e293b;
            background-color: #ffffff;
            font-size: 13px;
            line-height: 1.5;
            padding: 28px 36px;
        }
        .header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 18px;
            margin-bottom: 20px;
        }
        .business-info {
            max-width: 60%;
        }
        .logo-title {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 6px;
        }
        .logo-img {
            width: 48px;
            height: 48px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .business-name {
            font-size: 19px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
        }
        .business-tagline {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            font-weight: 600;
            margin-bottom: 6px;
        }
        .business-details {
            font-size: 11.5px;
            color: #475569;
            line-height: 1.4;
        }
        .business-details span {
            font-weight: 600;
            color: #1e293b;
        }
        .invoice-meta {
            text-align: right;
        }
        .invoice-badge {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 1px;
            padding: 5px 14px;
            border-radius: 4px;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        .meta-row {
            font-size: 12px;
            color: #475569;
            margin-bottom: 3px;
        }
        .meta-row strong {
            color: #0f172a;
            font-size: 13px;
        }
        .status-pill {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 9999px;
            margin-top: 4px;
            border: 1px solid ${paymentStatusColor};
            color: ${paymentStatusColor};
            background-color: ${paymentStatusBg};
        }

        /* Two columns: Customer & Summary */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 22px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px 20px;
        }
        .info-col h3 {
            font-size: 11.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #64748b;
            margin-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
        }
        .info-col p {
            font-size: 12px;
            color: #334155;
            margin-bottom: 3px;
        }
        .info-col strong {
            color: #0f172a;
        }

        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 10px 12px;
            text-align: left;
        }
        .items-table th.text-right {
            text-align: right;
        }
        .items-table th.text-center {
            text-align: center;
        }
        .items-table td {
            padding: 11px 12px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            font-size: 12px;
        }
        .items-table td.text-right {
            text-align: right;
        }
        .items-table td.text-center {
            text-align: center;
        }
        .item-name {
            font-weight: 700;
            color: #0f172a;
            font-size: 13px;
            margin-bottom: 3px;
        }
        .item-spec-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 4px;
        }
        .spec-badge {
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            color: #334155;
            font-size: 10px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
        }

        /* Calculation & Totals Grid */
        .bottom-section {
            display: grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 24px;
            margin-bottom: 22px;
        }
        .terms-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 16px;
        }
        .terms-box h4 {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
            font-weight: 700;
            margin-bottom: 6px;
        }
        .terms-box ul {
            list-style: none;
            padding-left: 0;
        }
        .terms-box li {
            font-size: 10.5px;
            color: #64748b;
            margin-bottom: 3px;
            line-height: 1.35;
        }
        .bank-box {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px dashed #cbd5e1;
            font-size: 10.5px;
            color: #475569;
        }

        .totals-table {
            width: 100%;
            border-collapse: collapse;
        }
        .totals-table tr td {
            padding: 6px 10px;
            font-size: 12px;
            color: #475569;
        }
        .totals-table tr td:last-child {
            text-align: right;
            font-weight: 600;
            color: #1e293b;
        }
        .totals-table tr.total-row {
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            background-color: #f8fafc;
        }
        .totals-table tr.total-row td {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            padding: 8px 10px;
        }
        .totals-table tr.balance-row td {
            font-weight: 700;
            color: ${balance > 0 ? "#dc2626" : "#16a34a"};
            font-size: 12.5px;
        }

        /* Signature Section */
        .signature-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 24px;
            padding-top: 14px;
        }
        .warranty-seal {
            border: 2px dashed #3b82f6;
            background-color: #eff6ff;
            color: #1d4ed8;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            max-width: 260px;
        }
        .signatory-box {
            text-align: center;
            width: 220px;
        }
        .sig-img {
            max-width: 140px;
            max-height: 55px;
            height: auto;
            object-fit: contain;
            display: block;
            margin: 0 auto 6px auto;
        }
        .sign-line {
            border-top: 1px solid #0f172a;
            margin-top: 6px;
            padding-top: 4px;
            font-size: 11.5px;
            font-weight: 700;
            color: #0f172a;
        }
        .sign-sub {
            font-size: 10px;
            color: #64748b;
        }

        .footer {
            margin-top: 18px;
            text-align: center;
            font-size: 10.5px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 8px;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header-container">
        <div class="business-info">
            <div class="logo-title">
                ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="Logo" />` : ""}
                <div>
                    <h1 class="business-name">${businessConfig.businessName}</h1>
                    <div class="business-tagline">${businessConfig.tagline}</div>
                </div>
            </div>
            <div class="business-details">
                ${businessConfig.address}<br>
                <span>Phone:</span> ${businessConfig.phone} | <span>Email:</span> ${businessConfig.email}<br>
                <span>GSTIN:</span> ${businessConfig.gstin}
            </div>
        </div>
        <div class="invoice-meta">
            <div class="invoice-badge">TAX INVOICE</div>
            <div class="meta-row"><strong>Invoice No:</strong> ${invoice.invoiceNumber}</div>
            <div class="meta-row"><strong>Date:</strong> ${formatDate(invoice.createdAt)}</div>
            <div>
                <span class="status-pill">${invoice.paymentStatus}</span>
            </div>
        </div>
    </div>

    <!-- Customer & Bill Meta Grid -->
    <div class="info-grid">
        <div class="info-col">
            <h3>Billed To (Customer Details)</h3>
            <p><strong>${customer.name || "N/A"}</strong></p>
            <p><strong>Phone:</strong> ${customer.phone || "N/A"}</p>
            ${customer.email ? `<p><strong>Email:</strong> ${customer.email}</p>` : ""}
            <p><strong>Address:</strong> ${customer.address || "N/A"}</p>
            ${customer.gstin ? `<p><strong>GSTIN:</strong> ${customer.gstin}</p>` : ""}
        </div>
        <div class="info-col">
            <h3>Transaction & Payment Details</h3>
            <p><strong>Payment Mode:</strong> ${invoice.paymentMethod || "CASH"}</p>
            ${transactionId ? `<p><strong>Transaction ID / UTR:</strong> <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${transactionId}</span></p>` : ""}
            <p><strong>Payment Status:</strong> ${invoice.paymentStatus || "PENDING"}</p>
            <p><strong>Warranty Period:</strong> ${invoice.warranty || "Standard 30 Days Hardware"}</p>
            <p><strong>Invoice Reference:</strong> ${invoice._id ? `INV-${invoice._id.toString().slice(-6).toUpperCase()}` : invoice.invoiceNumber}</p>
        </div>
    </div>

    <!-- Products Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;" class="text-center">#</th>
                <th style="width: 55%;">Item Description & Technical Specifications</th>
                <th style="width: 15%;" class="text-center">Condition</th>
                <th style="width: 10%;" class="text-center">Qty</th>
                <th style="width: 15%;" class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${items.map((item, index) => {
        const l = item.laptop || {};
        const itemPrice = item.sellingPrice !== undefined ? item.sellingPrice : (l.sellingPrice || 0);
        return `
                <tr>
                    <td class="text-center" style="font-weight: 600; color: #64748b;">${index + 1}</td>
                    <td>
                        <div class="item-name">${l.brand || ""} ${l.model || "Certified Laptop"}</div>
                        <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                            <strong>Serial No:</strong> ${l.serialNumber || "N/A"}
                        </div>
                        <div class="item-spec-tags">
                            <span class="spec-badge">CPU: ${l.processor || "N/A"}</span>
                            <span class="spec-badge">RAM: ${l.ram || "N/A"}</span>
                            <span class="spec-badge">Storage: ${l.storage || "N/A"}</span>
                            <span class="spec-badge">Warranty: ${l.warranty || invoice.warranty || "30 Days"}</span>
                        </div>
                    </td>
                    <td class="text-center">
                        <span style="font-weight: 600; color: #0284c7;">${l.condition || "Used - Good"}</span>
                    </td>
                    <td class="text-center">1 Unit</td>
                    <td class="text-right" style="font-weight: 700; font-size: 13px;">
                        ${formatCurrency(itemPrice)}
                    </td>
                </tr>
                `;
    }).join("")}
        </tbody>
    </table>

    <!-- Bottom Breakdown -->
    <div class="bottom-section">
        <div class="terms-box">
            <h4>Terms & Warranty Policy</h4>
            <ul>
                ${businessConfig.invoiceTerms.map(term => `<li>${term}</li>`).join("")}
            </ul>
            <div class="bank-box">
                <strong>UPI / Bank Transfer:</strong> ${businessConfig.bankDetails.upiId} | ${businessConfig.bankDetails.bankName} A/C: ${businessConfig.bankDetails.accountNumber}
            </div>
        </div>

        <div>
            <table class="totals-table">
                <tr>
                    <td>Subtotal (${items.length} ${items.length === 1 ? "Item" : "Items"})</td>
                    <td>${formatCurrency(subtotal)}</td>
                </tr>
                ${discount > 0 ? `
                <tr>
                    <td>Discount Applied</td>
                    <td style="color: #16a34a;">- ${formatCurrency(discount)}</td>
                </tr>
                <tr>
                    <td>Taxable Amount</td>
                    <td>${formatCurrency(taxableAmount)}</td>
                </tr>
                ` : ""}
                ${tax > 0 ? `
                <tr>
                    <td>Tax / GST</td>
                    <td>+ ${formatCurrency(tax)}</td>
                </tr>
                ` : ""}
                <tr class="total-row">
                    <td>Grand Total</td>
                    <td>${formatCurrency(totalAmount)}</td>
                </tr>
                <tr>
                    <td>Amount Paid (${invoice.paymentMethod || "CASH"})</td>
                    <td style="color: #0f172a;">${formatCurrency(amountPaid)}</td>
                </tr>
                <tr class="balance-row">
                    <td>Balance Due</td>
                    <td>${formatCurrency(balance)}</td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Signature Area -->
    <div class="signature-section">
        <div class="warranty-seal">
            ★ OFFICIAL CERTIFIED SALE ★<br>
            Warranty: ${invoice.warranty || "30 Days Hardware"}
        </div>
        <div class="signatory-box">
            <div style="font-size: 10.5px; font-weight: 700; color: #64748b; margin-bottom: 4px; text-transform: uppercase;">
                Authorized Signature
            </div>
            ${sigBase64 ? `<img src="${sigBase64}" class="sig-img" alt="Authorized Signature" />` : `<div style="height: 36px;"></div>`}
            <div class="sign-line">For ${businessConfig.businessName}</div>
            <div class="sign-sub">Authorized Signatory</div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        This is a computer generated invoice and serves as official proof of purchase. Thank you for choosing ${businessConfig.businessName}!
    </div>
</body>
</html>
    `;
};

/**
 * Generate PDF buffer using Puppeteer
 */
const generateInvoicePdf = async (invoice) => {
    const htmlContent = generateInvoiceHtml(invoice);

    const launchOptions = {
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu"
        ]
    };

    // Auto-detect browser executable path if configured or present on system
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else {
        const candidatePaths = [
            // Windows common Chrome & Edge paths
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
            ...(process.env.LOCALAPPDATA ? [
                path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe"),
                path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe")
            ] : []),
            // Linux / Render paths
            "/usr/bin/google-chrome-stable",
            "/usr/bin/google-chrome",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
            // Mac paths
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
        ];
        for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
                launchOptions.executablePath = p;
                break;
            }
        }
    }

    const browser = await puppeteer.launch(launchOptions);

    try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, {
            waitUntil: "domcontentloaded",
            timeout: 30000
        });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "10mm",
                bottom: "10mm",
                left: "10mm",
                right: "10mm"
            }
        });

        return pdfBuffer;
    } finally {
        if (browser) {
            await browser.close().catch(() => { });
        }
    }
};

module.exports = {
    generateInvoiceHtml,
    generateInvoicePdf
};