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
  ReceiptText
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

  const formatAxisCurrency = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  if (loading && !data) {
    return (
      <div className="state-container">
        <div className="spinner"></div>
        <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>
          Calculating chronological profit analytics...
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

  const overallProfit = data?.overallProfit || 0;
  const totalSoldUnits = data?.totalSoldUnits || 0;
  const totalRevenue = data?.totalRevenue || 0;
  const monthlyProfit = data?.monthlyProfit || [];

  const avgProfitPerUnit = totalSoldUnits > 0 ? Math.round(overallProfit / totalSoldUnits) : 0;
  const overallMargin = totalRevenue > 0 ? ((overallProfit / totalRevenue) * 100).toFixed(1) : 0;

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
          fontSize: "13px"
        }}>
          <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px", borderBottom: "1px solid #334155", paddingBottom: "6px" }}>
            {monthData.fullMonth || label}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "4px" }}>
            <span style={{ color: "#94a3b8" }}>Net Profit:</span>
            <strong style={{ color: "#34d399", fontWeight: 700 }}>
              {formatCurrency(monthData.profit)}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "4px" }}>
            <span style={{ color: "#94a3b8" }}>Invoiced Revenue:</span>
            <span style={{ color: "#93c5fd", fontWeight: 600 }}>
              {formatCurrency(monthData.revenue)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "4px" }}>
            <span style={{ color: "#94a3b8" }}>Units Sold:</span>
            <span style={{ color: "#f8fafc", fontWeight: 600 }}>
              {monthData.soldUnits} {monthData.soldUnits === 1 ? "Unit" : "Units"}
            </span>
          </div>
          {monthData.revenue > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
              <span style={{ color: "#94a3b8" }}>Profit Margin:</span>
              <span style={{ color: "#fbbf24", fontWeight: 700 }}>
                {((monthData.profit / monthData.revenue) * 100).toFixed(1)}%
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
              Chronological profit margins calculated from Selling Price minus Laptop Purchase Price.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
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

          <Link to="/create-bill" className="btn btn-primary btn-sm">
            <ReceiptText size={15} />
            <span>Create Bill</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stat-card-grid">
        <StatCard
          title="Overall Net Profit"
          value={formatCurrency(overallProfit)}
          sub="Total profit earned across all sales"
          icon={TrendingUp}
          iconBg="#ecfdf5"
          iconColor="#059669"
        />

        <StatCard
          title="Total Billed Revenue"
          value={formatCurrency(totalRevenue)}
          sub="Gross sales invoiced to buyers"
          icon={IndianRupee}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />

        <StatCard
          title="Sold Items"
          value={totalSoldUnits}
          sub={`${totalSoldUnits === 1 ? "Unit" : "Units"} sold to date`}
          icon={ShoppingBag}
          iconBg="#f5f3ff"
          iconColor="#7c3aed"
        />

        <StatCard
          title="Average Profit / Unit"
          value={formatCurrency(avgProfitPerUnit)}
          sub={`Overall Margin: ${overallMargin}%`}
          icon={Percent}
          iconBg="#fffbeb"
          iconColor="#d97706"
        />
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
              Chronological profit trajectory calculated per billed invoice item
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
              <h3 className="card-title">Monthly Profit Breakdown</h3>
              <div className="card-subtitle">Detailed chronological statement of billing performance</div>
            </div>
          </div>

          <div className="table-container" style={{ border: "none", boxShadow: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Invoices</th>
                  <th>Units Sold</th>
                  <th>Invoiced Revenue</th>
                  <th>Net Profit</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyProfit.map((m) => {
                  const marginPct = m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : "0.0";
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
                          {m.soldUnits} {m.soldUnits === 1 ? "Unit" : "Units"}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: "#0f172a" }}>
                        {formatCurrency(m.revenue)}
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
                      {totalSoldUnits} Units
                    </span>
                  </td>
                  <td style={{ color: "#0f172a" }}>
                    {formatCurrency(totalRevenue)}
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
                      {overallMargin}%
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
