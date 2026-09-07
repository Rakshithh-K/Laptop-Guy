import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Laptop,
  IndianRupee,
  Calendar,
  X,
  ArrowRight
} from "lucide-react";
import Modal from "./Modal";
import StatusBadge from "./StatusBadge";
import { createReturn } from "../api/returnApi";

export default function ReturnModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
  showToast
}) {
  const [selectedLaptopId, setSelectedLaptopId] = useState("");
  const [returnQty, setReturnQty] = useState(1);
  const [refundAmount, setRefundAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  // Extract products/items with return statuses
  const rawItems = invoice?.itemReturnStatuses || [];
  const items = rawItems.length > 0 ? rawItems : (invoice?.items || []).map((it) => {
    const l = it.laptop || {};
    const itemPrice = Number(it.sellingPrice) || Number(l.sellingPrice) || 0;
    return {
      laptopId: l._id || l,
      brand: l.brand || "",
      model: l.model || "",
      serialNumber: l.serialNumber || "",
      processor: l.processor || "",
      ram: l.ram || "",
      storage: l.storage || "",
      condition: l.condition || "",
      soldQuantity: it.quantity ? Number(it.quantity) : 1,
      returnedQuantity: 0,
      remainingReturnableQty: it.quantity ? Number(it.quantity) : 1,
      originalSellingPrice: itemPrice,
      originalSellingPriceAfterDiscount: itemPrice,
      returnStatus: "NOT_RETURNED"
    };
  });

  // Filter returnable items
  const returnableItems = items.filter((it) => (it.remainingReturnableQty || 1) > 0);

  // Auto-select first returnable item
  useEffect(() => {
    if (isOpen && returnableItems.length > 0) {
      const firstId = returnableItems[0].laptopId?.toString() || "";
      setSelectedLaptopId(firstId);
      const defaultItem = returnableItems[0];
      setReturnQty(1);
      setRefundAmount(
        defaultItem.originalSellingPriceAfterDiscount !== undefined
          ? defaultItem.originalSellingPriceAfterDiscount
          : defaultItem.originalSellingPrice || 0
      );
      setReason("");
      setError("");
      setIsConfirming(false);
    }
  }, [isOpen, invoice]);

  const selectedItem = items.find(
    (it) => it.laptopId?.toString() === selectedLaptopId?.toString()
  );

  // Handle product selection change
  const handleProductChange = (laptopId) => {
    setSelectedLaptopId(laptopId);
    const item = items.find((it) => it.laptopId?.toString() === laptopId.toString());
    if (item) {
      setReturnQty(1);
      setRefundAmount(
        item.originalSellingPriceAfterDiscount !== undefined
          ? item.originalSellingPriceAfterDiscount
          : item.originalSellingPrice || 0
      );
    }
    setError("");
    setIsConfirming(false);
  };

  const handleReturnQtyChange = (e) => {
    const val = parseInt(e.target.value, 10) || 1;
    const maxQty = selectedItem?.remainingReturnableQty || 1;
    const clamped = Math.max(1, Math.min(val, maxQty));
    setReturnQty(clamped);

    // Proportionally update default refund amount
    if (selectedItem) {
      const unitPrice = selectedItem.originalSellingPriceAfterDiscount || selectedItem.originalSellingPrice || 0;
      setRefundAmount(unitPrice * clamped);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const handleProceedToConfirm = (e) => {
    e.preventDefault();
    setError("");

    if (!selectedItem) {
      setError("Please select a product to return.");
      return;
    }

    if (returnQty <= 0) {
      setError("Return quantity must be greater than 0.");
      return;
    }

    if (returnQty > (selectedItem.remainingReturnableQty || 1)) {
      setError(`Cannot return more than remaining returnable quantity (${selectedItem.remainingReturnableQty}).`);
      return;
    }

    const parsedRefund = Number(refundAmount);
    if (isNaN(parsedRefund) || parsedRefund < 0) {
      setError("Please enter a valid refund amount greater than or equal to 0.");
      return;
    }

    setIsConfirming(true);
  };

  const handleProcessReturn = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = {
        invoiceId: invoice._id,
        laptopId: selectedLaptopId,
        returnedQuantity: returnQty,
        refundAmount: Number(refundAmount),
        reason: reason.trim()
      };

      const res = await createReturn(payload);
      if (showToast) {
        showToast(res.message || "Product returned successfully! Inventory updated.", "success");
      }
      if (onSuccess) {
        onSuccess(res);
      }
      onClose();
    } catch (err) {
      setError(err.customMessage || "Failed to process return. Please check your inputs.");
      setIsConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Return Product"
      size="lg"
    >
      <div style={{ padding: "4px 0" }}>
        {/* Invoice Summary Banner */}
        <div style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px"
        }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
              Original Invoice
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", fontFamily: "var(--font-mono)" }}>
              {invoice?.invoiceNumber || "INV-XXXX"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
              Customer
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
              {invoice?.customer?.name || "Customer"} ({invoice?.customer?.phone || "N/A"})
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "16px" }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: "13px" }}>{error}</div>
          </div>
        )}

        {returnableItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 20px" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px auto",
              color: "#64748b"
            }}>
              <CheckCircle2 size={24} />
            </div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
              All Products Already Returned
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "340px", margin: "0 auto 16px auto" }}>
              Every item in invoice {invoice?.invoiceNumber} has already been returned and restored to inventory.
            </p>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close Window
            </button>
          </div>
        ) : !isConfirming ? (
          /* Step 1: Return Configuration Form */
          <form onSubmit={handleProceedToConfirm}>
            {/* Product Selection (if multi-item invoice) */}
            <div className="form-group">
              <label className="form-label">
                Select Product to Return <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {items.map((item, idx) => {
                  const isSelected = item.laptopId?.toString() === selectedLaptopId?.toString();
                  const isFullyReturned = item.returnStatus === "FULLY_RETURNED" || (item.remainingReturnableQty || 0) <= 0;

                  return (
                    <div
                      key={item.laptopId || idx}
                      onClick={() => !isFullyReturned && handleProductChange(item.laptopId)}
                      style={{
                        border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                        backgroundColor: isFullyReturned ? "#f8fafc" : isSelected ? "#eff6ff" : "#ffffff",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        cursor: isFullyReturned ? "not-allowed" : "pointer",
                        opacity: isFullyReturned ? 0.6 : 1,
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="radio"
                            name="returnProduct"
                            checked={isSelected}
                            disabled={isFullyReturned}
                            onChange={() => handleProductChange(item.laptopId)}
                            style={{ cursor: isFullyReturned ? "not-allowed" : "pointer" }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "13.5px", color: "#0f172a" }}>
                              {item.brand} {item.model}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#64748b", fontFamily: "var(--font-mono)" }}>
                              S/N: {item.serialNumber || "N/A"}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <StatusBadge status={item.returnStatus || "NOT_RETURNED"} type="return" />
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                            {formatCurrency(item.originalSellingPriceAfterDiscount || item.originalSellingPrice)}
                          </div>
                        </div>
                      </div>

                      {/* Quantities info */}
                      <div style={{
                        display: "flex",
                        gap: "14px",
                        fontSize: "11.5px",
                        color: "#475569",
                        marginTop: "8px",
                        paddingTop: "6px",
                        borderTop: "1px dashed #e2e8f0"
                      }}>
                        <span>Sold: <strong>{item.soldQuantity || 1}</strong></span>
                        <span>Already Returned: <strong>{item.returnedQuantity || 0}</strong></span>
                        <span style={{ color: item.remainingReturnableQty > 0 ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                          Returnable: <strong>{item.remainingReturnableQty || 0}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedItem && (
              <>
                {/* Details Breakdown Box */}
                <div style={{
                  backgroundColor: "#f1f5f9",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  fontSize: "12.5px"
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <span style={{ color: "#64748b" }}>Selected Product:</span>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>
                        {selectedItem.brand} {selectedItem.model}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Selling Price (After Discount):</span>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>
                        {formatCurrency(selectedItem.originalSellingPriceAfterDiscount || selectedItem.originalSellingPrice)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="form-group">
                    <label className="form-label">
                      Return Quantity <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedItem.remainingReturnableQty || 1}
                      value={returnQty}
                      onChange={handleReturnQtyChange}
                      className="form-control"
                      required
                    />
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      Max returnable: {selectedItem.remainingReturnableQty || 1}
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Return Value / Refund Amount (₹) <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 45000"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="form-control"
                      required
                    />
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      Exact amount refunded to customer
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Return</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Customer requested refund, model exchange, hardware issue..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="form-control"
                    style={{ resize: "vertical" }}
                  />
                </div>
              </>
            )}

            {/* Modal Actions */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "1px solid #e2e8f0"
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ backgroundColor: "#2563eb" }}
                disabled={!selectedItem}
              >
                <span>Continue</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Confirmation Dialog Step */
          <div>
            <div style={{
              backgroundColor: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "18px"
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#92400e", margin: "0 0 4px 0" }}>
                    Confirm Return Processing
                  </h4>
                  <p style={{ fontSize: "12.5px", color: "#b45309", margin: 0, lineHeight: 1.4 }}>
                    Please review the return details below. Once processed, the inventory stock will be restored immediately and profit calculations will be updated.
                  </p>
                </div>
              </div>
            </div>

            {/* Refund Summary Card */}
            <div style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px"
            }}>
              <h5 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "12px" }}>
                Refund Summary
              </h5>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Invoice:</span>
                  <strong style={{ color: "#0f172a" }}>{invoice?.invoiceNumber}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Product:</span>
                  <strong style={{ color: "#0f172a" }}>{selectedItem?.brand} {selectedItem?.model}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Serial Number:</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{selectedItem?.serialNumber}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Quantity Returning:</span>
                  <strong style={{ color: "#2563eb" }}>{returnQty} Unit</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Original Sold Price (After Disc):</span>
                  <span>{formatCurrency(selectedItem?.originalSellingPriceAfterDiscount || selectedItem?.originalSellingPrice)}</span>
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "8px",
                  marginTop: "4px",
                  borderTop: "1px solid #cbd5e1",
                  fontSize: "15px"
                }}>
                  <strong style={{ color: "#0f172a" }}>Total Customer Refund:</strong>
                  <strong style={{ color: "#dc2626", fontSize: "16px" }}>{formatCurrency(refundAmount)}</strong>
                </div>
                {reason && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <span style={{ color: "#64748b" }}>Reason:</span>
                    <span style={{ color: "#475569", fontStyle: "italic", textAlign: "right" }}>"{reason}"</span>
                  </div>
                )}
                <div style={{
                  backgroundColor: "#ecfdf5",
                  color: "#065f46",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  marginTop: "6px"
                }}>
                  ✓ Laptop status will be changed to AVAILABLE in inventory
                </div>
              </div>
            </div>

            {/* Confirmation Action Buttons */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "1px solid #e2e8f0"
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsConfirming(false)}
                disabled={loading}
              >
                Back to Edit
              </button>

              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: "#dc2626" }}
                onClick={handleProcessReturn}
                disabled={loading}
              >
                <RotateCcw size={15} />
                <span>{loading ? "Processing Return..." : "Confirm & Process Return"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
