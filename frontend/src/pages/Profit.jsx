import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Calendar,
  Sparkles,
  Percent,
  ReceiptText,
  Eye,
  EyeOff,
  RotateCcw,
  Undo2,
  Layers,
  ArrowDownLeft
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import StatCard from "../components/StatCard";
import Toast from "../components/Toast";
import { getProfitAnalytics } from "../api/dashboardApi";

export default function Profit() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("bar"); // "bar" | "area"
  const [showAmounts, setShowAmounts] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchProfitData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getProfitAnalytics();
      setData(res);
    } catch (err) {
      setError(err.customMessage || "Failed to load profit analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitData();
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

  const displayAmount = (val) => {
    if (!showAmounts) return "₹ ••••••";
    return formatCurrency(val);
  };

  const formatAxisCurrency = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    if (val <= -100000) return `-₹${(Math.abs(val) / 100000).toFixed(1)}L`;
    if (val <= -1000) return `-₹${(Math.abs(val) / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  if (loading && !data) {
    return (
      <div className="state-container">
        <div className="spinner"></div>
        <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>
          Calculating chronological profit analytics accounting for sales & returns...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="state-container">
        <div className="state-icon" style={{ color: "#ef4444", backgroundColor: "#fef2f2" }}>
          <AlertCircle size={28} />
        </div>
        <h3 className="state-title">Unable to load profit analytics</h3>
        <p className="state-desc">{error}</p>
        <button type="button" className="btn btn-primary" onClick={fetchProfitData}>
          <RefreshCw size={15} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const overallProfit = data?.overallProfit || 0; // Net profit after returns
  const grossSalesProfit = data?.grossSalesProfit || 0; // Gross profit before returns
  const totalRefunds = data?.totalRefunds || 0;
  const totalReturnCost = data?.totalReturnCost || 0;
  const totalSoldUnits = data?.totalSoldUnits || 0;
  const totalReturnedUnits = data?.totalReturnedUnits || 0;
  const netSoldUnits = data?.netSoldUnits !== undefined ? data.netSoldUnits : (totalSoldUnits - totalReturnedUnits);
  const totalRevenue = data?.totalRevenue || 0;
  const netRevenue = data?.netRevenue !== undefined ? data.netRevenue : (totalRevenue - totalRefunds);
  const monthlyProfit = data?.monthlyProfit || [];

  const avgProfitPerUnit = netSoldUnits > 0 ? Math.round(overallProfit / netSoldUnits) : 0;
  const netMargin = netRevenue > 0 ? ((overallProfit / netRevenue) * 100).toFixed(1) : 0;

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const monthData = payload[0].payload;
      return (
        <div style={{
          backgroundColor: "#0f172a",
          color: "#ffffff",
          padding: "12px 16px",
          borderRadius: "10px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
          border: "1px solid #334155",
          fontSize: "13px",
          minWidth: "200px"
        }}>
          <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px", borderBottom: "1px solid #334155", paddingBottom: "6px" }}>
            {monthData.fullMonth || label}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "4px" }}>
            <span style={{ color: "#94a3b8" }}>Net Profit:</span>
            <strong style={{ color: monthData.profit >= 0 ? "#34d399" : "#f87171", fontWeight: 700 }}>
              {formatCurrency(monthData.profit)}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "4px" }}>
            <span style={{ color: "#94a3b8" }}>Gross Sales Profit:</span>
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
              {formatCurrency(monthData.grossSalesProfit || 0)}
            </span>
          </div>
          {(monthData.refunds || 0) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "4px" }}>
              <span style={{ color: "#f87171" }}>Refunds Deducted:</span>
              <span style={{ color: "#f87171", fontWeight: 600 }}>
                - {formatCurrency(monthData.refunds)}
              </span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "4px" }}>
            <span style={{ color: "#94a3b8" }}>Billed Revenue:</span>
            <span style={{ color: "#93c5fd", fontWeight: 600 }}>
              {formatCurrency(monthData.revenue)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "4px" }}>
            <span style={{ color: "#94a3b8" }}>Units Sold / Ret:</span>
            <span style={{ color: "#f8fafc", fontWeight: 600 }}>
              {monthData.soldUnits} sold · {monthData.returnedUnits || 0} ret
            </span>
          </div>
          {monthData.revenue > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", borderTop: "1px dashed #334155", paddingTop: "4px", marginTop: "4px" }}>
              <span style={{ color: "#94a3b8" }}>Net Margin:</span>
              <span style={{ color: "#fbbf24", fontWeight: 700 }}>
                {((monthData.profit / (monthData.revenue || 1)) * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Action Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
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
              Profit Analytics
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              Chronological profit trajectory: Gross Sales Profit minus Product Returns and Customer Refunds.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAmounts(!showAmounts)}
            title={showAmounts ? "Hide profit figures" : "Show profit figures"}
          >
            {showAmounts ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{showAmounts ? "Hide Amounts" : "Show Amounts"}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              fetchProfitData();
              showToast("Profit analytics refreshed", "success");
            }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>

          <Link to="/returns" className="btn btn-secondary btn-sm">
            <RotateCcw size={15} />
            <span>Return History</span>
          </Link>

          <Link to="/create-bill" className="btn btn-primary btn-sm">
            <ReceiptText size={15} />
            <span>Create Bill</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid - 4 Prompt Required Cards */}
      <div className="stat-card-grid" style={{ marginBottom: "24px" }}>
        <StatCard
          title="Net Profit"
          value={displayAmount(overallProfit)}
          sub="True bottom-line profit after returns"
          icon={TrendingUp}
          iconBg="#ecfdf5"
          iconColor="#059669"
        />

        <StatCard
          title="Gross Sales Profit"
          value={displayAmount(grossSalesProfit)}
          sub="Profit earned before return deductions"
          icon={IndianRupee}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />

        <StatCard
          title="Total Refunds"
          value={displayAmount(totalRefunds)}
          sub={`${totalReturnedUnits} unit(s) refunded to customers`}
          icon={ArrowDownLeft}
          iconBg="#fef2f2"
          iconColor="#dc2626"
          onClick={() => navigate("/returns")}
        />

        <StatCard
          title="Return Cost"
          value={displayAmount(totalReturnCost)}
          sub="Restored inventory purchase cost"
          icon={RotateCcw}
          iconBg="#fffbeb"
          iconColor="#d97706"
        />
      </div>

      {/* Secondary Metrics Row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "14px",
        marginBottom: "24px"
      }}>
        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "14px 18px",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Total Billed Revenue
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
            {displayAmount(totalRevenue)}
          </div>
          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
            Net: {displayAmount(netRevenue)}
          </div>
        </div>

        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "14px 18px",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Net Sold Units
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
            {netSoldUnits} Units
          </div>
          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
            {totalSoldUnits} gross · {totalReturnedUnits} returned
          </div>
        </div>

        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "14px 18px",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Net Profit Margin
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#059669", marginTop: "2px" }}>
            {netMargin}%
          </div>
          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
            Avg {displayAmount(avgProfitPerUnit)} / net unit
          </div>
        </div>
      </div>

      {/* Monthly Profit Chart Card */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-header" style={{ flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 className="card-title">Month-Wise Profit Graph</h3>
              <span style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: "#ecfdf5",
                color: "#059669"
              }}>
                Live Database Analytics
              </span>
            </div>
            <div className="card-subtitle">
              Net monthly profit trajectory accounting for sales and month-of-return refunds
            </div>
          </div>

          {monthlyProfit.length > 0 && (
            <div style={{ display: "flex", gap: "6px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
              <button
                type="button"
                className={`btn btn-sm ${chartType === "bar" ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "4px 10px", fontSize: "12px" }}
                onClick={() => setChartType("bar")}
              >
                Bar View
              </button>
              <button
                type="button"
                className={`btn btn-sm ${chartType === "area" ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "4px 10px", fontSize: "12px" }}
                onClick={() => setChartType("area")}
              >
                Area Trend
              </button>
            </div>
          )}
        </div>

        {monthlyProfit.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px", color: "#64748b" }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px"
            }}>
              <BarChart3 size={28} />
            </div>
            <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>No Profit Data Yet</h4>
            <p style={{ fontSize: "13px", marginTop: "4px", maxWidth: "420px", margin: "4px auto 16px" }}>
              When you generate sales invoices, the system will automatically calculate and display month-wise profit metrics here.
            </p>
            <Link to="/create-bill" className="btn btn-primary btn-sm">
              <ReceiptText size={15} />
              <span>Create Your First Bill</span>
            </Link>
          </div>
        ) : (
          <div style={{ width: "100%", height: "360px", marginTop: "12px" }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={monthlyProfit} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="profitBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="shortMonth"
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatAxisCurrency}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="profit"
                    name="Net Profit"
                    fill="url(#profitBarGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={55}
                  />
                </BarChart>
              ) : (
                <AreaChart data={monthlyProfit} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="profitAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="shortMonth"
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatAxisCurrency}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Net Profit"
                    stroke="#059669"
                    strokeWidth={3}
                    fill="url(#profitAreaGradient)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Monthly Breakdown Table */}
      {monthlyProfit.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Monthly Statement & Returns Breakdown</h3>
              <div className="card-subtitle">Chronological record of sales profit, refunds, and net profit</div>
            </div>
          </div>

          <div className="table-container" style={{ border: "none", boxShadow: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Invoices</th>
                  <th>Sold / Ret</th>
                  <th>Gross Profit</th>
                  <th>Refunds</th>
                  <th>Net Profit</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyProfit.map((m) => {
                  const mNetRev = m.revenue - (m.refunds || 0);
                  const marginPct = mNetRev > 0 ? ((m.profit / mNetRev) * 100).toFixed(1) : (m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : "0.0");
                  return (
                    <tr key={m.key}>
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Calendar size={14} color="#64748b" />
                          <span>{m.fullMonth}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "#334155" }}>
                          {m.invoiceCount} {m.invoiceCount === 1 ? "Bill" : "Bills"}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-sold">
                          {m.soldUnits} sold {m.returnedUnits > 0 && `· ${m.returnedUnits} ret`}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: "#0f172a" }}>
                        {formatCurrency(m.grossSalesProfit || 0)}
                      </td>
                      <td style={{ fontWeight: 600, color: (m.refunds || 0) > 0 ? "#dc2626" : "#64748b" }}>
                        {(m.refunds || 0) > 0 ? `- ${formatCurrency(m.refunds)}` : "₹0"}
                      </td>
                      <td style={{ fontWeight: 800, color: m.profit >= 0 ? "#059669" : "#dc2626" }}>
                        {formatCurrency(m.profit)}
                      </td>
                      <td>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          backgroundColor: m.profit >= 0 ? "#ecfdf5" : "#fef2f2",
                          color: m.profit >= 0 ? "#047857" : "#b91c1c"
                        }}>
                          {marginPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#f8fafc", fontWeight: 800 }}>
                  <td style={{ color: "#0f172a" }}>Overall Total</td>
                  <td>-</td>
                  <td>
                    <span className="badge badge-sold">
                      {netSoldUnits} Net Units
                    </span>
                  </td>
                  <td style={{ color: "#0f172a" }}>
                    {formatCurrency(grossSalesProfit)}
                  </td>
                  <td style={{ color: totalRefunds > 0 ? "#dc2626" : "#64748b" }}>
                    {totalRefunds > 0 ? `- ${formatCurrency(totalRefunds)}` : "₹0"}
                  </td>
                  <td style={{ color: "#059669", fontSize: "15px" }}>
                    {formatCurrency(overallProfit)}
                  </td>
                  <td>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 800,
                      backgroundColor: "#ecfdf5",
                      color: "#047857"
                    }}>
                      {netMargin}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

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
