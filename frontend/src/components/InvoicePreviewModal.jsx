import React from "react";
import Modal from "./Modal";
import StatusBadge from "./StatusBadge";
import { Laptop, User, CreditCard, ShieldCheck } from "lucide-react";

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  customerData,
  laptopData,
  billingData,
  onConfirm,
  isGenerating
}) {
  if (!laptopData || !isOpen) return null;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const sellingPrice = Number(laptopData.sellingPrice) || 0;
  const discount = Number(billingData.discount) || 0;
  const taxableAmount = Math.max(0, sellingPrice - discount);
  const tax = Number(billingData.tax) || 0;
  const totalAmount = taxableAmount + tax;
  const amountPaid = Number(billingData.amountPaid) || 0;
  const balance = Math.max(0, totalAmount - amountPaid);

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
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Provisional Tax Invoice
              </span>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                Laptop_Guy Laptops & Computers
              </h3>
            </div>
            <div style={{ textAlign: "right" }}>
              <StatusBadge status={billingData.paymentStatus} />
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                Mode: <strong>{billingData.paymentMethod}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 2 Column Details: Customer & Laptop */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
          {/* Customer info */}
          <div style={{
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "14px 16px",
            backgroundColor: "#ffffff"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563eb", fontWeight: 700, fontSize: "12.5px", marginBottom: "8px" }}>
              <User size={15} />
              <span>Customer Details</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
              {customerData.name || "N/A"}
            </p>
            <p style={{ fontSize: "12.5px", color: "#475569", marginBottom: "2px" }}>
              <strong>Phone:</strong> {customerData.phone || "N/A"}
            </p>
            {customerData.email && (
              <p style={{ fontSize: "12.5px", color: "#475569", marginBottom: "2px" }}>
                <strong>Email:</strong> {customerData.email}
              </p>
            )}
            <p style={{ fontSize: "12.5px", color: "#475569", marginBottom: "2px" }}>
              <strong>Address:</strong> {customerData.address || "N/A"}
            </p>
            {customerData.gstin && (
              <p style={{ fontSize: "12.5px", color: "#475569" }}>
                <strong>GSTIN:</strong> {customerData.gstin}
              </p>
            )}
          </div>

          {/* Laptop info */}
          <div style={{
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "14px 16px",
            backgroundColor: "#ffffff"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563eb", fontWeight: 700, fontSize: "12.5px", marginBottom: "8px" }}>
              <Laptop size={15} />
              <span>Selected Laptop</span>
            </div>
            <p style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
              {laptopData.brand} {laptopData.model}
            </p>
            <p style={{ fontSize: "12px", color: "#475569", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>
              <strong>S/N:</strong> {laptopData.serialNumber}
            </p>
            <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "2px" }}>
              {laptopData.processor} | {laptopData.ram} | {laptopData.storage}
            </p>
            <p style={{ fontSize: "12px", color: "#0284c7", fontWeight: 600 }}>
              Condition: {laptopData.condition}
            </p>
          </div>
        </div>

        {/* Financial Calculation Table */}
        <div style={{
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "14px 18px",
          backgroundColor: "#f8fafc",
          marginBottom: "16px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
            <span style={{ color: "#64748b" }}>Base Selling Price:</span>
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
            fontSize: "15px"
          }}>
            <strong style={{ color: "#0f172a" }}>Grand Total:</strong>
            <strong style={{ color: "#0f172a", fontSize: "16px" }}>{formatCurrency(totalAmount)}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "13px" }}>
            <span style={{ color: "#475569" }}>Amount Paid ({billingData.paymentMethod}):</span>
            <strong style={{ color: "#0f172a" }}>{formatCurrency(amountPaid)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "13px" }}>
            <span style={{ color: balance > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>Balance Due:</span>
            <strong style={{ color: balance > 0 ? "#dc2626" : "#16a34a" }}>{formatCurrency(balance)}</strong>
          </div>
        </div>

        {/* Warranty Notice */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#1d4ed8", backgroundColor: "#eff6ff", padding: "8px 12px", borderRadius: "6px" }}>
          <ShieldCheck size={16} />
          <span><strong>Warranty Included:</strong> {billingData.warranty || laptopData.warranty || "30 Days Hardware"}</span>
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
