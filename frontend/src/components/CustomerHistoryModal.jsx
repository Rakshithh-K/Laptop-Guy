import React from "react";
import Modal from "./Modal";
import StatusBadge from "./StatusBadge";
import { Download, ExternalLink, Calendar, Phone, Mail, MapPin } from "lucide-react";
import { downloadInvoicePdf } from "../api/invoiceApi";

export default function CustomerHistoryModal({ isOpen, onClose, customer, onSelectInvoice }) {
  if (!customer) return null;

  const handleDownload = async (e, invoice) => {
    e.stopPropagation();
    try {
      await downloadInvoicePdf(invoice._id, invoice.invoiceNumber);
    } catch (err) {
      console.error("Failed to download PDF", err);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const invoices = customer.invoices || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Customer Profile: ${customer.name}`}
      size="lg"
    >
      <div className="modal-body">
        {/* Customer Information Card */}
        <div style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "16px 20px",
          marginBottom: "20px"
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", fontSize: "13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#334155" }}>
              <Phone size={15} color="#64748b" />
              <span><strong>Phone:</strong> {customer.phone}</span>
            </div>
            {customer.email && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#334155" }}>
                <Mail size={15} color="#64748b" />
                <span><strong>Email:</strong> {customer.email}</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#334155" }}>
              <MapPin size={15} color="#64748b" />
              <span><strong>Address:</strong> {customer.address}</span>
            </div>
            {customer.gstin && (
              <div style={{ color: "#334155" }}>
                <span><strong>GSTIN:</strong> {customer.gstin}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "20px", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
            <div>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Total Purchases: </span>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>{customer.purchaseCount || invoices.length}</strong>
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Lifetime Spent: </span>
              <strong style={{ fontSize: "14px", color: "#2563eb" }}>{formatCurrency(customer.totalSpent)}</strong>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
          Purchased Laptops & Invoices
        </h3>

        {invoices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px", color: "#64748b", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
            No invoice records found for this customer.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Laptop Model</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {inv.invoiceNumber}
                    </td>
                    <td>
                      {new Date(inv.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td>
                      {inv.laptop ? `${inv.laptop.brand} ${inv.laptop.model}` : "Laptop Record"}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td>
                      <StatusBadge status={inv.paymentStatus} />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Download PDF"
                          onClick={(e) => handleDownload(e, inv)}
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
