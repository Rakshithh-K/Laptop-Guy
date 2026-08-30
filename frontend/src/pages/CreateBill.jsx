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
  Trash2,
  RefreshCw,
  AlertCircle,
  Hash
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import InvoiceSuccessModal from "../components/InvoiceSuccessModal";
import Toast from "../components/Toast";
import { getLaptops } from "../api/laptopApi";
import { getCustomers } from "../api/customerApi";
import { createInvoice } from "../api/invoiceApi";
import sigImg from "../assets/nawsig.jpeg";

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

  // Multiple Laptop Items: [{ laptopId: "", laptop: null }]
  const [items, setItems] = useState([
    { laptopId: "", laptop: null }
  ]);

  // Billing & Payment Calculation
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionId, setTransactionId] = useState("");
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

  // Selected laptop objects array
  const selectedLaptops = items.map(it => it.laptop).filter(Boolean);

  // Pricing calculations
  const subtotal = items.reduce((acc, it) => acc + (it.laptop ? Number(it.laptop.sellingPrice) || 0 : 0), 0);
  const numDiscount = Math.max(0, Number(discount) || 0);
  const taxableAmount = Math.max(0, subtotal - numDiscount);
  const numTax = Math.max(0, Number(tax) || 0);
  const totalAmount = taxableAmount + numTax;
  const numAmountPaid = Math.max(0, Number(amountPaid) || 0);
  const balance = Math.max(0, totalAmount - numAmountPaid);

  const isOnlinePayment = ["UPI", "CARD", "BANK_TRANSFER"].includes(paymentMethod);

  // Auto sync amount paid and warranty when items change
  useEffect(() => {
    if (selectedLaptops.length > 0) {
      if (!warrantyOverride) {
        setWarrantyOverride(selectedLaptops[0].warranty || "30 Days Hardware Warranty");
      }
      if (paymentStatus === "PAID") {
        setAmountPaid(totalAmount.toString());
      }
    } else {
      setAmountPaid("");
    }
  }, [subtotal, numDiscount, numTax]);

  // Handle adding an item row
  const handleAddItem = () => {
    setItems([...items, { laptopId: "", laptop: null }]);
  };

  // Handle removing an item row
  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      setItems([{ laptopId: "", laptop: null }]);
      return;
    }
    const newItems = items.filter((_, idx) => idx !== index);
    setItems(newItems);
  };

  // Handle laptop selection in a row
  const handleSelectLaptop = (index, laptopId) => {
    if (laptopId) {
      // Check for duplicate selection across other rows
      const isAlreadySelected = items.some((it, idx) => idx !== index && it.laptopId === laptopId);
      if (isAlreadySelected) {
        showToast("This laptop is already selected in another row.", "error");
        return;
      }
    }

    const laptop = availableLaptops.find((l) => l._id === laptopId) || null;
    const newItems = [...items];
    newItems[index] = { laptopId, laptop };
    setItems(newItems);

    if (laptop && !warrantyOverride) {
      setWarrantyOverride(laptop.warranty || "30 Days Hardware Warranty");
    }
  };

  // Sync amountPaid when discount changes
  const handleDiscountChange = (val) => {
    setDiscount(val);
    const d = Math.max(0, Number(val) || 0);
    const newTotal = Math.max(0, subtotal - d) + numTax;
    if (paymentStatus === "PAID") {
      setAmountPaid(newTotal.toString());
    }
  };

  // Sync amountPaid when tax changes
  const handleTaxChange = (val) => {
    setTax(val);
    const t = Math.max(0, Number(val) || 0);
    const newTotal = taxableAmount + t;
    if (paymentStatus === "PAID") {
      setAmountPaid(newTotal.toString());
    }
  };

  const handlePaymentMethodChange = (val) => {
    setPaymentMethod(val);
    if (val === "CASH") {
      setTransactionId("");
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
    const validItems = items.filter(it => it.laptopId && it.laptop);
    if (validItems.length === 0) {
      setFormError("Please select at least one available laptop for this bill.");
      return false;
    }

    // Duplicate check
    const laptopIds = validItems.map(it => it.laptopId);
    const uniqueIds = new Set(laptopIds);
    if (uniqueIds.size !== laptopIds.length) {
      setFormError("Duplicate laptops selected. Each laptop can only be added once.");
      return false;
    }

    // Price validation
    if (numDiscount > subtotal) {
      setFormError("Discount cannot exceed total subtotal.");
      return false;
    }

    if (numAmountPaid > totalAmount) {
      setFormError("Amount paid cannot exceed total invoice amount.");
      return false;
    }

    // Online Payment validation: Transaction ID / UTR is required
    if (isOnlinePayment && !transactionId.trim()) {
      setFormError("Transaction ID / UTR Number is required for online payments (UPI, Card, Bank Transfer).");
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
      const validItems = items.filter(it => it.laptopId && it.laptop);

      const payload = {
        items: validItems.map(it => ({
          laptopId: it.laptopId,
          sellingPrice: Number(it.laptop.sellingPrice)
        })),
        // Fallback for single item
        laptopId: validItems[0].laptopId,
        discount: numDiscount,
        tax: numTax,
        paymentMethod,
        transactionId: isOnlinePayment ? transactionId.trim() : "",
        paymentStatus,
        amountPaid: numAmountPaid,
        warranty: warrantyOverride || validItems[0].laptop.warranty || "30 Days Hardware Warranty"
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

      // Reload inventory so sold laptops disappear from available list
      loadData();
    } catch (err) {
      setFormError(err.customMessage || "Failed to generate invoice. Please try again.");
      showToast(err.customMessage || "Invoice creation failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setItems([{ laptopId: "", laptop: null }]);
    setSelectedCustomerId("");
    setCustomerMode("EXISTING");
    setNewCustomer({ name: "", phone: "", email: "", address: "", gstin: "" });
    setDiscount(0);
    setTax(0);
    setPaymentMethod("UPI");
    setTransactionId("");
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
            Select one or multiple laptops from inventory, assign customer details, and issue an official tax invoice.
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
          fontSize: "13px",
          fontWeight: 500
        }}>
          <AlertCircle size={18} />
          <span>{formError}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: "24px", alignItems: "start" }}>

        {/* Left Column: Customer & Invoice Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* SECTION 1: CUSTOMER SELECTION */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                  1
                </div>
                <div>
                  <h3 className="card-title">Customer Information</h3>
                  <div className="card-subtitle">Select existing or register a new customer profile</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className={`btn btn-sm ${customerMode === "EXISTING" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setCustomerMode("EXISTING")}
                >
                  Existing Customer
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${customerMode === "NEW" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setCustomerMode("NEW")}
                >
                  <Plus size={13} />
                  <span>New Customer</span>
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

          {/* SECTION 2: MULTIPLE PRODUCTS / LAPTOPS */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                  2
                </div>
                <div>
                  <h3 className="card-title">Invoice Items ({items.length} {items.length === 1 ? "Product" : "Products"})</h3>
                  <div className="card-subtitle">Select one or multiple laptops from available inventory</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="badge badge-available">
                  {availableLaptops.length} Units In Stock
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleAddItem}
                  style={{ backgroundColor: "#2563eb" }}
                >
                  <Plus size={13} />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {/* List of Item Selectors */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {items.map((item, index) => {
                const selectedIdsInOtherRows = items
                  .filter((_, idx) => idx !== index)
                  .map(it => it.laptopId)
                  .filter(Boolean);

                return (
                  <div
                    key={index}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "16px",
                      backgroundColor: item.laptop ? "#ffffff" : "#f8fafc"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>
                        Item {index + 1}
                      </span>

                      {items.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ color: "#ef4444", padding: "4px 8px", borderColor: "#fecaca" }}
                          onClick={() => handleRemoveItem(index)}
                          title="Remove this product"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: item.laptop ? "12px" : 0 }}>
                      <label className="form-label" style={{ fontSize: "12px" }}>
                        Select Available Laptop <span className="required">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={item.laptopId}
                        onChange={(e) => handleSelectLaptop(index, e.target.value)}
                      >
                        <option value="">-- Choose a Laptop Unit --</option>
                        {availableLaptops.map((l) => {
                          const isAlreadyChosen = selectedIdsInOtherRows.includes(l._id);
                          return (
                            <option key={l._id} value={l._id} disabled={isAlreadyChosen}>
                              {l.brand} {l.model} (S/N: {l.serialNumber}) — ₹{l.sellingPrice} {isAlreadyChosen ? "(Selected in another row)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {item.laptop && (
                      <div style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        marginTop: "8px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div>
                            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                              {item.laptop.brand} {item.laptop.model}
                            </h4>
                            <span style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              color: "#334155",
                              backgroundColor: "#e2e8f0",
                              padding: "2px 6px",
                              borderRadius: "4px"
                            }}>
                              S/N: {item.laptop.serialNumber}
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase" }}>Price</div>
                            <div style={{ fontSize: "16px", fontWeight: 800, color: "#2563eb" }}>
                              {formatCurrency(item.laptop.sellingPrice)}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", fontSize: "12px", color: "#475569" }}>
                          <div><strong>CPU:</strong> {item.laptop.processor}</div>
                          <div><strong>RAM:</strong> {item.laptop.ram}</div>
                          <div><strong>Storage:</strong> {item.laptop.storage}</div>
                          <div><strong>Condition:</strong> <StatusBadge status={item.laptop.condition} type="condition" /></div>
                          <div><strong>Warranty:</strong> {item.laptop.warranty || "30 Days"}</div>
                          <div><strong>Status:</strong> <StatusBadge status={item.laptop.status} /></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "16px", textAlign: "right" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddItem}
              >
                <Plus size={14} />
                <span>+ Add Another Laptop</span>
              </button>
            </div>
          </div>

          {/* SECTION 3: WARRANTY DETAILS */}
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

          {/* SECTION 4: BILL CALCULATION */}
          <div className="card" style={{ borderTop: "4px solid #2563eb" }}>
            <div className="card-header" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Calculator size={18} color="#2563eb" />
                <h3 className="card-title">Bill Calculation</h3>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Subtotal ({selectedLaptops.length} {selectedLaptops.length === 1 ? "Item" : "Items"}) (₹)</label>
              <input
                type="text"
                className="form-control"
                value={formatCurrency(subtotal)}
                disabled
                style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}
              />
              <small style={{ color: "#64748b", fontSize: "11px" }}>
                Sum of locked selling prices for all selected products.
              </small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Discount Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  className="form-control"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  disabled={selectedLaptops.length === 0}
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
                  disabled={selectedLaptops.length === 0}
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
                <span>Grand Total:</span>
                <span style={{ color: "#2563eb" }}>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* SECTION 5: PAYMENT SETTLEMENT */}
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", marginTop: "16px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <CreditCard size={16} />
                <span>Payment Settlement</span>
              </h4>

              <div className="form-group">
                <label className="form-label">Payment Method <span className="required">*</span></label>
                <select
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => handlePaymentMethodChange(e.target.value)}
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash in Hand</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS / RTGS)</option>
                </select>
              </div>

              {/* Transaction ID / UTR Number - Visible & Required for Online Payments */}
              {isOnlinePayment && (
                <div className="form-group" style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "8px" }}>
                  <label className="form-label" style={{ color: "#1e40af", fontWeight: 700 }}>
                    Transaction ID / UTR Number <span className="required">*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. UPI Ref / Bank UTR: 423589234892"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}
                      required
                    />
                  </div>
                  <small style={{ color: "#2563eb", fontSize: "11px", display: "block", marginTop: "4px" }}>
                    Required for online settlement audit & tax invoice PDF generation.
                  </small>
                </div>
              )}

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
                    disabled={selectedLaptops.length === 0}
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

            {/* Authorized Signature Card Preview */}
            <div style={{
              marginTop: "18px",
              padding: "12px 14px",
              backgroundColor: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Authorized E-Signature
                </div>
                <div style={{ fontSize: "11.5px", color: "#334155", fontWeight: 600 }}>
                  Laptop_Guy Laptops & Computers
                </div>
              </div>
              <img
                src={sigImg}
                alt="Signature"
                style={{ maxHeight: "36px", maxWidth: "100px", objectFit: "contain" }}
              />
            </div>

            {/* Submit Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                style={{ justifyContent: "center" }}
                onClick={handleOpenPreview}
                disabled={selectedLaptops.length === 0 || submitting}
              >
                <Eye size={16} />
                <span>Preview Invoice</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ justifyContent: "center", backgroundColor: "#2563eb" }}
                onClick={handleGenerateBill}
                disabled={selectedLaptops.length === 0 || submitting}
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
        items={items.filter(it => it.laptop)}
        billingData={{
          subtotal,
          discount: numDiscount,
          tax: numTax,
          totalAmount,
          paymentMethod,
          transactionId: isOnlinePayment ? transactionId.trim() : "",
          paymentStatus,
          amountPaid: numAmountPaid,
          balance,
          warranty: warrantyOverride
        }}
        onConfirm={handleGenerateBill}
        isGenerating={submitting}
      />

      {/* Invoice Success Modal with PDF Download & Send Email */}
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
