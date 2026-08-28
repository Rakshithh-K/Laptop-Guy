import React, { useState } from "react";
import Modal from "./Modal";
import StatusBadge from "./StatusBadge";
import { CheckCircle2, Download, Eye, PlusCircle, Mail, Send, AlertCircle, RefreshCw } from "lucide-react";
import { downloadInvoicePdf, sendInvoice } from "../api/invoiceApi";
import { useNavigate } from "react-router-dom";

export default function InvoiceSuccessModal({
  isOpen,
  onClose,
  invoice,
  onReset
}) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState(null); // { type: 'success'|'error'|'warning', text: string }

  if (!isOpen || !invoice) return null;

  const customer = invoice.customer || {};
  const laptop = invoice.laptop || {};

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadInvoicePdf(invoice._id, invoice.invoiceNumber);
    } catch (err) {
      console.error("Failed to download PDF", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    setEmailStatusMsg(null);

    if (!customer.email || !customer.email.trim()) {
      setEmailStatusMsg({
        type: "warning",
        text: "Customer email address is required to send the invoice."
      });
      return;
    }

    setSending(true);
    try {
      const res = await sendInvoice(invoice._id);
      setEmailStatusMsg({
        type: "success",
        text: `Invoice sent successfully to ${res.email || customer.email}`
      });
    } catch (err) {
      console.error("Failed to send invoice email", err);
      setEmailStatusMsg({
        type: "error",
        text: err.customMessage || "Unable to send invoice. Please try again."
      });
    } finally {
      setSending(false);
    }
  };

  const handleViewDetails = () => {
    onClose();
    navigate(`/invoices/${invoice._id}`);
  };

  const handleCreateAnother = () => {
    onClose();
    if (onReset) onReset();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice Generated Successfully"
      size="md"
    >
      <div className="modal-body" style={{ textAlign: "center", padding: "24px 24px 20px" }}>
        <div style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#ecfdf5",
          color: "#10b981",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 12px"
        }}>
          <CheckCircle2 size={32} />
        </div>

        <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>
          Bill Created & Laptop Sold!
        </h3>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
          Invoice <strong style={{ color: "#0f172a", fontFamily: "var(--font-mono)" }}>{invoice.invoiceNumber}</strong> has been saved and the laptop inventory status is updated to SOLD.
        </p>

        {/* Email Feedback Banner */}
        {emailStatusMsg && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderRadius: "8px",
            marginBottom: "14px",
            fontSize: "13px",
            fontWeight: 500,
            textAlign: "left",
            backgroundColor: emailStatusMsg.type === "success" ? "#ecfdf5" : emailStatusMsg.type === "warning" ? "#fffbeb" : "#fef2f2",
            border: `1px solid ${emailStatusMsg.type === "success" ? "#a7f3d0" : emailStatusMsg.type === "warning" ? "#fde68a" : "#fecaca"}`,
            color: emailStatusMsg.type === "success" ? "#065f46" : emailStatusMsg.type === "warning" ? "#92400e" : "#991b1b"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {emailStatusMsg.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span>{emailStatusMsg.text}</span>
            </div>

            {emailStatusMsg.type === "error" && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "11px", padding: "2px 8px" }}
                onClick={handleSendEmail}
                disabled={sending}
              >
                <RefreshCw size={11} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* Mini details card */}
        <div style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "12px 16px",
          textAlign: "left",
          fontSize: "13px",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ color: "#64748b" }}>Customer:</span>
            <strong style={{ color: "#0f172a" }}>{customer.name} {customer.email ? `(${customer.email})` : ""}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ color: "#64748b" }}>Laptop:</span>
            <strong style={{ color: "#0f172a" }}>{laptop.brand} {laptop.model}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ color: "#64748b" }}>Total Amount:</span>
            <strong style={{ color: "#2563eb", fontSize: "14px" }}>{formatCurrency(invoice.totalAmount)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#64748b" }}>Payment Status:</span>
            <StatusBadge status={invoice.paymentStatus} />
          </div>
        </div>

        {/* Primary Action Buttons: Download & Send Invoice */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ justifyContent: "center" }}
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download size={16} />
              <span>{downloading ? "Preparing PDF..." : "Download Invoice"}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              style={{ justifyContent: "center", backgroundColor: "#0f172a" }}
              onClick={handleSendEmail}
              disabled={sending}
            >
              <Send size={15} />
              <span>{sending ? "Sending..." : "Send Invoice"}</span>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: "center" }}
              onClick={handleViewDetails}
            >
              <Eye size={16} />
              <span>View Details</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: "center" }}
              onClick={handleCreateAnother}
            >
              <PlusCircle size={16} />
              <span>Create Another</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
