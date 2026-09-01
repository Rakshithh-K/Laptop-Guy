const nodemailer = require("nodemailer");
const dns = require("dns");
const businessConfig = require("../config/businessConfig");

// Prefer IPv4 on Render.
// This prevents Gmail SMTP IPv6 ENETUNREACH problems.
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
 * Create SMTP transporter
 */
const createTransporter = () => {
  const host = (
    process.env.SMTP_HOST || "smtp.gmail.com"
  ).trim();

  const port = Number(
    process.env.SMTP_PORT || 587
  );

  const isSecure =
    process.env.SMTP_SECURE === "true" ||
    port === 465;

  const user = (
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    ""
  ).trim();

  const pass = (
    process.env.SMTP_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    ""
  ).replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error(
      "SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in Render Environment Variables."
    );
  }

  console.log(
    `[EmailService] Creating SMTP transporter (${host}:${port}, secure: ${isSecure}, requireTLS: ${!isSecure}, family: 4)`
  );

  const transportConfig = {
    host,
    port,
    secure: isSecure,

    // Force IPv4.
    family: 4,

    auth: {
      user,
      pass
    },

    // Fail quickly instead of hanging the HTTP request.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  };

  // Port 587 uses STARTTLS.
  if (!isSecure) {
    transportConfig.requireTLS = true;
  }

  return nodemailer.createTransport(
    transportConfig
  );
};

/**
 * Main Entry Point
 * Sends Invoice Email with PDF Attachment
 */
const sendInvoiceEmail = async ({
  to,
  customerName,
  invoiceNumber,
  invoice,
  pdfBuffer
}) => {
  console.log(
    `[EmailService] Starting invoice email for invoice #${invoiceNumber} to ${to}`
  );

  /**
   * Validate customer email
   */
  if (!to || !to.trim()) {
    throw new Error(
      "Customer email address is required to send invoice."
    );
  }

  /**
   * Validate PDF
   */
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error(
      "PDF buffer is empty or missing. Cannot send invoice email."
    );
  }

  /**
   * Normalize PDF into a Node.js Buffer
   */
  let validBuffer;

  if (Buffer.isBuffer(pdfBuffer)) {
    validBuffer = pdfBuffer;
  } else if (pdfBuffer instanceof Uint8Array) {
    validBuffer = Buffer.from(pdfBuffer);
  } else if (pdfBuffer instanceof ArrayBuffer) {
    validBuffer = Buffer.from(
      new Uint8Array(pdfBuffer)
    );
  } else {
    try {
      validBuffer = Buffer.from(pdfBuffer);
    } catch (error) {
      throw new Error(
        "PDF data is not a valid Buffer, Uint8Array, or ArrayBuffer."
      );
    }
  }

  /**
   * Validate PDF size
   */
  if (validBuffer.length === 0) {
    throw new Error(
      "PDF buffer is 0 bytes. Invalid PDF data."
    );
  }

  /**
   * Validate PDF header
   */
  const pdfHeader = validBuffer
    .subarray(0, 5)
    .toString();

  if (pdfHeader !== "%PDF-") {
    throw new Error(
      `Invalid PDF header detected: "${pdfHeader}". Expected "%PDF-".`
    );
  }

  console.log(
    `[EmailService] PDF attachment ready`
  );

  console.log(
    `[EmailService] PDF size: ${validBuffer.length} bytes`
  );

  console.log(
    `[EmailService] PDF header: ${pdfHeader}`
  );

  /**
   * Business information
   */
  const businessName =
    businessConfig.businessName ||
    "Laptop_Guy Laptops & Computers";

  const businessPhone =
    businessConfig.phone ||
    "+91 7795330943";

  const businessEmail =
    businessConfig.email ||
    "laptopguysales@gmail.com";

  /**
   * Invoice information
   */
  const invoiceDate = formatDate(
    invoice.createdAt
  );

  const totalAmount = formatCurrency(
    invoice.totalAmount
  );

  const paymentStatus =
    invoice.paymentStatus || "PAID";

  const warranty =
    invoice.warranty ||
    "30 Days Hardware Warranty";

  const transactionId =
    invoice.transactionId
      ? invoice.transactionId.trim()
      : "";

  /**
   * Normalize invoice items
   */
  const items =
    invoice.items &&
      invoice.items.length > 0
      ? invoice.items
      : invoice.laptop
        ? [
          {
            laptop: invoice.laptop,
            sellingPrice:
              invoice.sellingPrice ||
              invoice.totalAmount
          }
        ]
        : [];

  /**
   * Product rows for HTML email
   */
  const itemsHtml = items
    .map((item, idx) => {
      const laptop = item.laptop || {};

      const price =
        item.sellingPrice !== undefined
          ? item.sellingPrice
          : laptop.sellingPrice || 0;

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">
            ${idx + 1}. ${laptop.brand || ""} ${laptop.model || "Laptop"}

            <div
              style="
                font-size: 11.5px;
                color: #64748b;
                font-family: monospace;
              "
            >
              S/N: ${laptop.serialNumber || "N/A"}
              ${laptop.processor ? ` | ${laptop.processor}` : ""}
              ${laptop.ram ? ` | ${laptop.ram}` : ""}
              ${laptop.storage ? ` | ${laptop.storage}` : ""}
            </div>
          </td>

          <td
            style="
              padding: 8px 0;
              text-align: right;
              font-weight: 700;
              color: #0f172a;
              vertical-align: top;
            "
          >
            ${formatCurrency(price)}
          </td>
        </tr>
      `;
    })
    .join("");

  /**
   * HTML email
   */
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">

<style>
  body {
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      Helvetica,
      Arial,
      sans-serif;
    line-height: 1.6;
    color: #1e293b;
    margin: 0;
    padding: 0;
    background-color: #f8fafc;
  }

  .wrapper {
    max-width: 600px;
    margin: 20px auto;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }

  .header {
    background: #0f172a;
    padding: 24px 32px;
    color: #ffffff;
  }

  .header h1 {
    margin: 0 0 4px 0;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }

  .header p {
    margin: 0;
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .content {
    padding: 32px;
  }

  .greeting {
    font-size: 16px;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 12px;
  }

  .intro {
    font-size: 14px;
    color: #475569;
    margin-bottom: 24px;
  }

  .summary-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 18px 20px;
    margin-bottom: 24px;
  }

  .footer {
    background: #f1f5f9;
    padding: 20px 32px;
    border-top: 1px solid #e2e8f0;
    font-size: 12px;
    color: #64748b;
  }

  .footer strong {
    color: #1e293b;
  }
</style>

</head>

<body>

<div class="wrapper">

  <div class="header">
    <h1>${businessName}</h1>
    <p>Official Tax Invoice Attachment</p>
  </div>

  <div class="content">

    <div class="greeting">
      Hello ${customerName || "Valued Customer"},
    </div>

    <p class="intro">
      Thank you for your purchase.
      Please find your official tax invoice attached as a signed PDF for your records.
    </p>

    <div class="summary-card">

      <table
        style="
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
          margin-bottom: 12px;
        "
      >

        <tr>
          <td style="padding: 6px 0; color: #64748b;">
            Invoice Number:
          </td>

          <td
            style="
              padding: 6px 0;
              text-align: right;
              font-weight: 700;
              color: #0f172a;
              font-family: monospace;
            "
          >
            ${invoiceNumber}
          </td>
        </tr>

        <tr>
          <td style="padding: 6px 0; color: #64748b;">
            Invoice Date:
          </td>

          <td
            style="
              padding: 6px 0;
              text-align: right;
              font-weight: 600;
              color: #0f172a;
            "
          >
            ${invoiceDate}
          </td>
        </tr>

        <tr>
          <td style="padding: 6px 0; color: #64748b;">
            Payment Method:
          </td>

          <td
            style="
              padding: 6px 0;
              text-align: right;
              font-weight: 600;
              color: #0f172a;
            "
          >
            ${invoice.paymentMethod || "CASH"}
          </td>
        </tr>

        ${transactionId
      ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">
            Transaction ID / UTR:
          </td>

          <td
            style="
              padding: 6px 0;
              text-align: right;
              font-weight: 700;
              color: #0f172a;
              font-family: monospace;
            "
          >
            ${transactionId}
          </td>
        </tr>
        `
      : ""
    }

        <tr>
          <td style="padding: 6px 0; color: #64748b;">
            Payment Status:
          </td>

          <td
            style="
              padding: 6px 0;
              text-align: right;
              font-weight: 700;
              color: #059669;
            "
          >
            ${paymentStatus}
          </td>
        </tr>

        <tr>
          <td style="padding: 6px 0; color: #64748b;">
            Warranty Coverage:
          </td>

          <td
            style="
              padding: 6px 0;
              text-align: right;
              font-weight: 600;
              color: #2563eb;
            "
          >
            ${warranty}
          </td>
        </tr>

      </table>

      <div
        style="
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          margin-top: 10px;
        "
      >

        <div
          style="
            font-size: 11.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 6px;
          "
        >
          Purchased Products (${items.length})
        </div>

        <table
          style="
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          "
        >

          ${itemsHtml}

          <tr style="border-top: 2px solid #0f172a;">

            <td
              style="
                padding: 10px 0 4px 0;
                font-weight: 700;
                color: #0f172a;
                font-size: 15px;
              "
            >
              Grand Total:
            </td>

            <td
              style="
                padding: 10px 0 4px 0;
                text-align: right;
                font-weight: 800;
                color: #2563eb;
                font-size: 16px;
              "
            >
              ${totalAmount}
            </td>

          </tr>

        </table>

      </div>

    </div>

    <p
      style="
        font-size: 13px;
        color: #64748b;
        margin-top: 16px;
      "
    >
      The official signed PDF copy of your tax invoice is attached with this email.
      Please keep it safe for any future warranty assistance.
    </p>

  </div>

  <div class="footer">
    <strong>${businessName}</strong>
    <br>
    Phone: ${businessPhone} | Email: ${businessEmail}
  </div>

</div>

</body>
</html>
`;

  /**
   * Plain text email
   */
  const itemsText = items
    .map((item, idx) => {
      const laptop = item.laptop || {};

      const price =
        item.sellingPrice !== undefined
          ? item.sellingPrice
          : laptop.sellingPrice || 0;

      return (
        `Item ${idx + 1}: ` +
        `${laptop.brand || ""} ${laptop.model || "Laptop"} | ` +
        `S/N: ${laptop.serialNumber || "N/A"} | ` +
        `Price: ${formatCurrency(price)}`
      );
    })
    .join("\n");

  const plainText = `
Hello ${customerName || "Customer"},

Thank you for your purchase.

Please find your official tax invoice attached as a signed PDF.

Invoice Number: ${invoiceNumber}
Invoice Date: ${invoiceDate}
Payment Method: ${invoice.paymentMethod || "CASH"}
${transactionId
      ? `Transaction ID / UTR: ${transactionId}\n`
      : ""
    }Payment Status: ${paymentStatus}
Warranty: ${warranty}

Products:
${itemsText}

Grand Total: ${totalAmount}

Thank you,
${businessName}
${businessPhone}
${businessEmail}
`.trim();

  const subject =
    `Invoice ${invoiceNumber} from ${businessName}`;

  const filename =
    `Invoice-${invoiceNumber}.pdf`;

  /**
   * Create SMTP transporter
   */
  const transporter = createTransporter();

  /**
   * Verify SMTP connection
   */
  console.log(
    `[EmailService] Verifying SMTP connection...`
  );

  try {
    await transporter.verify();

    console.log(
      `[EmailService] SMTP connection verified successfully`
    );
  } catch (verifyErr) {
    console.error(
      `[EmailService] SMTP verification failed:`,
      verifyErr
    );

    throw new Error(
      `SMTP verification failed: ${verifyErr.message}`
    );
  }

  /**
   * Sender address
   */
  const fromAddress = (
    process.env.EMAIL_FROM ||
    `"${businessName}" <${process.env.SMTP_USER || process.env.GMAIL_USER || businessEmail}>`
  ).trim();

  /**
   * Email options
   */
  const mailOptions = {
    from: fromAddress,
    to: to.trim(),
    subject,
    text: plainText,
    html: emailHtml,

    attachments: [
      {
        filename,
        content: validBuffer,
        contentType: "application/pdf"
      }
    ]
  };

  /**
   * Send email
   */
  console.log(
    `[EmailService] Sending invoice email to ${to}...`
  );

  try {
    const info = await transporter.sendMail(
      mailOptions
    );

    console.log(
      `[EmailService] Invoice email sent successfully to ${to}. MessageId: ${info.messageId}`
    );

    return info;
  } catch (sendErr) {
    console.error(
      `[EmailService] SMTP email sending failed:`,
      sendErr
    );

    throw new Error(
      `SMTP email sending failed: ${sendErr.message}`
    );
  }
};

module.exports = {
  sendInvoiceEmail
};