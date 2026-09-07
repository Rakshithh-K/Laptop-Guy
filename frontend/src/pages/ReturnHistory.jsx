import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  RotateCcw,
  Search,
  Calendar,
  IndianRupee,
  ShoppingBag,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Filter,
  Eye,
  EyeOff
} from "lucide-react";
import StatCard from "../components/StatCard";
import Toast from "../components/Toast";
import { getReturns } from "../api/returnApi";

export default function ReturnHistory() {
  const navigate = useNavigate();
  const [returnsData, setReturnsData] = useState({ summary: {}, returns: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL"); // "ALL" | "TODAY" | "THIS_MONTH" | "CUSTOM"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAmounts, setShowAmounts] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchReturnHistory = async () => {
    setLoading(true);
    setError("");
    try {
      let params = {};
      if (search.trim()) {
        params.search = search.trim();
      }

      if (dateFilter === "TODAY") {
        const today = new Date().toISOString().slice(0, 10);
        params.startDate = today;
        params.endDate = today;
      } else if (dateFilter === "THIS_MONTH") {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
        params.startDate = firstDay;
        params.endDate = lastDay;
      } else if (dateFilter === "CUSTOM") {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const res = await getReturns(params);
      setReturnsData(res || { summary: {}, returns: [] });
    } catch (err) {
      setError(err.customMessage || "Failed to load product returns history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnHistory();
  }, [dateFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReturnHistory();
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

  const displayAmount = (val) => {
    if (!showAmounts) return "₹ ••••••";
    return formatCurrency(val);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const summary = returnsData?.summary || {};
  const returns = returnsData?.returns || [];

  return (
    <div>
      {/* Action Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate("/dashboard")}
            title="Back to Dashboard"
            style={{ padding: "8px 12px" }}
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
              Product Return History
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              Comprehensive record of all customer returns, refunded values, and restored stock.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAmounts(!showAmounts)}
            title={showAmounts ? "Hide refund figures" : "Show refund figures"}
          >
            {showAmounts ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{showAmounts ? "Hide Amounts" : "Show Amounts"}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              fetchReturnHistory();
              showToast("Return records refreshed", "success");
            }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>

          <Link to="/invoices" className="btn btn-primary btn-sm">
            <FileSpreadsheet size={15} />
            <span>View Invoices</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stat-card-grid" style={{ marginBottom: "24px" }}>
        <StatCard
          title="Total Refunds Issued"
          value={displayAmount(summary.totalRefundedAmount || 0)}
          sub="Cumulative customer refunds"
          icon={IndianRupee}
          iconBg="#fef2f2"
          iconColor="#dc2626"
        />

        <StatCard
          title="Total Units Returned"
          value={summary.totalReturnedUnits || 0}
          sub={`${summary.totalReturnedUnits === 1 ? "Laptop" : "Laptops"} restored to stock`}
          icon={ShoppingBag}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />

        <StatCard
          title="Return Transactions"
          value={summary.totalReturnsCount || 0}
          sub="Processed return events"
          icon={RotateCcw}
          iconBg="#fffbeb"
          iconColor="#d97706"
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: "20px", padding: "16px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", flex: "1 1 280px" }}>
            <div style={{ position: "relative", width: "100%" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: "36px" }}
                placeholder="Search by invoice #, serial no, brand, model, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
          </form>

          {/* Date Filter Tabs */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className={`btn btn-sm ${dateFilter === "ALL" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setDateFilter("ALL")}
            >
              All Time
            </button>
            <button
              type="button"
              className={`btn btn-sm ${dateFilter === "TODAY" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setDateFilter("TODAY")}
            >
              Today
            </button>
            <button
              type="button"
              className={`btn btn-sm ${dateFilter === "THIS_MONTH" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setDateFilter("THIS_MONTH")}
            >
              This Month
            </button>
            <button
              type="button"
              className={`btn btn-sm ${dateFilter === "CUSTOM" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setDateFilter("CUSTOM")}
            >
              Custom Date
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === "CUSTOM" && (
          <div style={{
            display: "flex",
            gap: "12px",
            marginTop: "14px",
            paddingTop: "12px",
            borderTop: "1px solid #f1f5f9",
            flexWrap: "wrap",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>From:</span>
              <input
                type="date"
                className="form-control"
                style={{ width: "auto", padding: "6px 10px", fontSize: "12.5px" }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>To:</span>
              <input
                type="date"
                className="form-control"
                style={{ width: "auto", padding: "6px 10px", fontSize: "12.5px" }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              Reset Dates
            </button>
          </div>
        )}
      </div>

      {/* Main Returns Table / Empty State */}
      <div className="card">
        {loading ? (
          <div className="state-container">
            <div className="spinner"></div>
            <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>Loading return records...</p>
          </div>
        ) : error ? (
          <div className="state-container">
            <div className="state-icon" style={{ color: "#ef4444", backgroundColor: "#fef2f2" }}>
              <AlertCircle size={28} />
            </div>
            <h3 className="state-title">Error Loading Returns</h3>
            <p className="state-desc">{error}</p>
            <button type="button" className="btn btn-primary" onClick={fetchReturnHistory}>
              <RefreshCw size={15} />
              <span>Retry</span>
            </button>
          </div>
        ) : returns.length === 0 ? (
          <div className="state-container">
            <div className="state-icon" style={{ color: "#64748b", backgroundColor: "#f1f5f9" }}>
              <RotateCcw size={28} />
            </div>
            <h3 className="state-title">No Product Returns Recorded</h3>
            <p className="state-desc">
              {search || dateFilter !== "ALL"
                ? "No return transactions matched your current filters."
                : "When an invoice product is returned, the transaction and refund audit will appear here."}
            </p>
            {(search || dateFilter !== "ALL") && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearch("");
                  setDateFilter("ALL");
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Return Date</th>
                  <th>Invoice Number</th>
                  <th>Customer</th>
                  <th>Returned Product</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Refund Amount</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((ret) => {
                  const invId = ret.invoice?._id || ret.invoice;
                  return (
                    <tr key={ret._id}>
                      <td style={{ fontSize: "12.5px", color: "#475569", whiteSpace: "nowrap" }}>
                        {formatDateTime(ret.returnedAt || ret.createdAt)}
                      </td>
                      <td>
                        <Link
                          to={`/invoices/${invId}`}
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            color: "#2563eb",
                            textDecoration: "none"
                          }}
                          className="hover-underline"
                        >
                          {ret.invoiceNumber || "INV-XXXX"}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                          {ret.customer?.name || "Customer"}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                          {ret.customer?.phone || ""}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                          {ret.productName || "Product"}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#64748b", fontFamily: "var(--font-mono)" }}>
                          S/N: {ret.serialNumber || "N/A"}
                        </div>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "#dc2626" }}>
                        {ret.returnedQuantity || 1}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, fontSize: "14px", color: "#0f172a", whiteSpace: "nowrap" }}>
                        {displayAmount(ret.refundAmount)}
                      </td>
                      <td style={{ fontSize: "12.5px", color: "#475569", maxWidth: "200px" }}>
                        {ret.reason ? (
                          <span style={{ fontStyle: "italic" }}>"{ret.reason}"</span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>No reason specified</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
