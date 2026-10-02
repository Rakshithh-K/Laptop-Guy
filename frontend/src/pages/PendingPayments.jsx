import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard,
  Search,
  Send,
  IndianRupee,
  Calendar,
  AlertCircle,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  Mail,
  AlertTriangle,
  ReceiptText,
  DollarSign,
  ArrowRight,
  TrendingDown,
  Check
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Toast from "../components/Toast";
import Modal from "../components/Modal";
import { getInvoices, sendPaymentReminder, recordPayment } from "../api/invoiceApi";

export default function PendingPayments() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PARTIAL | PENDING
  const [sendingReminderId, setSendingReminderId] = useState(null);

  // Record Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionId, setTransactionId] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [toast, setToast] = useState(null);

  const fetchPendingInvoices = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getInvoices({
        paymentStatus: statusFilter === "ALL" ? "PENDING_ALL" : statusFilter,
        search: search.trim() || undefined
      });
      // Further safeguard: only include invoices with actual balance > 0
      const pendingData = data.filter((inv) => {
        const bal = (inv.totalAmount || 0) - (inv.amountPaid || 0);
        return bal > 0;
      });
      setInvoices(pendingData);
    } catch (err) {
      setError(err.customMessage || "Failed to load pending payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingInvoices();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPendingInvoices();
  };

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

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // Dispatch payment reminder email
  const handleSendReminder = async (invoice) => {
    const customer = invoice.customer || {};
    if (!customer.email || !customer.email.trim()) {
      showToast("Cannot send reminder: Customer has no registered email.", "error");
      return;
    }

    setSendingReminderId(invoice._id);
    try {
      const res = await sendPaymentReminder(invoice._id);
      showToast(res.message || `Payment reminder sent to ${customer.email}`, "success");
      fetchPendingInvoices();
    } catch (err) {
      showToast(err.customMessage || err.message || "Failed to send payment reminder.", "error");
    } finally {
      setSendingReminderId(null);
    }
  };

  // Open Payment settlement modal
  const handleOpenRecordPayment = (invoice) => {
    const balance = Math.max(0, (invoice.totalAmount || 0) - (invoice.amountPaid || 0));
    setSelectedInvoice(invoice);
    setPaymentAmount(balance);
    setPaymentMethod("UPI");
    setTransactionId("");
    setPaymentModalOpen(true);
  };

  // Submit recorded payment
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amount = Number(paymentAmount);
    const balance = Math.max(0, (selectedInvoice.totalAmount || 0) - (selectedInvoice.amountPaid || 0));

    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid positive payment amount.", "error");
      return;
    }

    if (amount > balance) {
      showToast(`Payment amount cannot exceed remaining balance of ${formatCurrency(balance)}.`, "error");
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await recordPayment(selectedInvoice._id, {
        paymentAmount: amount,
        paymentMethod,
        transactionId: transactionId.trim()
      });
      showToast(res.message || "Payment recorded successfully!", "success");
      setPaymentModalOpen(false);
      setSelectedInvoice(null);
      fetchPendingInvoices();
    } catch (err) {
      showToast(err.customMessage || err.message || "Failed to record payment.", "error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Aggregate metrics
  const totalReceivables = invoices.reduce((sum, inv) => {
    const bal = Math.max(0, (inv.totalAmount || 0) - (inv.amountPaid || 0));
    return sum + bal;
  }, 0);

  const totalBilledValue = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const totalPaidValue = invoices.reduce((sum, inv) => sum + (Number(inv.amountPaid) || 0), 0);
  const partialInvoicesCount = invoices.filter((inv) => inv.paymentStatus === "PARTIAL").length;
  const unpaidInvoicesCount = invoices.filter((inv) => inv.paymentStatus === "PENDING").length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>
              Pending Payments & Receivables
            </h2>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11.5px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "9999px",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca"
            }}>
              <Clock size={12} />
              Outstanding Collections
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Track unpaid customer invoices, monitor outstanding balances, and send automated email payment reminders.
          </p>
        </div>

        <button type="button" className="btn btn-secondary btn-sm" onClick={fetchPendingInvoices} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #dc2626" }}>
          <div style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>
            Total Unpaid Balance
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#dc2626" }}>
            {formatCurrency(totalReceivables)}
          </div>
          <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "4px" }}>
            Across {invoices.length} pending customer bills
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>
            Partially Settled
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#d97706" }}>
            {partialInvoicesCount} <span style={{ fontSize: "14px", fontWeight: 600, color: "#64748b" }}>Invoices</span>
          </div>
          <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "4px" }}>
            Customers made partial payments
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #64748b" }}>
          <div style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>
            Completely Unpaid
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a" }}>
            {unpaidInvoicesCount} <span style={{ fontSize: "14px", fontWeight: 600, color: "#64748b" }}>Invoices</span>
          </div>
          <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "4px" }}>
            Zero payment recorded yet
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>
            Collected on These Bills
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#059669" }}>
            {formatCurrency(totalPaidValue)}
          </div>
          <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "4px" }}>
            Out of {formatCurrency(totalBilledValue)} total
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "10px", flex: 1, minWidth: "280px" }}>
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by invoice #, customer name, phone, or laptop model..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
          {search && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(""); fetchPendingInvoices(); }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab ${statusFilter === "ALL" ? "active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            All Pending ({invoices.length})
          </button>
          <button
            type="button"
            className={`filter-tab ${statusFilter === "PARTIAL" ? "active" : ""}`}
            onClick={() => setStatusFilter("PARTIAL")}
          >
            Partial Only
          </button>
          <button
            type="button"
            className={`filter-tab ${statusFilter === "PENDING" ? "active" : ""}`}
            onClick={() => setStatusFilter("PENDING")}
          >
            Fully Unpaid
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="state-container">
          <div className="spinner"></div>
          <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>
            Analyzing pending invoice balances...
          </p>
        </div>
      ) : error ? (
        <div className="state-container">
          <div className="state-icon" style={{ color: "#ef4444", backgroundColor: "#fef2f2" }}>
            <AlertCircle size={28} />
          </div>
          <h3 className="state-title">Unable to load pending payments</h3>
          <p className="state-desc">{error}</p>
          <button type="button" className="btn btn-primary" onClick={fetchPendingInvoices}>
            <RefreshCw size={15} />
            <span>Retry</span>
          </button>
        </div>
      ) : invoices.length === 0 ? (
        <div className="state-container card">
          <div className="state-icon" style={{ backgroundColor: "#ecfdf5", color: "#10b981" }}>
            <CheckCircle2 size={36} />
          </div>
          <h3 className="state-title">All Customer Bills Are Settled!</h3>
          <p className="state-desc">
            {search || statusFilter !== "ALL"
              ? "No pending invoices match your search or filter criteria."
              : "Great job! There are currently zero outstanding customer balances."}
          </p>
          {search || statusFilter !== "ALL" ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setSearch(""); setStatusFilter("ALL"); }}
            >
              Reset Filters
            </button>
          ) : (
            <Link to="/invoices" className="btn btn-primary">
              <ReceiptText size={16} />
              <span>View All Invoices</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Billed Product(s)</th>
                <th>Total Bill</th>
                <th>Amount Paid</th>
                <th>Balance Due</th>
                <th>Reminder History</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const total = inv.totalAmount || 0;
                const paid = inv.amountPaid || 0;
                const balance = Math.max(0, total - paid);
                const customer = inv.customer || {};
                const hasEmail = Boolean(customer.email && customer.email.trim());

                const items = inv.items && inv.items.length > 0
                  ? inv.items
                  : (inv.laptop ? [{ laptop: inv.laptop }] : []);

                return (
                  <tr key={inv._id}>
                    <td>
                      <Link
                        to={`/invoices/${inv._id}`}
                        style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#2563eb", textDecoration: "none" }}
                      >
                        {inv.invoiceNumber}
                      </Link>
                      <div style={{ marginTop: "2px" }}>
                        <StatusBadge status={inv.paymentStatus} />
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#475569" }}>
                        <Calendar size={13} color="#94a3b8" />
                        <span>{formatDate(inv.createdAt)}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>
                        {customer.name || "Customer"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {customer.phone || "No Phone"}
                      </div>
                      {customer.email ? (
                        <div style={{ fontSize: "11px", color: "#2563eb" }}>
                          {customer.email}
                        </div>
                      ) : (
                        <div style={{ fontSize: "10.5px", color: "#dc2626", fontWeight: 600 }}>
                          No email address
                        </div>
                      )}
                    </td>

                    <td>
                      {items.length > 1 ? (
                        <div>
                          <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "12.5px" }}>
                            {items.length} Products
                          </div>
                          <div style={{ fontSize: "11px", color: "#475569", maxWidth: "180px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {items.map(it => `${it.laptop?.brand || ""} ${it.laptop?.model || ""}`).join(", ")}
                          </div>
                        </div>
                      ) : items.length === 1 ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {items[0].laptop?.brand} {items[0].laptop?.model}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-mono)" }}>
                            S/N: {items[0].laptop?.serialNumber || "N/A"}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "12px" }}>Item Record</span>
                      )}
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                        {formatCurrency(total)}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: "#059669", fontSize: "13px" }}>
                        {formatCurrency(paid)}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                        Via {inv.paymentMethod || "CASH"}
                      </div>
                    </td>

                    <td>
                      <div style={{
                        fontSize: "14px",
                        fontWeight: 900,
                        color: "#dc2626",
                        backgroundColor: "#fef2f2",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        display: "inline-block",
                        border: "1px solid #fecaca"
                      }}>
                        {formatCurrency(balance)}
                      </div>
                    </td>

                    <td>
                      {inv.reminderSentAt ? (
                        <div>
                          <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#059669" }}>
                            Sent on {formatDate(inv.reminderSentAt)}
                          </div>
                          <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                            {inv.reminderCount || 1} reminder{(inv.reminderCount || 1) > 1 ? "s" : ""} dispatched
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                          No reminders sent yet
                        </div>
                      )}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        {/* Send Payment Reminder Button */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title={hasEmail ? "Email Payment Reminder to Customer" : "Customer has no email address"}
                          style={{
                            borderColor: hasEmail ? "#3b82f6" : "#cbd5e1",
                            color: hasEmail ? "#1d4ed8" : "#94a3b8",
                            backgroundColor: hasEmail ? "#eff6ff" : "#f8fafc"
                          }}
                          onClick={() => handleSendReminder(inv)}
                          disabled={sendingReminderId === inv._id || !hasEmail}
                        >
                          <Mail size={13} />
                          <span>{sendingReminderId === inv._id ? "Sending..." : "Send Reminder"}</span>
                        </button>

                        {/* Record Payment Button */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ borderColor: "#10b981", color: "#059669", backgroundColor: "#ecfdf5" }}
                          title="Record Payment Settlement"
                          onClick={() => handleOpenRecordPayment(inv)}
                        >
                          <IndianRupee size={13} />
                          <span>Settle</span>
                        </button>

                        {/* View Invoice */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="View Invoice Sheet"
                          onClick={() => navigate(`/invoices/${inv._id}`)}
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Settlement Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => {
          if (!submittingPayment) {
            setPaymentModalOpen(false);
            setSelectedInvoice(null);
          }
        }}
        title="Record Payment Settlement"
        size="md"
      >
        {selectedInvoice && (
          <form onSubmit={handleSubmitPayment}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Summary Card */}
              <div style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "14px 16px",
                fontSize: "13px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#64748b" }}>Invoice Number:</span>
                  <span style={{ fontWeight: 700, color: "#0f172a", fontFamily: "var(--font-mono)" }}>
                    {selectedInvoice.invoiceNumber}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#64748b" }}>Customer:</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    {selectedInvoice.customer?.name} ({selectedInvoice.customer?.phone})
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#64748b" }}>Total Bill Amount:</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>
                    {formatCurrency(selectedInvoice.totalAmount)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#64748b" }}>Already Paid:</span>
                  <span style={{ fontWeight: 600, color: "#059669" }}>
                    {formatCurrency(selectedInvoice.amountPaid)}
                  </span>
                </div>
                <div style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#dc2626",
                  fontWeight: 800
                }}>
                  <span>Remaining Balance Due:</span>
                  <span style={{ fontSize: "15px" }}>
                    {formatCurrency((selectedInvoice.totalAmount || 0) - (selectedInvoice.amountPaid || 0))}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Payment Amount Received (₹) *</label>
                <input
                  type="number"
                  className="form-control"
                  style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a" }}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="1"
                  max={(selectedInvoice.totalAmount || 0) - (selectedInvoice.amountPaid || 0)}
                  required
                />
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  Default is the remaining full balance. You can change this if the customer made a partial payment.
                </div>
              </div>

              {/* Payment Method */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Payment Mode *</label>
                <select
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS)</option>
                </select>
              </div>

              {/* Transaction ID */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Transaction Reference / UTR Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. UPI Ref / Cheque No / Bank Ref"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPaymentModalOpen(false);
                    setSelectedInvoice(null);
                  }}
                  disabled={submittingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: "#059669", borderColor: "#059669" }}
                  disabled={submittingPayment}
                >
                  <Check size={16} />
                  <span>{submittingPayment ? "Recording Payment..." : "Confirm & Settle Payment"}</span>
                </button>
              </div>
            </div>
          </form>
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
