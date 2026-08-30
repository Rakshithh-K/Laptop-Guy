const nodemailer = require("nodemailer");
const dns = require("dns");
const businessConfig = require("../config/businessConfig");

// Set DNS resolution to prefer IPv4 first across Node.js runtime (prevents IPv6 ENETUNREACH on Render)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

/**
 * Format currency in Indian format
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount || 0);
};

/**
 * Format date
 */
const formatDate = (dateString) => {
  if (!dateString) {
    return new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

/**
 * Creates Nodemailer Transporter using Gmail SMTP on port 587 with STARTTLS and forced IPv4
 */
const createTransporter = () => {
  const user = (process.env.GMAIL_USER || process.env.SMTP_USER || "").trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error("Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.");
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465; // false for port 587 (STARTTLS)

  console.log(`[EmailService] Creating Gmail SMTP transporter (${host}:${port}, secure: ${secure}, requireTLS: true, IPv4)`);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: true,
    family: 4, // Force IPv4 to prevent unreachable IPv6 socket connection
    auth: {
      user,
      pass
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  });
};

/**
 * Main Entry Point: Sends Invoice Email with Signed PDF Attachment via Gmail SMTP
 */
const sendInvoiceEmail = async ({ to, customerName, invoiceNumber, invoice, pdfBuffer }) => {
  console.log(`[EmailService] Starting invoice email for invoice #${invoiceNumber} to ${to}`);

  if (!to || !to.trim()) {
    throw new Error("Customer email address is required to send invoice.");
  }

  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error("PDF buffer is empty or invalid. Cannot send invoice email without attached PDF.");
  }

  const normalizedBuffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

  console.log(`[EmailService] PDF attachment ready (${normalizedBuffer.length} bytes)`);

  const businessName = businessConfig.businessName || "Laptop_Guy Laptops & Computers";
  const businessPhone = businessConfig.phone || "+91 7795330943";
  const businessEmail = businessConfig.email || "laptopguysales@gmail.com";

  const invoiceDate = formatDate(invoice.createdAt);
  const totalAmount = formatCurrency(invoice.totalAmount);
  const paymentStatus = invoice.paymentStatus || "PAID";
  const warranty = invoice.warranty || "30 Days Hardware Warranty";
  const transactionId = invoice.transactionId ? invoice.transactionId.trim() : "";

  // Normalize invoice items for multi-product or legacy single-laptop records
  const items = (invoice.items && invoice.items.length > 0)
    ? invoice.items
    : (invoice.laptop ? [{ laptop: invoice.laptop, sellingPrice: invoice.sellingPrice || invoice.totalAmount }] : []);

  const itemsHtml = items.map((item, idx) => {
    const l = item.laptop || {};
    const price = item.sellingPrice !== undefined ? item.sellingPrice : (l.sellingPrice || 0);
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">
          ${idx + 1}. ${l.brand || ""} ${l.model || "Laptop"}
          <div style="font-size: 11.5px; color: #64748b; font-family: monospace;">
            S/N: ${l.serialNumber || "N/A"}${l.processor ? ` | ${l.processor}` : ""}${l.ram ? ` | ${l.ram}` : ""}${l.storage ? ` | ${l.storage}` : ""}
          </div>
        </td>
        <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; vertical-align: top;">
          ${formatCurrency(price)}
        </td>
      </tr>
    `;
  }).join("");

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
  .wrapper { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
  .header { background: #0f172a; padding: 24px 32px; color: #ffffff; }
  .header h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
  .header p { margin: 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .content { padding: 32px; }
  .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
  .intro { font-size: 14px; color: #475569; margin-bottom: 24px; }
  .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px; }
  .footer { background: #f1f5f9; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
  .footer strong { color: #1e293b; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${businessName}</h1>
      <p>Official Tax Invoice Attachment</p>
    </div>
    
    <div class="content">
      <div class="greeting">Hello ${customerName || "Valued Customer"},</div>
      <p class="intro">Thank you for your purchase. Please find your official tax invoice attached as a signed PDF for your records.</p>
      
      <div class="summary-card">
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; margin-bottom: 12px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Invoice Number:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Invoice Date:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${invoiceDate}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Payment Method:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${invoice.paymentMethod || "CASH"}</td>
          </tr>
          ${transactionId ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Transaction ID / UTR:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">${transactionId}</td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Payment Status:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #059669;">${paymentStatus}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Warranty Coverage:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #2563eb;">${warranty}</td>
          </tr>
        </table>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px;">
          <div style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">
            Purchased Products (${items.length})
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            ${itemsHtml}
            <tr style="border-top: 2px solid #0f172a;">
              <td style="padding: 10px 0 4px 0; font-weight: 700; color: #0f172a; font-size: 15px;">Grand Total:</td>
              <td style="padding: 10px 0 4px 0; text-align: right; font-weight: 800; color: #2563eb; font-size: 16px;">${totalAmount}</td>
            </tr>
          </table>
        </div>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
        The official signed PDF copy of your tax invoice is attached with this email. Please keep it safe for any future warranty assistance.
      </p>
    </div>

    <div class="footer">
      <strong>${businessName}</strong><br>
      Phone: ${businessPhone} | Email: ${businessEmail}
    </div>
  </div>
</body>
</html>
  `;

  const itemsText = items.map((item, idx) => {
    const l = item.laptop || {};
    const price = item.sellingPrice !== undefined ? item.sellingPrice : (l.sellingPrice || 0);
    return `Item ${idx + 1}: ${l.brand || ""} ${l.model || "Laptop"} | S/N: ${l.serialNumber || "N/A"} | Price: ${formatCurrency(price)}`;
  }).join("\n");

  const plainText = `
Hello ${customerName || "Customer"},

Thank you for your purchase.

Please find your official tax invoice attached as a signed PDF.

Invoice Number: ${invoiceNumber}
Invoice Date: ${invoiceDate}
Payment Method: ${invoice.paymentMethod || "CASH"}
${transactionId ? `Transaction ID / UTR: ${transactionId}\n` : ""}Payment Status: ${paymentStatus}
Warranty: ${warranty}

Products:
${itemsText}

Grand Total: ${totalAmount}

Thank you,
${businessName}
${businessPhone}
${businessEmail}
  `.trim();

  const subject = `Invoice ${invoiceNumber} from ${businessName}`;
  const filename = `Invoice-${invoiceNumber}.pdf`;

  // 1. Create transporter
  const transporter = createTransporter();

  // 2. Verify connection
  console.log(`[EmailService] Verifying Gmail SMTP connection...`);
  try {
    await transporter.verify();
    console.log(`[EmailService] Gmail SMTP connection verified successfully`);
  } catch (verifyErr) {
    console.error(`[EmailService] Gmail SMTP verification failed:`, verifyErr.message);
    throw new Error(`Gmail SMTP connection verification failed: ${verifyErr.message}`);
  }

  // 3. Mail options with direct PDF buffer
  const senderEmail = (process.env.GMAIL_USER || process.env.SMTP_USER || "laptopguysales@gmail.com").trim();
  const mailOptions = {
    from: `"${businessName}" <${senderEmail}>`,
    to: to.trim(),
    subject,
    text: plainText,
    html: emailHtml,
    attachments: [
      {
        filename,
        content: normalizedBuffer,
        contentType: "application/pdf"
      }
    ]
  };

  // 4. Send email
  console.log(`[EmailService] Sending invoice email to ${to}...`);
  const info = await transporter.sendMail(mailOptions);
  console.log(`[EmailService] Invoice email sent successfully to ${to}. MessageId: ${info.messageId}`);
  return info;
};

module.exports = {
  sendInvoiceEmail
};