import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Laptop, 
  CheckCircle2, 
  ShoppingBag, 
  IndianRupee, 
  TrendingUp, 
  Clock, 
  Plus, 
  ReceiptText, 
  UserPlus, 
  Download, 
  Eye,
  Layers,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import LaptopModal from "../components/LaptopModal";
import CustomerModal from "../components/CustomerModal";
import Toast from "../components/Toast";
import { getDashboardStats } from "../api/dashboardApi";
import { downloadInvoicePdf } from "../api/invoiceApi";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modals state
  const [laptopModalOpen, setLaptopModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.customMessage || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDownloadPdf = async (e, invoice) => {
    e.stopPropagation();
    try {
      await downloadInvoicePdf(invoice._id, invoice.invoiceNumber);
      showToast(`Downloaded Invoice ${invoice.invoiceNumber}`, "success");
    } catch (err) {
      showToast("Failed to download PDF invoice", "error");
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  if (loading && !stats) {
    return (
      <div className="state-container">
        <div className="spinner"></div>
        <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>Loading dashboard analytics...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="state-container">
        <div className="state-icon" style={{ color: "#ef4444", backgroundColor: "#fef2f2" }}>
          <AlertCircle size={28} />
        </div>
        <h3 className="state-title">Unable to load dashboard</h3>
        <p className="state-desc">{error}</p>
        <button type="button" className="btn btn-primary" onClick={fetchStats}>
          <RefreshCw size={15} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const metrics = stats?.metrics || {};
  const recentInvoices = stats?.recentInvoices || [];
  const brandStats = stats?.brandStats || [];

  return (
    <div>
      {/* Action Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
            Overview & Performance
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Live metrics from used laptop inventory, billing receipts, and payment settlements.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setCustomerModalOpen(true)}
          >
            <UserPlus size={15} />
            <span>+ Add Customer</span>
          </button>
          
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setLaptopModalOpen(true)}
          >
            <Plus size={15} />
            <span>+ Add Laptop</span>
          </button>

          <Link to="/create-bill" className="btn btn-primary btn-sm">
            <ReceiptText size={15} />
            <span>Create New Bill</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stat-card-grid">
        <StatCard
          title="Total Laptops"
          value={metrics.totalLaptops || 0}
          sub={`${metrics.availableLaptops || 0} Available in Stock`}
          icon={Laptop}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />

        <StatCard
          title="Available Stock"
          value={metrics.availableLaptops || 0}
          sub={`Value: ${formatCurrency(metrics.stockSellingValue)}`}
          icon={CheckCircle2}
          iconBg="#ecfdf5"
          iconColor="#059669"
        />

        <StatCard
          title="Sold Units"
          value={metrics.soldLaptops || 0}
          sub={`${metrics.totalCustomers || 0} Registered Buyers`}
          icon={ShoppingBag}
          iconBg="#f5f3ff"
          iconColor="#7c3aed"
        />

        <StatCard
          title="Total Sales Revenue"
          value={formatCurrency(metrics.totalSales)}
          sub="Gross billed revenue"
          icon={IndianRupee}
          iconBg="#ecfdf5"
          iconColor="#059669"
        />

        <StatCard
          title="Today's Sales"
          value={formatCurrency(metrics.todaySales)}
          sub="Invoiced today"
          icon={TrendingUp}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />

        <StatCard
          title="Pending Payments"
          value={formatCurrency(metrics.pendingPayments)}
          sub="Outstanding receivables"
          icon={Clock}
          iconBg="#fef2f2"
          iconColor="#dc2626"
        />
      </div>

      {/* Main Grid: Recent Invoices & Stock Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Recent Invoices Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent Invoices</h3>
              <div className="card-subtitle">Latest billing transactions generated</div>
            </div>
            <Link to="/invoices" className="btn btn-secondary btn-sm">
              View All Invoices
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
              <ReceiptText size={32} color="#cbd5e1" style={{ margin: "0 auto 8px" }} />
              <p style={{ fontWeight: 600 }}>No bills generated yet.</p>
              <p style={{ fontSize: "12px", marginTop: "4px" }}>Click "Create New Bill" to generate your first invoice.</p>
            </div>
          ) : (
            <div className="table-container" style={{ border: "none", boxShadow: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Laptop</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv._id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        <Link to={`/invoices/${inv._id}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                          {inv.invoiceNumber}
                        </Link>
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
                            return (
                              <div>
                                <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "12.5px" }}>
                                  {items.length} Products
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748b" }}>
                                  {items.map(it => `${it.laptop?.brand || ""} ${it.laptop?.model || ""}`.trim()).filter(Boolean).join(", ")}
                                </div>
                              </div>
                            );
                          }
                          const l = items[0]?.laptop || inv.laptop;
                          return (
                            <div>
                              <div style={{ fontWeight: 600 }}>
                                {l ? `${l.brand} ${l.model}` : "Laptop Record"}
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-mono)" }}>
                                S/N: {l?.serialNumber || "N/A"}
                              </div>
                            </div>
                          );
                        })()}
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
                            title="View Invoice"
                            onClick={() => navigate(`/invoices/${inv._id}`)}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            title="Download PDF"
                            onClick={(e) => handleDownloadPdf(e, inv)}
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

        {/* Available Stock by Brand */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Stock by Brand</h3>
              <div className="card-subtitle">Ready-to-bill inventory breakdown</div>
            </div>
            <Link to="/inventory" className="btn btn-secondary btn-sm">
              <Layers size={13} />
            </Link>
          </div>

          {brandStats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
              <Laptop size={32} color="#cbd5e1" style={{ margin: "0 auto 8px" }} />
              <p style={{ fontWeight: 600 }}>No laptops in stock.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {brandStats.map((b) => (
                <div 
                  key={b._id} 
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      backgroundColor: "#eff6ff",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "13px"
                    }}>
                      {b._id ? b._id.charAt(0).toUpperCase() : "L"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                        {b._id || "Other"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        Valuation: {formatCurrency(b.totalValue)}
                      </div>
                    </div>
                  </div>

                  <span className="badge badge-available">
                    {b.count} {b.count === 1 ? "Unit" : "Units"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <LaptopModal
        isOpen={laptopModalOpen}
        onClose={() => setLaptopModalOpen(false)}
        onSuccess={fetchStats}
        showToast={showToast}
      />

      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSuccess={fetchStats}
        showToast={showToast}
      />

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
