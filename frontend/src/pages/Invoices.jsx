import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FileSpreadsheet, 
  Search, 
  Download, 
  Eye, 
  RefreshCw, 
  AlertCircle,
  ReceiptText,
  Calendar,
  IndianRupee,
  Send,
  Mail
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import Toast from "../components/Toast";
import { getInvoices, downloadInvoicePdf, sendInvoice } from "../api/invoiceApi";

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filter
  const [search, setSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [downloadingId, setDownloadingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getInvoices({
        search: search.trim() || undefined,
        paymentStatus: paymentStatusFilter !== "ALL" ? paymentStatusFilter : undefined
      });
      setInvoices(data);
    } catch (err) {
      setError(err.customMessage || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [paymentStatusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDownload = async (e, invoice) => {
    e.stopPropagation();
    setDownloadingId(invoice._id);
    try {
      await downloadInvoicePdf(invoice._id, invoice.invoiceNumber);
      showToast(`Downloaded Invoice ${invoice.invoiceNumber}`, "success");
    } catch (err) {
      showToast("Failed to download PDF invoice", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSendEmail = async (e, invoice) => {
    e.stopPropagation();
    const customer = invoice.customer || {};

    if (!customer.email || !customer.email.trim()) {
      showToast("Customer email address is required to send the invoice.", "error");
      return;
    }

    setSendingId(invoice._id);
    try {
      const res = await sendInvoice(invoice._id);
      showToast(`Invoice sent successfully to ${res.email || customer.email}`, "success");
      fetchInvoices();
    } catch (err) {
      showToast(err.customMessage || "Unable to send invoice. Please try again.", "error");
    } finally {
      setSendingId(null);
    }
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>
            Invoice Records & Billing History
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Search previous customer bills, monitor payments, and download certified A4 PDF invoices.
          </p>
        </div>

        <Link to="/create-bill" className="btn btn-primary">
          <ReceiptText size={16} />
          <span>+ Create New Bill</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "10px", flex: 1, minWidth: "280px" }}>
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by invoice #, customer name, phone, or laptop serial..."
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
              onClick={() => { setSearch(""); fetchInvoices(); }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab ${paymentStatusFilter === "ALL" ? "active" : ""}`}
            onClick={() => setPaymentStatusFilter("ALL")}
          >
            All Invoices
          </button>
          <button
            type="button"
            className={`filter-tab ${paymentStatusFilter === "PAID" ? "active" : ""}`}
            onClick={() => setPaymentStatusFilter("PAID")}
          >
            Paid
          </button>
          <button
            type="button"
            className={`filter-tab ${paymentStatusFilter === "PARTIAL" ? "active" : ""}`}
            onClick={() => setPaymentStatusFilter("PARTIAL")}
          >
            Partial
          </button>
          <button
            type="button"
            className={`filter-tab ${paymentStatusFilter === "PENDING" ? "active" : ""}`}
            onClick={() => setPaymentStatusFilter("PENDING")}
          >
            Pending
          </button>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="state-container">
          <div className="spinner"></div>
          <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>Loading invoice records...</p>
        </div>
      ) : error ? (
        <div className="state-container">
          <div className="state-icon" style={{ color: "#ef4444", backgroundColor: "#fef2f2" }}>
            <AlertCircle size={28} />
          </div>
          <h3 className="state-title">Unable to load invoices</h3>
          <p className="state-desc">{error}</p>
          <button type="button" className="btn btn-primary" onClick={fetchInvoices}>
            <RefreshCw size={15} />
            <span>Retry</span>
          </button>
        </div>
      ) : invoices.length === 0 ? (
        <div className="state-container card">
          <div className="state-icon">
            <FileSpreadsheet size={32} />
          </div>
          <h3 className="state-title">No Invoices Found</h3>
          <p className="state-desc">
            {search || paymentStatusFilter !== "ALL"
              ? "No billing records match your search criteria."
              : "No customer bills have been generated yet."}
          </p>
          {search || paymentStatusFilter !== "ALL" ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setSearch(""); setPaymentStatusFilter("ALL"); }}
            >
              Reset Filters
            </button>
          ) : (
            <Link to="/create-bill" className="btn btn-primary">
              <ReceiptText size={16} />
              <span>Create Your First Bill</span>
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
                <th>Laptop Details</th>
                <th>Total Amount</th>
                <th>Payment Status</th>
                <th>Balance</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const amount = inv.totalAmount || 0;
                const paid = inv.amountPaid || 0;
                const balance = Math.max(0, amount - paid);

                return (
                  <tr key={inv._id}>
                    <td>
                      <Link 
                        to={`/invoices/${inv._id}`} 
                        style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#2563eb", textDecoration: "none" }}
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#475569" }}>
                        <Calendar size={13} color="#94a3b8" />
                        <span>{formatDate(inv.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>
                        {inv.customer?.name || "Customer"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {inv.customer?.phone || ""}
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const items = (inv.items && inv.items.length > 0)
                          ? inv.items
                          : (inv.laptop ? [{ laptop: inv.laptop }] : []);
                        
                        if (items.length > 1) {
                          const names = items.map(it => `${it.laptop?.brand || ""} ${it.laptop?.model || ""}`.trim()).filter(Boolean).join(", ");
                          return (
                            <div>
                              <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "12.5px" }}>
                                {items.length} Products
                              </div>
                              <div style={{ fontSize: "11px", color: "#475569", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={names}>
                                {names}
                              </div>
                            </div>
                          );
                        }

                        const singleLaptop = items[0]?.laptop || inv.laptop;
                        return (
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {singleLaptop ? `${singleLaptop.brand} ${singleLaptop.model}` : "Laptop Record"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-mono)" }}>
                              S/N: {singleLaptop?.serialNumber || "N/A"}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px" }}>
                        {formatCurrency(inv.totalAmount)}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        Paid: {formatCurrency(inv.amountPaid)} ({inv.paymentMethod})
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={inv.paymentStatus} />
                    </td>
                    <td>
                      <span style={{ 
                        fontWeight: 700, 
                        fontSize: "12.5px",
                        color: balance > 0 ? "#dc2626" : "#16a34a" 
                      }}>
                        {formatCurrency(balance)}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="View Invoice Details"
                          onClick={() => navigate(`/invoices/${inv._id}`)}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Send Invoice to Customer Email"
                          onClick={(e) => handleSendEmail(e, inv)}
                          disabled={sendingId === inv._id}
                        >
                          <Send size={13} />
                          <span>{sendingId === inv._id ? "Sending..." : "Send"}</span>
                        </button>
                        
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Download PDF"
                          onClick={(e) => handleDownload(e, inv)}
                          disabled={downloadingId === inv._id}
                        >
                          <Download size={13} />
                          <span>{downloadingId === inv._id ? "..." : "PDF"}</span>
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
