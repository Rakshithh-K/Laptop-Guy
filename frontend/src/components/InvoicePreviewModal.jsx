import React from "react";
import Modal from "./Modal";
import StatusBadge from "./StatusBadge";
import { Laptop, User, CreditCard, ShieldCheck } from "lucide-react";
import logoImg from "../assets/logo.jpeg";
import sigImg from "../assets/nawsig.jpeg";

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  customerData,
  items = [],
  laptopData,
  billingData,
  onConfirm,
  isGenerating
}) {
  if (!isOpen) return null;

  const productList = items.length > 0
    ? items.map(it => it.laptop).filter(Boolean)
    : (laptopData ? [laptopData] : []);

  if (productList.length === 0) return null;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const subtotal = billingData.subtotal !== undefined
    ? billingData.subtotal
    : productList.reduce((acc, l) => acc + (Number(l.sellingPrice) || 0), 0);

  const discount = Number(billingData.discount) || 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Number(billingData.tax) || 0;
  const totalAmount = billingData.totalAmount !== undefined ? billingData.totalAmount : (taxableAmount + tax);
  const amountPaid = Number(billingData.amountPaid) || 0;
  const balance = billingData.balance !== undefined ? billingData.balance : Math.max(0, totalAmount - amountPaid);
  const transactionId = billingData.transactionId ? billingData.transactionId.trim() : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Preview Bill Before Final Submission"
      size="lg"
    >
      <div className="modal-body" style={{ padding: "20px 24px" }}>
        {/* Bill Summary Banner */}
        <div style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "16px 20px",
          marginBottom: "18px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src={logoImg}
                alt="Logo"
                style={{ width: "38px", height: "38px", borderRadius: "8px", objectFit: "cover", border: "1px solid #e2e8f0" }}
              />
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Provisional Tax Invoice
                </span>
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", margin: "0" }}>
                  Laptop_Guy Laptops & Computers
                </h3>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <StatusBadge status={billingData.paymentStatus} />
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                Mode: <strong>{billingData.paymentMethod}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Payment Info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          {/* Customer info */}
          <div style={{
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "12px 14px",
            backgroundColor: "#ffffff"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563eb", fontWeight: 700, fontSize: "12px", marginBottom: "6px" }}>
              <User size={14} />
              <span>Customer Details</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: "13.5px", color: "#0f172a", marginBottom: "2px" }}>
              {customerData.name || "N/A"}
            </p>
            <p style={{ fontSize: "12px", color: "#475569", marginBottom: "2px" }}>
              <strong>Phone:</strong> {customerData.phone || "N/A"}
            </p>
            {customerData.email && (
              <p style={{ fontSize: "12px", color: "#475569", marginBottom: "2px" }}>
                <strong>Email:</strong> {customerData.email}
              </p>
            )}
            <p style={{ fontSize: "12px", color: "#475569" }}>
              <strong>Address:</strong> {customerData.address || "N/A"}
            </p>
          </div>

          {/* Payment & Warranty */}
          <div style={{
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "12px 14px",
            backgroundColor: "#ffffff"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563eb", fontWeight: 700, fontSize: "12px", marginBottom: "6px" }}>
              <CreditCard size={14} />
              <span>Settlement Details</span>
            </div>
            <p style={{ fontSize: "12px", color: "#475569", marginBottom: "3px" }}>
              <strong>Mode:</strong> {billingData.paymentMethod}
            </p>
            {transactionId && (
              <p style={{ fontSize: "12px", color: "#475569", marginBottom: "3px" }}>
                <strong>Transaction ID / UTR:</strong> <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>{transactionId}</span>
              </p>
            )}
            <p style={{ fontSize: "12px", color: "#475569", marginBottom: "3px" }}>
              <strong>Status:</strong> {billingData.paymentStatus}
            </p>
            <p style={{ fontSize: "12px", color: "#475569" }}>
              <strong>Warranty:</strong> {billingData.warranty || "30 Days Hardware Warranty"}
            </p>
          </div>
        </div>

        {/* Selected Products Table */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
          <div style={{ backgroundColor: "#0f172a", color: "#ffffff", padding: "8px 12px", fontSize: "12px", fontWeight: 700 }}>
            Purchased Laptops ({productList.length})
          </div>
          <div style={{ maxHeight: "160px", overflowY: "auto" }}>
            <table className="table" style={{ margin: 0, fontSize: "12px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th style={{ width: "8%" }}>#</th>
                  <th>Product & Serial</th>
                  <th>Specs</th>
                  <th style={{ textAlign: "right" }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {productList.map((l, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <strong>{l.brand} {l.model}</strong>
                      <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>
                        S/N: {l.serialNumber}
                      </div>
                    </td>
                    <td>
                      {l.processor} | {l.ram} | {l.storage}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {formatCurrency(l.sellingPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Calculation Table */}
        <div style={{
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "12px 16px",
          backgroundColor: "#f8fafc",
          marginBottom: "16px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "12.5px" }}>
            <span style={{ color: "#64748b" }}>Subtotal ({productList.length} Items):</span>
            <strong style={{ color: "#1e293b" }}>{formatCurrency(subtotal)}</strong>
          </div>
          {discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "12.5px" }}>
              <span style={{ color: "#16a34a" }}>Discount Applied:</span>
              <strong style={{ color: "#16a34a" }}>- {formatCurrency(discount)}</strong>
            </div>
          )}
          {tax > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "12.5px" }}>
              <span style={{ color: "#64748b" }}>Tax / GST:</span>
              <strong style={{ color: "#1e293b" }}>+ {formatCurrency(tax)}</strong>
            </div>
          )}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: "6px",
            marginTop: "6px",
            borderTop: "2px solid #0f172a",
            fontSize: "14.5px"
          }}>
            <strong style={{ color: "#0f172a" }}>Grand Total:</strong>
            <strong style={{ color: "#0f172a", fontSize: "16px" }}>{formatCurrency(totalAmount)}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "12.5px" }}>
            <span style={{ color: "#475569" }}>Amount Paid ({billingData.paymentMethod}):</span>
            <strong style={{ color: "#0f172a" }}>{formatCurrency(amountPaid)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "12.5px" }}>
            <span style={{ color: balance > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>Balance Due:</span>
            <strong style={{ color: balance > 0 ? "#dc2626" : "#16a34a" }}>{formatCurrency(balance)}</strong>
          </div>
        </div>

        {/* Signature & Warranty Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#eff6ff", padding: "8px 14px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#1d4ed8" }}>
            <ShieldCheck size={16} />
            <span><strong>Warranty:</strong> {billingData.warranty || "30 Days Hardware"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Signatory:</span>
            <img src={sigImg} alt="Signature" style={{ maxHeight: "28px", maxWidth: "80px", objectFit: "contain" }} />
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          disabled={isGenerating}
        >
          Back to Edit
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating Invoice & PDF..." : "Confirm & Generate Bill"}
        </button>
      </div>
    </Modal>
  );
}
