import React, { useState, useEffect } from "react";
import { 
  ReceiptText, 
  User, 
  Laptop, 
  CreditCard, 
  Calculator, 
  ShieldCheck, 
  Eye, 
  CheckCircle2, 
  Search,
  Plus,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import InvoiceSuccessModal from "../components/InvoiceSuccessModal";
import Toast from "../components/Toast";
import { getLaptops } from "../api/laptopApi";
import { getCustomers } from "../api/customerApi";
import { createInvoice } from "../api/invoiceApi";

export default function CreateBill() {
  // Master data
  const [availableLaptops, setAvailableLaptops] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Customer Mode: "EXISTING" | "NEW"
  const [customerMode, setCustomerMode] = useState("EXISTING");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstin: ""
  });

  // Laptop Selection
  const [selectedLaptopId, setSelectedLaptopId] = useState("");
  const [laptopSearch, setLaptopSearch] = useState("");

  // Billing & Payment Calculation
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [amountPaid, setAmountPaid] = useState("");
  const [warrantyOverride, setWarrantyOverride] = useState("");

  // UI States
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [toast, setToast] = useState(null);
  const [formError, setFormError] = useState("");

  // Load available laptops & customers on mount
  const loadData = async () => {
    setLoadingData(true);
    try {
      const [laptopsRes, customersRes] = await Promise.all([
        getLaptops({ status: "AVAILABLE" }),
        getCustomers()
      ]);
      setAvailableLaptops(laptopsRes);
      setCustomers(customersRes);
    } catch (err) {
      console.error("Failed to load billing dependencies", err);
      showToast("Failed to load inventory or customer list", "error");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Selected entities
  const selectedCustomer = customers.find((c) => c._id === selectedCustomerId) || null;
  const selectedLaptop = availableLaptops.find((l) => l._id === selectedLaptopId) || null;

  // Auto set warranty & amount paid when laptop changes
  useEffect(() => {
    if (selectedLaptop) {
      setWarrantyOverride(selectedLaptop.warranty || "30 Days Hardware Warranty");
      const sellPrice = Number(selectedLaptop.sellingPrice) || 0;
      const initialTotal = Math.max(0, sellPrice - (Number(discount) || 0)) + (Number(tax) || 0);
      setAmountPaid(initialTotal.toString());
      setPaymentStatus("PAID");
    } else {
      setWarrantyOverride("");
      setAmountPaid("");
    }
  }, [selectedLaptopId]);

  // Pricing calculations
  const sellingPrice = selectedLaptop ? Number(selectedLaptop.sellingPrice) || 0 : 0;
  const numDiscount = Math.max(0, Number(discount) || 0);
  const taxableAmount = Math.max(0, sellingPrice - numDiscount);
  const numTax = Math.max(0, Number(tax) || 0);
  const totalAmount = taxableAmount + numTax;
  const numAmountPaid = Math.max(0, Number(amountPaid) || 0);
  const balance = Math.max(0, totalAmount - numAmountPaid);

  // Sync amountPaid when discount or tax changes if in PAID mode
  const handleDiscountChange = (val) => {
    const d = Math.max(0, Number(val) || 0);
    setDiscount(val);
    const newTotal = Math.max(0, sellingPrice - d) + numTax;
    if (paymentStatus === "PAID") {
      setAmountPaid(newTotal.toString());
    }
  };

  const handleTaxChange = (val) => {
    const t = Math.max(0, Number(val) || 0);
    setTax(val);
    const newTotal = taxableAmount + t;
    if (paymentStatus === "PAID") {
      setAmountPaid(newTotal.toString());
    }
  };

  const handlePaymentStatusChange = (status) => {
    setPaymentStatus(status);
    if (status === "PAID") {
      setAmountPaid(totalAmount.toString());
    } else if (status === "PENDING") {
      setAmountPaid("0");
    }
  };

  const handleAmountPaidChange = (val) => {
    setAmountPaid(val);
    const paid = Number(val) || 0;
    if (paid >= totalAmount && totalAmount > 0) {
      setPaymentStatus("PAID");
    } else if (paid > 0 && paid < totalAmount) {
      setPaymentStatus("PARTIAL");
    } else if (paid === 0) {
      setPaymentStatus("PENDING");
    }
  };

  const validateForm = () => {
    setFormError("");

    // Customer validation
    if (customerMode === "EXISTING") {
      if (!selectedCustomerId) {
        setFormError("Please select a customer or switch to 'Add New Customer'.");
        return false;
      }
    } else {
      if (!newCustomer.name.trim() || !newCustomer.phone.trim() || !newCustomer.address.trim()) {
        setFormError("Please fill in required customer details (Name, Phone, Address).");
        return false;
      }
    }

    // Laptop validation
    if (!selectedLaptopId) {
      setFormError("Please select an available laptop for this bill.");
      return false;
    }

    // Price validation
    if (numDiscount > sellingPrice) {
      setFormError("Discount cannot exceed laptop selling price.");
      return false;
    }

    if (numAmountPaid > totalAmount) {
      setFormError("Amount paid cannot exceed total invoice amount.");
      return false;
    }

    return true;
  };

  const handleOpenPreview = () => {
    if (!validateForm()) return;
    setPreviewOpen(true);
  };

  const handleGenerateBill = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        laptopId: selectedLaptopId,
        discount: numDiscount,
        tax: numTax,
        paymentMethod,
        paymentStatus,
        amountPaid: numAmountPaid,
        warranty: warrantyOverride || selectedLaptop?.warranty
      };

      if (customerMode === "EXISTING") {
        payload.customerId = selectedCustomerId;
      } else {
        payload.newCustomer = newCustomer;
      }

      const invoice = await createInvoice(payload);
      setPreviewOpen(false);
      setCreatedInvoice(invoice);
      setSuccessModalOpen(true);
      showToast(`Invoice ${invoice.invoiceNumber} created successfully!`, "success");

      // Reload inventory so the sold laptop disappears from available list
      loadData();
    } catch (err) {
      setFormError(err.customMessage || "Failed to generate invoice. Please try again.");
      showToast(err.customMessage || "Invoice creation failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedLaptopId("");
    setSelectedCustomerId("");
    setCustomerMode("EXISTING");
    setNewCustomer({ name: "", phone: "", email: "", address: "", gstin: "" });
    setDiscount(0);
    setTax(0);
    setPaymentMethod("UPI");
    setPaymentStatus("PAID");
    setAmountPaid("");
    setWarrantyOverride("");
    setFormError("");
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Filtered lists for dropdowns
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  const filteredLaptops = availableLaptops.filter(
    (l) =>
      l.brand.toLowerCase().includes(laptopSearch.toLowerCase()) ||
      l.model.toLowerCase().includes(laptopSearch.toLowerCase()) ||
      l.serialNumber.toLowerCase().includes(laptopSearch.toLowerCase())
  );

  const resolvedCustomerData =
    customerMode === "EXISTING" && selectedCustomer
      ? selectedCustomer
      : newCustomer;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>
            Create Customer Bill
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Select an available laptop from inventory, assign customer details, and issue an official tax invoice.
          </p>
        </div>

        <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetForm}>
          <RefreshCw size={14} />
          <span>Reset Form</span>
        </button>
      </div>

      {formError && (
        <div style={{
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#b91c1c",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "13.5px",
          fontWeight: 600
        }}>
          <AlertCircle size={18} />
          <span>{formError}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Left Column: Customer & Laptop Selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* SECTION 1: CUSTOMER DETAILS */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                  1
                </div>
                <div>
                  <h3 className="card-title">Customer Information</h3>
                  <div className="card-subtitle">Select existing or register buyer</div>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="filter-tabs">
                <button
                  type="button"
                  className={`filter-tab ${customerMode === "EXISTING" ? "active" : ""}`}
                  onClick={() => setCustomerMode("EXISTING")}
                >
                  Existing Customer
                </button>
                <button
                  type="button"
                  className={`filter-tab ${customerMode === "NEW" ? "active" : ""}`}
                  onClick={() => setCustomerMode("NEW")}
                >
                  + New Customer
                </button>
              </div>
            </div>

            {customerMode === "EXISTING" ? (
              <div>
                <div className="form-group">
                  <label className="form-label">
                    Search & Select Customer <span className="required">*</span>
                  </label>
                  <select
                    className="form-control"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">-- Choose from existing customers ({customers.length}) --</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} - {c.phone} {c.address ? `(${c.address})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    fontSize: "12.5px"
                  }}>
                    <div><strong>Name:</strong> {selectedCustomer.name}</div>
                    <div><strong>Phone:</strong> {selectedCustomer.phone}</div>
                    {selectedCustomer.email && <div><strong>Email:</strong> {selectedCustomer.email}</div>}
                    <div><strong>Address:</strong> {selectedCustomer.address}</div>
                    {selectedCustomer.gstin && <div><strong>GSTIN:</strong> {selectedCustomer.gstin}</div>}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Customer Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Anand Varma"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Phone Number <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9845012345"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. anand@gmail.com"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">GSTIN (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      style={{ textTransform: "uppercase" }}
                      value={newCustomer.gstin}
                      onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Billing Address <span className="required">*</span>
                  </label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="e.g. #45, 3rd Block, Koramangala, Bangalore"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: SELECT LAPTOP */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                  2
                </div>
                <div>
                  <h3 className="card-title">Select Available Laptop</h3>
                  <div className="card-subtitle">Authoritative specs and locked selling price from database</div>
                </div>
              </div>

              <span className="badge badge-available">
                {availableLaptops.length} Units In Stock
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">
                Choose Laptop Unit <span className="required">*</span>
              </label>
              <select
                className="form-control"
                value={selectedLaptopId}
                onChange={(e) => setSelectedLaptopId(e.target.value)}
              >
                <option value="">-- Select an Available Laptop Unit --</option>
                {availableLaptops.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.brand} {l.model} (S/N: {l.serialNumber}) — {l.processor} / {l.ram} / {l.storage} — ₹{l.sellingPrice}
                  </option>
                ))}
              </select>
            </div>

            {selectedLaptop ? (
              <div style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "16px",
                marginTop: "12px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                      {selectedLaptop.brand} {selectedLaptop.model}
                    </h4>
                    <span style={{ 
                      fontFamily: "var(--font-mono)", 
                      fontSize: "12px", 
                      fontWeight: 600, 
                      color: "#334155",
                      backgroundColor: "#e2e8f0",
                      padding: "2px 6px",
                      borderRadius: "4px"
                    }}>
                      S/N: {selectedLaptop.serialNumber}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Selling Price</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#2563eb" }}>
                      {formatCurrency(selectedLaptop.sellingPrice)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", fontSize: "12.5px", color: "#475569" }}>
                  <div><strong>CPU:</strong> {selectedLaptop.processor}</div>
                  <div><strong>RAM:</strong> {selectedLaptop.ram}</div>
                  <div><strong>Storage:</strong> {selectedLaptop.storage}</div>
                  <div><strong>Condition:</strong> <StatusBadge status={selectedLaptop.condition} type="condition" /></div>
                  <div><strong>Warranty:</strong> {selectedLaptop.warranty || "30 Days"}</div>
                  <div><strong>Status:</strong> <StatusBadge status={selectedLaptop.status} /></div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                Select a laptop from the dropdown above to display technical specifications and billing price.
              </div>
            )}
          </div>

          {/* SECTION 5: WARRANTY DETAILS */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                  3
                </div>
                <div>
                  <h3 className="card-title">Warranty Coverage</h3>
                  <div className="card-subtitle">Hardware breakdown warranty policy applied to invoice</div>
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 30 Days Hardware Warranty / 90 Days Comprehensive"
                value={warrantyOverride}
                onChange={(e) => setWarrantyOverride(e.target.value)}
              />
            </div>
          </div>

        </div>

        {/* Right Column: Billing Calculation & Payment Settlement */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* SECTION 3: BILL CALCULATION */}
          <div className="card" style={{ borderTop: "4px solid #2563eb" }}>
            <div className="card-header" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Calculator size={18} color="#2563eb" />
                <h3 className="card-title">Bill Calculation</h3>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Selling Price (₹)</label>
              <input
                type="text"
                className="form-control"
                value={formatCurrency(sellingPrice)}
                disabled
                style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}
              />
              <small style={{ color: "#64748b", fontSize: "11px" }}>
                Price automatically fetched from MongoDB.
              </small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Discount Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  max={sellingPrice}
                  className="form-control"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  disabled={!selectedLaptop}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tax / GST (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="0"
                  value={tax}
                  onChange={(e) => handleTaxChange(e.target.value)}
                  disabled={!selectedLaptop}
                />
              </div>
            </div>

            <div style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "12px 16px",
              margin: "12px 0 16px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12.5px" }}>
                <span style={{ color: "#64748b" }}>Taxable Amount:</span>
                <span>{formatCurrency(taxableAmount)}</span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "6px",
                borderTop: "1px solid #e2e8f0",
                fontSize: "16px",
                fontWeight: 800,
                color: "#0f172a"
              }}>
                <span>Final Invoice Amount:</span>
                <span style={{ color: "#2563eb" }}>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* SECTION 4: PAYMENT */}
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", marginTop: "16px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <CreditCard size={16} />
                <span>Payment Settlement</span>
              </h4>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash in Hand</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS)</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Payment Status</label>
                  <select
                    className="form-control"
                    value={paymentStatus}
                    onChange={(e) => handlePaymentStatusChange(e.target.value)}
                  >
                    <option value="PAID">PAID (Full payment)</option>
                    <option value="PARTIAL">PARTIAL (Advance paid)</option>
                    <option value="PENDING">PENDING (Unpaid)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount Paid (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    className="form-control"
                    placeholder="0"
                    value={amountPaid}
                    onChange={(e) => handleAmountPaidChange(e.target.value)}
                    disabled={!selectedLaptop}
                  />
                </div>
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "6px",
                backgroundColor: balance > 0 ? "#fef2f2" : "#ecfdf5",
                border: `1px solid ${balance > 0 ? "#fecaca" : "#a7f3d0"}`,
                fontSize: "13px",
                fontWeight: 700,
                color: balance > 0 ? "#b91c1c" : "#047857"
              }}>
                <span>Remaining Balance Due:</span>
                <span>{formatCurrency(balance)}</span>
              </div>
            </div>

            {/* Submit Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                style={{ justifyContent: "center" }}
                onClick={handleOpenPreview}
                disabled={!selectedLaptop || submitting}
              >
                <Eye size={16} />
                <span>Preview Invoice</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ justifyContent: "center", backgroundColor: "#2563eb" }}
                onClick={handleGenerateBill}
                disabled={!selectedLaptop || submitting}
              >
                <ReceiptText size={18} />
                <span>{submitting ? "Processing & Generating PDF..." : "Generate Official Bill"}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        customerData={resolvedCustomerData}
        laptopData={selectedLaptop}
        billingData={{
          discount: numDiscount,
          tax: numTax,
          paymentMethod,
          paymentStatus,
          amountPaid: numAmountPaid,
          warranty: warrantyOverride
        }}
        onConfirm={handleGenerateBill}
        isGenerating={submitting}
      />

      {/* Invoice Success Modal with PDF Download */}
      <InvoiceSuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        invoice={createdInvoice}
        onReset={handleResetForm}
      />

      {/* Toast Notification */}
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
