const puppeteer = require("puppeteer");
const businessConfig = require("../config/businessConfig");

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
    const laptop = invoice.laptop || {};
    const amountPaid = invoice.amountPaid || 0;
    const totalAmount = invoice.totalAmount || 0;
    const balance = Math.max(0, totalAmount - amountPaid);
    const taxableAmount = (invoice.sellingPrice || 0) - (invoice.discount || 0);

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
            gap: 10px;
            margin-bottom: 6px;
        }
        .logo-icon {
            width: 38px;
            height: 38px;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 800;
            font-size: 20px;
            text-align: center;
            line-height: 38px;
        }
        .business-name {
            font-size: 20px;
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
            margin-bottom: 8px;
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
            font-size: 14px;
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
            font-size: 12px;
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
            padding: 12px;
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
            font-size: 13.5px;
            margin-bottom: 4px;
        }
        .item-spec-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
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
            padding: 9px 10px;
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
            margin-top: 28px;
            padding-top: 16px;
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
            max-width: 240px;
        }
        .signatory-box {
            text-align: center;
            width: 220px;
        }
        .sign-line {
            border-top: 1px solid #0f172a;
            margin-top: 40px;
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
            margin-top: 20px;
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
                <div class="logo-icon">N</div>
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
            <h3>Transaction & Warranty Details</h3>
            <p><strong>Payment Mode:</strong> ${invoice.paymentMethod || "CASH"}</p>
            <p><strong>Payment Status:</strong> ${invoice.paymentStatus || "PENDING"}</p>
            <p><strong>Warranty Period:</strong> ${invoice.warranty || laptop.warranty || "Standard 30 Days"}</p>
            <p><strong>Invoice Reference:</strong> ${invoice._id ? `INV-${invoice._id.toString().slice(-6).toUpperCase()}` : invoice.invoiceNumber}</p>
        </div>
    </div>

    <!-- Products Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 55%;">Item Description & Technical Specifications</th>
                <th style="width: 15%;" class="text-center">Condition</th>
                <th style="width: 10%;" class="text-center">Qty</th>
                <th style="width: 15%;" class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>1</td>
                <td>
                    <div class="item-name">${laptop.brand || ""} ${laptop.model || "Certified Laptop"}</div>
                    <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                        <strong>Serial No:</strong> ${laptop.serialNumber || "N/A"}
                    </div>
                    <div class="item-spec-tags">
                        <span class="spec-badge">CPU: ${laptop.processor || "N/A"}</span>
                        <span class="spec-badge">RAM: ${laptop.ram || "N/A"}</span>
                        <span class="spec-badge">Storage: ${laptop.storage || "N/A"}</span>
                        <span class="spec-badge">Warranty: ${invoice.warranty || laptop.warranty || "30 Days"}</span>
                    </div>
                </td>
                <td class="text-center">
                    <span style="font-weight: 600; color: #0284c7;">${laptop.condition || "Used - Good"}</span>
                </td>
                <td class="text-center">1 Unit</td>
                <td class="text-right" style="font-weight: 700; font-size: 13px;">
                    ${formatCurrency(invoice.sellingPrice)}
                </td>
            </tr>
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
                    <td>Selling Price</td>
                    <td>${formatCurrency(invoice.sellingPrice)}</td>
                </tr>
                ${invoice.discount > 0 ? `
                <tr>
                    <td>Discount Applied</td>
                    <td style="color: #16a34a;">- ${formatCurrency(invoice.discount)}</td>
                </tr>
                <tr>
                    <td>Taxable Amount</td>
                    <td>${formatCurrency(taxableAmount)}</td>
                </tr>
                ` : ""}
                ${invoice.tax > 0 ? `
                <tr>
                    <td>Tax / GST</td>
                    <td>+ ${formatCurrency(invoice.tax)}</td>
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
            Warranty: ${invoice.warranty || laptop.warranty || "30 Days Hardware"}
        </div>
        <div class="signatory-box">
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

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu"
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, {
            waitUntil: ["domcontentloaded", "networkidle0"]
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
        await browser.close();
    }
};

module.exports = {
    generateInvoiceHtml,
    generateInvoicePdf
};
