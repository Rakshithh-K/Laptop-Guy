import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  ShieldCheck, 
  User, 
  Laptop, 
  CreditCard,
  Building,
  AlertCircle,
  RefreshCw,
  Send,
  Mail,
  CheckCircle2
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import Toast from "../components/Toast";
import { getInvoiceById, downloadInvoicePdf, sendInvoice } from "../api/invoiceApi";
import { getBusinessInfo } from "../api/dashboardApi";

export default function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const [invData, bizData] = await Promise.all([
        getInvoiceById(id),
        getBusinessInfo().catch(() => null)
      ]);
      setInvoice(invData);
      setBusinessInfo(bizData);
    } catch (err) {
      setError(err.customMessage || "Failed to load invoice details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDownload = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      await downloadInvoicePdf(invoice._id, invoice.invoiceNumber);
      showToast(`Downloaded ${invoice.invoiceNumber}.pdf`, "success");
    } catch (err) {
      showToast("Failed to download PDF invoice", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice) return;
    const customer = invoice.customer || {};

    if (!customer.email || !customer.email.trim()) {
      showToast("Customer email address is required to send the invoice.", "error");
      return;
    }

    setSending(true);
    try {
      const res = await sendInvoice(invoice._id);
      showToast(`Invoice sent successfully to ${res.email || customer.email}`, "success");
      // Refresh to update email status
      fetchInvoiceDetails();
    } catch (err) {
      showToast(err.customMessage || "Unable to send invoice. Please try again.", "error");
    } finally {
      setSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="spinner"></div>
        <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>Loading invoice details...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="state-container">
        <div className="state-icon" style={{ color: "#ef4444", backgroundColor: "#fef2f2" }}>
          <AlertCircle size={28} />
        </div>
        <h3 className="state-title">Invoice Not Found</h3>
        <p className="state-desc">{error || "Unable to locate this invoice record."}</p>
        <Link to="/invoices" className="btn btn-primary">
          Back to Invoices
        </Link>
      </div>
    );
  }

  const customer = invoice.customer || {};
  const laptop = invoice.laptop || {};
  const sellingPrice = invoice.sellingPrice || 0;
  const discount = invoice.discount || 0;
  const taxableAmount = sellingPrice - discount;
  const tax = invoice.tax || 0;
  const totalAmount = invoice.totalAmount || 0;
  const amountPaid = invoice.amountPaid || 0;
  const balance = Math.max(0, totalAmount - amountPaid);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Top Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/invoices")}>
          <ArrowLeft size={16} />
          <span>Back to Invoices</span>
        </button>

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print</span>
          </button>

          <button 
            type="button" 
            className="btn btn-primary"
            style={{ backgroundColor: "#0f172a" }}
            onClick={handleSendEmail} 
            disabled={sending}
          >
            <Send size={15} />
            <span>{sending ? "Sending..." : "Send Invoice"}</span>
          </button>

          <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
            <Download size={16} />
            <span>{downloading ? "Generating PDF..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Sheet Card */}
      <div className="card" style={{ padding: "36px 40px", backgroundColor: "#ffffff" }}>
        
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "2px solid #0f172a",
          paddingBottom: "20px",
          marginBottom: "24px"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "18px"
              }}>
                N
              </div>
              <div>
                <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  {businessInfo?.businessName || "LAPTOP_GUY LAPTOPS AND COMPUTERS"}
                </h1>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                  {businessInfo?.tagline || "Certified Pre-Owned Laptops & Workstations"}
                </div>
              </div>
            </div>

            <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.4 }}>
              {businessInfo?.address || "#42, 1st Cross, Tech Innovation Zone, SP Road, Bangalore - 560002"}<br />
              <strong>Phone:</strong> {businessInfo?.phone || "+91 98765 43210"} | <strong>Email:</strong> {businessInfo?.email || "billing@nextgenlaptops.com"}<br />
              <strong>GSTIN:</strong> {businessInfo?.gstin || "29AAAAA0000A1Z5"}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{
              display: "inline-block",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              padding: "4px 12px",
              borderRadius: "4px",
              marginBottom: "8px"
            }}>
              TAX INVOICE
            </div>
            <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              {invoice.invoiceNumber}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Date: {formatDate(invoice.createdAt)}
            </div>
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "6px" }}>
              <StatusBadge status={invoice.paymentStatus} />
              {invoice.emailStatus === "SENT" && (
                <span className="badge badge-paid" title={`Sent on ${formatDate(invoice.emailSentAt)}`}>
                  <Mail size={11} />
                  <span>Email Sent</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Transaction Info */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "24px"
        }}>
          <div>
            <h3 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "8px" }}>
              Billed To (Customer Details)
            </h3>
            <p style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
              {customer.name || "N/A"}
            </p>
            <p style={{ fontSize: "12.5px", color: "#475569", marginBottom: "2px" }}>
              <strong>Phone:</strong> {customer.phone || "N/A"}
            </p>
            <p style={{ fontSize: "12.5px", color: "#475569", marginBottom: "2px" }}>
              <strong>Email:</strong> {customer.email || <span style={{ color: "#ef4444" }}>Not Provided</span>}
            </p>
            <p style={{ fontSize: "12.5px", color: "#475569", marginBottom: "2px" }}>
              <strong>Address:</strong> {customer.address || "N/A"}
            </p>
            {customer.gstin && (
              <p style={{ fontSize: "12.5px", color: "#475569" }}>
                <strong>GSTIN:</strong> {customer.gstin}
              </p>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "8px" }}>
              Payment & Warranty Terms
            </h3>
            <p style={{ fontSize: "12.5px", color: "#475569", marginBottom: "3px" }}>
              <strong>Payment Mode:</strong> {invoice.paymentMethod || "CASH"}
            </p>
            <p style={{ fontSize: "12.5px", color: "#475569", marginBottom: "3px" }}>
              <strong>Payment Status:</strong> {invoice.paymentStatus || "PENDING"}
            </p>
            <p style={{ fontSize: "12.5px", color: "#475569", marginBottom: "3px" }}>
              <strong>Warranty Coverage:</strong> {invoice.warranty || laptop.warranty || "30 Days Hardware"}
            </p>
            <p style={{ fontSize: "12.5px", color: "#475569" }}>
              <strong>Email Delivery:</strong> {invoice.emailStatus === "SENT" ? `Sent (${formatDate(invoice.emailSentAt)})` : invoice.emailStatus === "FAILED" ? "Failed" : "Pending"}
            </p>
          </div>
        </div>

        {/* Product Table */}
        <div className="table-container" style={{ marginBottom: "24px", border: "1px solid #e2e8f0" }}>
          <table className="table">
            <thead>
              <tr style={{ backgroundColor: "#0f172a", color: "#ffffff" }}>
                <th style={{ color: "#ffffff" }}>Item & Technical Specifications</th>
                <th style={{ color: "#ffffff", textAlign: "center" }}>Condition</th>
                <th style={{ color: "#ffffff", textAlign: "center" }}>Qty</th>
                <th style={{ color: "#ffffff", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
                    {laptop.brand} {laptop.model}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>
                    Serial No: <strong>{laptop.serialNumber}</strong>
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569" }}>
                    {laptop.processor} • {laptop.ram} • {laptop.storage}
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  <StatusBadge status={laptop.condition} type="condition" />
                </td>
                <td style={{ textAlign: "center", fontWeight: 600 }}>1 Unit</td>
                <td style={{ textAlign: "right", fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                  {formatCurrency(sellingPrice)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals & Breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px", marginBottom: "28px" }}>
          <div style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "14px 18px",
            fontSize: "12px"
          }}>
            <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "#475569", marginBottom: "6px" }}>
              Terms & Conditions
            </h4>
            <ul style={{ paddingLeft: "16px", color: "#64748b", lineHeight: 1.4 }}>
              <li>Certified pre-owned laptops tested for performance & reliability.</li>
              <li>Warranty covers hardware components. Physical/Liquid damage is excluded.</li>
              <li>Original bill must be retained for warranty verification.</li>
            </ul>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Selling Price:</span>
              <strong style={{ color: "#1e293b" }}>{formatCurrency(sellingPrice)}</strong>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                <span style={{ color: "#16a34a" }}>Discount Applied:</span>
                <strong style={{ color: "#16a34a" }}>- {formatCurrency(discount)}</strong>
              </div>
            )}
            {tax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                <span style={{ color: "#64748b" }}>Tax / GST:</span>
                <strong style={{ color: "#1e293b" }}>+ {formatCurrency(tax)}</strong>
              </div>
            )}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: "8px",
              marginTop: "8px",
              borderTop: "2px solid #0f172a",
              borderBottom: "2px solid #0f172a",
              paddingBottom: "8px",
              fontSize: "15px"
            }}>
              <strong style={{ color: "#0f172a" }}>Grand Total:</strong>
              <strong style={{ color: "#0f172a", fontSize: "17px" }}>{formatCurrency(totalAmount)}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Amount Paid ({invoice.paymentMethod}):</span>
              <strong style={{ color: "#0f172a" }}>{formatCurrency(amountPaid)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
              <span style={{ color: balance > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>Balance Due:</span>
              <strong style={{ color: balance > 0 ? "#dc2626" : "#16a34a" }}>{formatCurrency(balance)}</strong>
            </div>
          </div>
        </div>

        {/* Footer Signature */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingTop: "24px",
          borderTop: "1px dashed #cbd5e1"
        }}>
          <div style={{
            border: "1px solid #93c5fd",
            backgroundColor: "#eff6ff",
            color: "#1d4ed8",
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "11.5px",
            fontWeight: 700
          }}>
            ★ {invoice.warranty || "30 Days"} Certified Warranty Active ★
          </div>

          <div style={{ textAlign: "center", width: "200px" }}>
            <div style={{ borderTop: "1px solid #0f172a", paddingTop: "4px", fontSize: "12px", fontWeight: 700 }}>
              Authorized Signatory
            </div>
            <div style={{ fontSize: "10.5px", color: "#64748b" }}>
              {businessInfo?.businessName || "LAPTOP_GUY LAPTOPS AND COMPUTERS"}
            </div>
          </div>
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
