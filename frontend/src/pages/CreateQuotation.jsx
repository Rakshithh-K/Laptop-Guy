import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  User,
  Laptop,
  Calculator,
  Search,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Eye,
  EyeOff,
  Download,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import Toast from "../components/Toast";
import Modal from "../components/Modal";
import { getLaptops } from "../api/laptopApi";
import { getCustomers } from "../api/customerApi";
import { createQuotation, downloadQuotationPdf } from "../api/quotationApi";

export default function CreateQuotation() {
  const navigate = useNavigate();

  // Dependencies
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

  // Selected Quotation Items: array of { laptop: LaptopDoc, quotedPrice: number }
  const [selectedItems, setSelectedItems] = useState([]);
  const [laptopSearch, setLaptopSearch] = useState("");

  // Quotation terms
  const [validityDays, setValidityDays] = useState(7);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState(
    "This commercial quotation is valid for 7 days from the date of issue. Certified pre-owned laptops include verified hardware integrity, diagnostic testing, and stated hardware warranty."
  );

  // Admin visibility toggle for cost/margin
  const [showCostPrices, setShowCostPrices] = useState(true);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [createdQuotation, setCreatedQuotation] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [toast, setToast] = useState(null);
  const [formError, setFormError] = useState("");

  // Load inventory and customers
  const loadDependencies = async () => {
    setLoadingData(true);
    try {
      const [laptopsRes, customersRes] = await Promise.all([
        getLaptops({ status: "AVAILABLE" }),
        getCustomers()
      ]);
      setAvailableLaptops(laptopsRes);
      setCustomers(customersRes);
    } catch (err) {
      console.error("Failed to load quotation dependencies", err);
      showToast("Failed to load inventory or customers list", "error");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadDependencies();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Add laptop to quotation items
  const handleAddLaptop = (laptop) => {
    // Check if already in selected items
    const alreadySelected = selectedItems.some((it) => it.laptop._id === laptop._id);
    if (alreadySelected) {
      showToast(`${laptop.brand} ${laptop.model} is already added to this quotation.`, "error");
      return;
    }

    setSelectedItems([
      ...selectedItems,
      {
        laptop,
        quotedPrice: laptop.sellingPrice || 0
      }
    ]);
    setLaptopSearch("");
  };

  // Remove laptop from quotation
  const handleRemoveLaptop = (index) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  // Update quoted price for a specific item
  const handleQuotedPriceChange = (index, value) => {
    const num = Math.max(0, Number(value) || 0);
    const updated = [...selectedItems];
    updated[index].quotedPrice = num;
    setSelectedItems(updated);
  };

  // Calculations
  const totalCostPrice = selectedItems.reduce(
    (sum, it) => sum + (Number(it.laptop.purchasePrice) || 0),
    0
  );

  const totalStandardSellingPrice = selectedItems.reduce(
    (sum, it) => sum + (Number(it.laptop.sellingPrice) || 0),
    0
  );

  const subtotalQuoted = selectedItems.reduce(
    (sum, it) => sum + (Number(it.quotedPrice) || 0),
    0
  );

  const parsedDiscount = Math.max(0, Number(discount) || 0);
  const totalQuotedAmount = Math.max(0, subtotalQuoted - parsedDiscount);
  const totalProjectedProfit = totalQuotedAmount - totalCostPrice;
  const projectedMarginPct =
    totalCostPrice > 0 ? ((totalProjectedProfit / totalCostPrice) * 100).toFixed(1) : "0.0";

  // Filter available laptops not already chosen
  const chosenLaptopIds = new Set(selectedItems.map((it) => it.laptop._id));
  const filteredAvailableLaptops = availableLaptops
    .filter((l) => !chosenLaptopIds.has(l._id))
    .filter((l) => {
      if (!laptopSearch.trim()) return true;
      const term = laptopSearch.trim().toLowerCase();
      return (
        l.brand?.toLowerCase().includes(term) ||
        l.model?.toLowerCase().includes(term) ||
        l.serialNumber?.toLowerCase().includes(term) ||
        l.processor?.toLowerCase().includes(term)
      );
    });

  // Filter customers for existing mode
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const term = customerSearch.trim().toLowerCase();
    return (
      c.name?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  });

  const selectedCustomerObj = customers.find((c) => c._id === selectedCustomerId);

  // Form Submission
  const handleSubmitQuotation = async (e) => {
    e.preventDefault();
    setFormError("");

    // Validation
    if (customerMode === "EXISTING" && !selectedCustomerId) {
      setFormError("Please select an existing customer.");
      showToast("Please select a customer for the quotation.", "error");
      return;
    }

    if (customerMode === "NEW") {
      if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
        setFormError("Please provide customer name and phone number.");
        showToast("Please enter customer name and phone number.", "error");
        return;
      }
    }

    if (selectedItems.length === 0) {
      setFormError("Please select at least one laptop to quote.");
      showToast("Please select at least one laptop for this quotation.", "error");
      return;
    }

    if (parsedDiscount > subtotalQuoted) {
      setFormError("Discount cannot exceed total subtotal amount.");
      showToast("Discount exceeds quotation subtotal.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: customerMode === "EXISTING" ? selectedCustomerId : undefined,
        newCustomer: customerMode === "NEW" ? newCustomer : undefined,
        items: selectedItems.map((it) => ({
          laptopId: it.laptop._id,
          quotedPrice: it.quotedPrice
        })),
        discount: parsedDiscount,
        validityDays: Number(validityDays) || 7,
        notes: notes.trim()
      };

      const res = await createQuotation(payload);
      setCreatedQuotation(res);
      setSuccessModalOpen(true);
      showToast(`Quotation ${res.quotationNumber} generated successfully!`, "success");
    } catch (err) {
      console.error("Create quotation error:", err);
      setFormError(err.customMessage || "Failed to create quotation.");
      showToast(err.customMessage || "Failed to create quotation.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!createdQuotation) return;
    setDownloadingPdf(true);
    try {
      await downloadQuotationPdf(createdQuotation._id, createdQuotation.quotationNumber);
      showToast(`Downloaded Quotation ${createdQuotation.quotationNumber}.pdf`, "success");
    } catch (err) {
      showToast("Failed to download PDF quotation.", "error");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleResetForm = () => {
    setSelectedItems([]);
    setSelectedCustomerId("");
    setCustomerSearch("");
    setNewCustomer({ name: "", phone: "", email: "", address: "", gstin: "" });
    setDiscount(0);
    setValidityDays(7);
    setSuccessModalOpen(false);
    setCreatedQuotation(null);
    setFormError("");
    loadDependencies();
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Top Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>
              New Commercial Quotation
            </h2>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11.5px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "9999px",
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              border: "1px solid #bfdbfe"
            }}>
              <Sparkles size={12} />
              Quotation Generator
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Select inventory products, review private purchasing costs & standard prices, enter custom quoted amounts, and generate a client PDF.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCostPrices(!showCostPrices)}
            title={showCostPrices ? "Hide internal purchase cost & margins" : "Show internal purchase cost & margins"}
          >
            {showCostPrices ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showCostPrices ? "Hide Internal Costs" : "Show Internal Costs"}</span>
          </button>

          <Link to="/quotations" className="btn btn-secondary btn-sm">
            <span>View All Quotations</span>
          </Link>
        </div>
      </div>

      {formError && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 16px",
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          color: "#dc2626",
          marginBottom: "20px",
          fontSize: "13px"
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <form onSubmit={handleSubmitQuotation}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "24px",
          alignItems: "start"
        }}>
          {/* Left Column: Customer & Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* 1. Customer Selection Card */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="card-title">1. Prospective Customer / Client</h3>
                    <div className="card-subtitle">Select recipient for this quotation</div>
                  </div>
                </div>

                {/* Mode toggle */}
                <div className="filter-tabs" style={{ margin: 0 }}>
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
                  <div style={{ marginBottom: "12px" }}>
                    <div className="search-input-wrapper">
                      <Search size={15} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search existing customer by name or phone..."
                        className="form-control"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Customer Select dropdown */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <select
                      className="form-control"
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                      <option value="">-- Choose Customer ({filteredCustomers.length} available) --</option>
                      {filteredCustomers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} — {c.phone} {c.email ? `(${c.email})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCustomerObj && (
                    <div style={{
                      marginTop: "12px",
                      padding: "10px 14px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12.5px"
                    }}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{selectedCustomerObj.name}</div>
                      <div style={{ color: "#64748b" }}>Phone: {selectedCustomerObj.phone} &nbsp;|&nbsp; Email: {selectedCustomerObj.email || "N/A"}</div>
                      {selectedCustomerObj.address && (
                        <div style={{ color: "#64748b", marginTop: "2px" }}>Address: {selectedCustomerObj.address}</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Client Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Ramesh Kumar / Infosys Team"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 9876543210"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. client@company.com"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GSTIN (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 29AAAAA0000A1Z5"
                      value={newCustomer.gstin}
                      onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
                    <label className="form-label">Address</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Kuvempunagar, Mysore"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Select Laptops from Stock */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Laptop size={18} />
                  </div>
                  <div>
                    <h3 className="card-title">2. Select Inventory Items to Quote</h3>
                    <div className="card-subtitle">
                      Choose from {availableLaptops.length} available laptops in stock
                    </div>
                  </div>
                </div>
              </div>

              {/* Laptop Quick Search */}
              <div style={{ marginBottom: "16px" }}>
                <div className="search-input-wrapper">
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search stock by brand, model, serial #, or processor..."
                    className="form-control"
                    value={laptopSearch}
                    onChange={(e) => setLaptopSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Available Stock Selector List */}
              <div style={{
                maxHeight: "220px",
                overflowY: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px",
                backgroundColor: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginBottom: "20px"
              }}>
                {filteredAvailableLaptops.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "13px" }}>
                    {availableLaptops.length === 0
                      ? "No laptops currently AVAILABLE in inventory."
                      : "All matching laptops are already added to this quotation."}
                  </div>
                ) : (
                  filteredAvailableLaptops.map((l) => (
                    <div
                      key={l._id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                          {l.brand} {l.model}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          S/N: <span style={{ fontFamily: "var(--font-mono)" }}>{l.serialNumber}</span> &nbsp;|&nbsp;
                          {l.processor} &nbsp;|&nbsp; {l.ram} RAM &nbsp;|&nbsp; {l.storage}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                            {formatCurrency(l.sellingPrice)}
                          </div>
                          {showCostPrices && (
                            <div style={{ fontSize: "10.5px", color: "#b45309" }}>
                              Cost: {formatCurrency(l.purchasePrice)}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{
                            borderColor: "#2563eb",
                            color: "#2563eb",
                            backgroundColor: "#eff6ff",
                            padding: "4px 10px"
                          }}
                          onClick={() => handleAddLaptop(l)}
                        >
                          <Plus size={13} />
                          <span>Add to Quote</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Selected Quoted Items Table */}
              <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "16px" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px"
                }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>
                    Selected Items in Quotation ({selectedItems.length})
                  </div>
                  {showCostPrices && (
                    <span style={{
                      fontSize: "11px",
                      color: "#b45309",
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontWeight: 600
                    }}>
                      🔒 Cost & Margins visible to Admin Only
                    </span>
                  )}
                </div>

                {selectedItems.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "30px 20px",
                    border: "2px dashed #cbd5e1",
                    borderRadius: "8px",
                    color: "#64748b"
                  }}>
                    <Laptop size={28} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
                    <p style={{ fontWeight: 600, fontSize: "13.5px" }}>No items selected yet.</p>
                    <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                      Click "Add to Quote" from the list above to set custom quote amounts.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedItems.map((item, index) => {
                      const l = item.laptop;
                      const cost = Number(l.purchasePrice) || 0;
                      const quote = Number(item.quotedPrice) || 0;
                      const margin = quote - cost;
                      const marginPct = cost > 0 ? ((margin / cost) * 100).toFixed(1) : "0.0";
                      const isPositiveMargin = margin >= 0;

                      return (
                        <div
                          key={l._id}
                          style={{
                            padding: "12px 14px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            display: "grid",
                            gridTemplateColumns: "1fr auto auto auto",
                            gap: "16px",
                            alignItems: "center"
                          }}
                        >
                          {/* Item Details */}
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                              {l.brand} {l.model}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                              S/N: <span style={{ fontFamily: "var(--font-mono)" }}>{l.serialNumber}</span> &nbsp;|&nbsp;
                              {l.processor} &nbsp;|&nbsp; {l.ram} RAM &nbsp;|&nbsp; {l.storage}
                            </div>
                            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                              <span className="badge badge-available" style={{ fontSize: "10px" }}>
                                {l.condition}
                              </span>
                              <span style={{
                                fontSize: "10px",
                                padding: "2px 6px",
                                backgroundColor: "#f1f5f9",
                                borderRadius: "4px",
                                color: "#475569"
                              }}>
                                {l.warranty || "30 Days Warranty"}
                              </span>
                            </div>
                          </div>

                          {/* Reference Prices (Cost & Standard) */}
                          <div style={{ textAlign: "right", minWidth: "110px" }}>
                            {showCostPrices && (
                              <div style={{ fontSize: "11.5px", color: "#b45309", marginBottom: "2px" }}>
                                <span style={{ color: "#92400e", fontWeight: 600 }}>Cost: </span>
                                <strong>{formatCurrency(cost)}</strong>
                              </div>
                            )}
                            <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                              List: {formatCurrency(l.sellingPrice)}
                            </div>
                          </div>

                          {/* Quoted Price Input & Margin */}
                          <div style={{ width: "160px" }}>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", display: "block", marginBottom: "3px" }}>
                              Quote Amount (₹) *
                            </label>
                            <input
                              type="number"
                              className="form-control"
                              style={{
                                fontWeight: 800,
                                fontSize: "14px",
                                color: "#0f172a",
                                borderColor: "#3b82f6"
                              }}
                              value={item.quotedPrice}
                              onChange={(e) => handleQuotedPriceChange(index, e.target.value)}
                              min="0"
                              required
                            />
                            {showCostPrices && (
                              <div style={{
                                marginTop: "3px",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: isPositiveMargin ? "#059669" : "#dc2626"
                              }}>
                                Margin: {isPositiveMargin ? "+" : ""}{formatCurrency(margin)} ({marginPct}%)
                              </div>
                            )}
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: "#dc2626", borderColor: "#fecaca", padding: "6px 8px" }}
                            title="Remove from quotation"
                            onClick={() => handleRemoveLaptop(index)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Quotation Terms & Notes */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: "14px" }}>
                <h3 className="card-title">3. Validity & Custom Terms</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Quotation Validity</label>
                  <select
                    className="form-control"
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                  >
                    <option value={7}>7 Days (Standard)</option>
                    <option value={15}>15 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Optional Overall Discount (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Special Notes / Included Accessories</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Price includes original charger, 30 days testing warranty, and GST bill."
                />
              </div>
            </div>
          </div>

          {/* Right Column: Financial Summary Sidebar */}
          <div style={{ position: "sticky", top: "20px" }}>
            <div className="card" style={{ boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
              <div className="card-header" style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calculator size={18} color="#2563eb" />
                  <h3 className="card-title">Quote Summary</h3>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Selected Laptops:</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>
                    {selectedItems.length} {selectedItems.length === 1 ? "unit" : "units"}
                  </span>
                </div>

                {showCostPrices && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#b45309" }}>Total Cost Price:</span>
                    <span style={{ fontWeight: 700, color: "#b45309" }}>
                      {formatCurrency(totalCostPrice)}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Standard Listed Value:</span>
                  <span style={{ fontWeight: 600, color: "#475569" }}>
                    {formatCurrency(totalStandardSellingPrice)}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Subtotal Quoted:</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    {formatCurrency(subtotalQuoted)}
                  </span>
                </div>

                {parsedDiscount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                    <span>Quotation Discount:</span>
                    <span style={{ fontWeight: 700 }}>-{formatCurrency(parsedDiscount)}</span>
                  </div>
                )}

                <div style={{
                  borderTop: "2px solid #0f172a",
                  paddingTop: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline"
                }}>
                  <span style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>
                    Total Quoted:
                  </span>
                  <span style={{ fontWeight: 900, fontSize: "20px", color: "#2563eb" }}>
                    {formatCurrency(totalQuotedAmount)}
                  </span>
                </div>

                {showCostPrices && (
                  <div style={{
                    padding: "10px 12px",
                    backgroundColor: totalProjectedProfit >= 0 ? "#ecfdf5" : "#fef2f2",
                    border: `1px solid ${totalProjectedProfit >= 0 ? "#a7f3d0" : "#fecaca"}`,
                    borderRadius: "6px",
                    marginTop: "4px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: totalProjectedProfit >= 0 ? "#065f46" : "#991b1b"
                      }}>
                        Projected Profit:
                      </span>
                      <span style={{
                        fontWeight: 800,
                        fontSize: "13.5px",
                        color: totalProjectedProfit >= 0 ? "#059669" : "#dc2626"
                      }}>
                        {totalProjectedProfit >= 0 ? "+" : ""}{formatCurrency(totalProjectedProfit)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: "10.5px",
                      color: totalProjectedProfit >= 0 ? "#047857" : "#b91c1c",
                      marginTop: "2px"
                    }}>
                      Markup Margin: <strong>{projectedMarginPct}%</strong> over purchase cost
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: "20px" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "12px" }}
                  disabled={submitting || selectedItems.length === 0}
                >
                  <Sparkles size={16} />
                  <span>{submitting ? "Generating Quotation..." : "Generate Commercial Quote"}</span>
                </button>
              </div>

              <div style={{
                marginTop: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                color: "#64748b"
              }}>
                <ShieldCheck size={14} color="#10b981" />
                <span>Does not mark items as sold. Stock remains Available.</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Success Confirmation Modal */}
      <Modal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="Quotation Generated Successfully"
        size="md"
      >
        {createdQuotation && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center" }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto"
            }}>
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>
                Commercial Quotation Created
              </h3>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                fontSize: "15px",
                color: "#2563eb"
              }}>
                {createdQuotation.quotationNumber}
              </div>
            </div>

            <div style={{
              padding: "12px 16px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "13px",
              textAlign: "left"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Customer:</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{createdQuotation.customer?.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Total Quoted Units:</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{createdQuotation.items?.length} Laptops</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Total Quoted Amount:</span>
                <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px" }}>
                  {formatCurrency(createdQuotation.totalQuotedAmount)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Validity:</span>
                <span style={{ fontWeight: 600, color: "#2563eb" }}>
                  Valid for {createdQuotation.validityDays} Days
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                <Download size={15} />
                <span>{downloadingPdf ? "Generating PDF..." : "Download Certified Quotation PDF"}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => navigate(`/quotations/${createdQuotation._id}`)}
              >
                <Eye size={15} />
                <span>View Full Quotation Sheet</span>
              </button>

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => navigate("/quotations")}
                >
                  Go to Quotations Tab
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={handleResetForm}
                >
                  Create Another Quote
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

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
