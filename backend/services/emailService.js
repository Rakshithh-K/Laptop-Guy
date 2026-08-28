const nodemailer = require("nodemailer");
const businessConfig = require("../config/businessConfig");

/**
 * Creates Nodemailer Transporter for Gmail SMTP
 */
const createTransporter = () => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, "") : "";

    if (!user || !pass) {
        throw new Error("Gmail credentials (GMAIL_USER or GMAIL_APP_PASSWORD) not configured in backend .env");
    }

    return nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: user.trim(),
            pass: pass.trim()
        }
    });
};

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
    if (!dateString) return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    return new Date(dateString).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * Sends Invoice Email with PDF Attachment
 */
const sendInvoiceEmail = async ({ to, customerName, invoiceNumber, invoice, pdfBuffer }) => {
    const laptop = invoice.laptop || {};
    const businessName = businessConfig.businessName || "Laptop_Guy Laptops & Computers";
    const businessPhone = businessConfig.phone || "+91 98765 43210";
    const businessEmail = businessConfig.email || "billing@nextgenlaptops.com";
    const invoiceDate = formatDate(invoice.createdAt);
    const totalAmount = formatCurrency(invoice.totalAmount);
    const paymentStatus = invoice.paymentStatus || "PAID";
    const warranty = invoice.warranty || laptop.warranty || "30 Days Hardware Warranty";

    console.log(`[EmailService] Invoice email sending started for ${invoiceNumber} to ${to}`);

    const transporter = createTransporter();

    // Verify SMTP connection
    await transporter.verify();

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
  .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13.5px; border-bottom: 1px dashed #e2e8f0; }
  .summary-row:last-child { border-bottom: none; }
  .summary-label { color: #64748b; font-weight: 500; }
  .summary-val { color: #0f172a; font-weight: 700; text-align: right; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11.5px; font-weight: 700; background: #ecfdf5; color: #059669; }
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
      <p class="intro">Thank you for your purchase. Please find your official tax invoice attached as a PDF for your records.</p>
      
      <div class="summary-card">
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Invoice Number:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Invoice Date:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${invoiceDate}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Laptop Unit:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a;">${laptop.brand || ""} ${laptop.model || "Certified Laptop"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Serial Number:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #334155; font-family: monospace;">${laptop.serialNumber || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Warranty:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #2563eb;">${warranty}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Payment Status:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #059669;">${paymentStatus}</td>
          </tr>
          <tr style="border-top: 2px solid #0f172a;">
            <td style="padding: 10px 0 4px 0; font-weight: 700; color: #0f172a; font-size: 15px;">Total Amount:</td>
            <td style="padding: 10px 0 4px 0; text-align: right; font-weight: 800; color: #2563eb; font-size: 16px;">${totalAmount}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
        The official PDF copy of your tax invoice is attached with this email. Please keep it safe for any future warranty assistance.
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

    const plainText = `
Hello ${customerName || "Customer"},

Thank you for your purchase. Please find your invoice attached.

Invoice Number: ${invoiceNumber}
Invoice Date: ${invoiceDate}
Laptop: ${laptop.brand || ""} ${laptop.model || ""}
Serial Number: ${laptop.serialNumber || "N/A"}
Total Amount: ${totalAmount}
Payment Status: ${paymentStatus}
Warranty: ${warranty}

Thank you,
${businessName}
${businessPhone}
${businessEmail}
    `.trim();

    const mailOptions = {
        from: `"${businessName}" <${process.env.GMAIL_USER}>`,
        to: to.trim(),
        subject: `Invoice ${invoiceNumber} from ${businessName}`,
        text: plainText,
        html: emailHtml,
        attachments: [
            {
                filename: `Invoice-${invoiceNumber}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf"
            }
        ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Invoice email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return info;
};

module.exports = {
    sendInvoiceEmail
};
