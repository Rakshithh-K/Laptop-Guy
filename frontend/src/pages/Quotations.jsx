import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
  Calendar,
  IndianRupee,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles
} from "lucide-react";
import Toast from "../components/Toast";
import Modal from "../components/Modal";
import { getQuotations, downloadQuotationPdf, deleteQuotation } from "../api/quotationApi";

export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [downloadingId, setDownloadingId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchQuotations = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getQuotations({
        search: search.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined
      });
      setQuotations(data);
    } catch (err) {
      setError(err.customMessage || "Failed to load quotations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuotations();
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDownload = async (e, quotation) => {
    e.stopPropagation();
    setDownloadingId(quotation._id);
    try {
      await downloadQuotationPdf(quotation._id, quotation.quotationNumber);
      showToast(`Downloaded Quotation ${quotation.quotationNumber}`, "success");
    } catch (err) {
      showToast("Failed to download PDF quotation", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenDelete = (e, quotation) => {
    e.stopPropagation();
    setQuotationToDelete(quotation);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!quotationToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteQuotation(quotationToDelete._id);
      showToast(res.message || `Quotation ${quotationToDelete.quotationNumber} removed.`, "success");
      setDeleteModalOpen(false);
      setQuotationToDelete(null);
      fetchQuotations();
    } catch (err) {
      showToast(err.customMessage || "Failed to delete quotation.", "error");
    } finally {
      setDeleting(false);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 8px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 700,
            backgroundColor: "#ecfdf5",
            color: "#059669",
            border: "1px solid #a7f3d0"
          }}>
            <CheckCircle2 size={12} /> Accepted
          </span>
        );
      case "DECLINED":
        return (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 8px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 700,
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            border: "1px solid #fecaca"
          }}>
            <XCircle size={12} /> Declined
          </span>
        );
      case "EXPIRED":
        return (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 8px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 700,
            backgroundColor: "#f1f5f9",
            color: "#64748b",
            border: "1px solid #cbd5e1"
          }}>
            <Clock size={12} /> Expired
          </span>
        );
      default:
        return (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 8px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 700,
            backgroundColor: "#eff6ff",
            color: "#2563eb",
            border: "1px solid #bfdbfe"
          }}>
            <Clock size={12} /> Pending Quote
          </span>
        );
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>
              Commercial Quotations & Estimates
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
              Pre-Sales
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Create custom price quotes with private cost analysis, print or download PDF estimates, and track client offers.
          </p>
        </div>

        <Link to="/create-quotation" className="btn btn-primary">
          <Plus size={16} />
          <span>+ Create New Quotation</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "10px", flex: 1, minWidth: "280px" }}>
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by quotation #, customer name, phone, or laptop model..."
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
              onClick={() => { setSearch(""); fetchQuotations(); }}
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
            All Quotes
          </button>
          <button
            type="button"
            className={`filter-tab ${statusFilter === "PENDING" ? "active" : ""}`}
            onClick={() => setStatusFilter("PENDING")}
          >
            Pending
          </button>
          <button
            type="button"
            className={`filter-tab ${statusFilter === "ACCEPTED" ? "active" : ""}`}
            onClick={() => setStatusFilter("ACCEPTED")}
          >
            Accepted
          </button>
          <button
            type="button"
            className={`filter-tab ${statusFilter === "DECLINED" ? "active" : ""}`}
            onClick={() => setStatusFilter("DECLINED")}
          >
            Declined
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="state-container">
          <div className="spinner"></div>
          <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>Loading quotation records...</p>
        </div>
      ) : error ? (
        <div className="state-container">
          <div className="state-icon" style={{ color: "#ef4444", backgroundColor: "#fef2f2" }}>
            <AlertCircle size={28} />
          </div>
          <h3 className="state-title">Unable to load quotations</h3>
          <p className="state-desc">{error}</p>
          <button type="button" className="btn btn-primary" onClick={fetchQuotations}>
            <RefreshCw size={15} />
            <span>Retry</span>
          </button>
        </div>
      ) : quotations.length === 0 ? (
        <div className="state-container card">
          <div className="state-icon">
            <FileText size={32} />
          </div>
          <h3 className="state-title">No Quotations Found</h3>
          <p className="state-desc">
            {search || statusFilter !== "ALL"
              ? "No quotation records match your search or filter criteria."
              : "No commercial quotations have been generated yet. Create one with custom pricing."}
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
            <Link to="/create-quotation" className="btn btn-primary">
              <Plus size={16} />
              <span>Create Your First Quotation</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Quotation Number</th>
                <th>Issue Date</th>
                <th>Customer</th>
                <th>Quoted Laptops</th>
                <th>Quoted Amount</th>
                <th>Validity</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => {
                const items = q.items || [];
                const isExpired = q.validUntil && new Date(q.validUntil) < new Date();

                return (
                  <tr key={q._id}>
                    <td>
                      <Link
                        to={`/quotations/${q._id}`}
                        style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#2563eb", textDecoration: "none" }}
                      >
                        {q.quotationNumber}
                      </Link>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#475569" }}>
                        <Calendar size={13} color="#94a3b8" />
                        <span>{formatDate(q.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>
                        {q.customer?.name || "Customer"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {q.customer?.phone || ""}
                      </div>
                    </td>
                    <td>
                      {items.length > 1 ? (
                        <div>
                          <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "12.5px" }}>
                            {items.length} Laptops Quoted
                          </div>
                          <div style={{ fontSize: "11px", color: "#475569", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {items.map(it => `${it.brand} ${it.model}`).join(", ")}
                          </div>
                        </div>
                      ) : items.length === 1 ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {items[0].brand} {items[0].model}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-mono)" }}>
                            S/N: {items[0].serialNumber || "N/A"}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "12px" }}>No items</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px" }}>
                        {formatCurrency(q.totalQuotedAmount)}
                      </div>
                      {q.discount > 0 && (
                        <div style={{ fontSize: "11px", color: "#16a34a" }}>
                          Discount: {formatCurrency(q.discount)}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: "12px", color: isExpired ? "#dc2626" : "#475569", fontWeight: isExpired ? 700 : 500 }}>
                        {q.validityDays} Days
                      </div>
                      <div style={{ fontSize: "11px", color: isExpired ? "#ef4444" : "#64748b" }}>
                        Until {formatDate(q.validUntil)}
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(isExpired && q.status === "PENDING" ? "EXPIRED" : q.status)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="View Quotation Details"
                          onClick={() => navigate(`/quotations/${q._id}`)}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Download Certified PDF Quotation"
                          onClick={(e) => handleDownload(e, q)}
                          disabled={downloadingId === q._id}
                        >
                          <Download size={13} />
                          <span>{downloadingId === q._id ? "..." : "PDF"}</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Delete Quotation"
                          style={{ color: "#dc2626", borderColor: "#fecaca" }}
                          onClick={(e) => handleOpenDelete(e, q)}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
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

      {/* Delete Quotation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteModalOpen(false);
            setQuotationToDelete(null);
          }
        }}
        title="Delete Quotation Record"
        size="md"
      >
        {quotationToDelete && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
              display: "flex",
              gap: "12px",
              padding: "12px 14px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#991b1b"
            }}>
              <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: "2px", color: "#dc2626" }} />
              <div style={{ fontSize: "13px", lineHeight: "1.5" }}>
                <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                  Delete Quotation #{quotationToDelete.quotationNumber}?
                </div>
                <div>
                  Are you sure you want to remove this commercial quotation for <strong>{quotationToDelete.customer?.name}</strong>?
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  Note: Quotations do not impact your inventory stock or financial ledger.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setQuotationToDelete(null);
                }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  borderColor: "#dc2626"
                }}
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                <Trash2 size={15} />
                <span>{deleting ? "Deleting..." : "Delete Quotation"}</span>
              </button>
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
