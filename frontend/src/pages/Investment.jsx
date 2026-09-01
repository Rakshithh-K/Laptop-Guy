import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  IndianRupee,
  Layers,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Calendar,
  Percent,
  Plus,
  Boxes,
  Landmark
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
  Tooltip
} from "recharts";
import StatCard from "../components/StatCard";
import Toast from "../components/Toast";
import LaptopModal from "../components/LaptopModal";
import { getInvestmentAnalytics } from "../api/dashboardApi";

export default function Investment() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("bar"); // "bar" | "area"
  const [laptopModalOpen, setLaptopModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchInvestmentData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getInvestmentAnalytics();
      setData(res);
    } catch (err) {
      setError(err.customMessage || "Failed to load investment analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestmentData();
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
          Calculating inventory investment analytics...
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
        <h3 className="state-title">Unable to load investment analytics</h3>
        <p className="state-desc">{error}</p>
        <button type="button" className="btn btn-primary" onClick={fetchInvestmentData}>
          <RefreshCw size={15} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const currentInvestment = data?.currentInvestment || 0;
  const totalInvestment = data?.totalInvestment || 0;
  const inventoryCount = data?.inventoryCount || 0;
  const totalLaptopsCount = data?.totalLaptopsCount || 0;
  const averagePurchasePrice = data?.averagePurchasePrice || 0;
  const monthlyInvestment = data?.monthlyInvestment || [];

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
            <span style={{ color: "#94a3b8" }}>Total Investment:</span>
            <strong style={{ color: "#f59e0b", fontWeight: 700 }}>
              {formatCurrency(monthData.investment)}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "4px" }}>
            <span style={{ color: "#94a3b8" }}>Laptops Acquired:</span>
            <span style={{ color: "#93c5fd", fontWeight: 600 }}>
              {monthData.laptopCount} {monthData.laptopCount === 1 ? "Unit" : "Units"}
            </span>
          </div>
          {monthData.laptopCount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
              <span style={{ color: "#94a3b8" }}>Avg Cost / Unit:</span>
              <span style={{ color: "#f8fafc", fontWeight: 600 }}>
                {formatCurrency(Math.round(monthData.investment / monthData.laptopCount))}
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
              Investment Analytics
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              Capital expenditure and chronological inventory acquisition costs based on Laptop Purchase Price.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              fetchInvestmentData();
              showToast("Investment analytics refreshed", "success");
            }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setLaptopModalOpen(true)}
          >
            <Plus size={15} />
            <span>+ Add Laptop</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stat-card-grid">
        <StatCard
          title="Current Inventory Investment"
          value={formatCurrency(currentInvestment)}
          sub="Active capital in unsold stock"
          badge="Current"
          icon={Wallet}
          iconBg="#fffbeb"
          iconColor="#d97706"
        />

        <StatCard
          title="Total Purchase Investment"
          value={formatCurrency(totalInvestment)}
          sub={`${totalLaptopsCount} total laptops acquired all-time`}
          icon={Landmark}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />

        <StatCard
          title="Laptops in Inventory"
          value={inventoryCount}
          sub={`${inventoryCount === 1 ? "Unit" : "Units"} currently available`}
          icon={Boxes}
          iconBg="#ecfdf5"
          iconColor="#059669"
        />

        <StatCard
          title="Avg Purchase Cost"
          value={formatCurrency(averagePurchasePrice)}
          sub="Per unit available in stock"
          icon={IndianRupee}
          iconBg="#f5f3ff"
          iconColor="#7c3aed"
        />
      </div>

      {/* Monthly Investment Chart Card */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-header" style={{ flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 className="card-title">Month-Wise Investment Graph</h3>
              <span style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: "#fffbeb",
                color: "#b45309"
              }}>
                Stock Acquisition Cost
              </span>
            </div>
            <div className="card-subtitle">
              Chronological inventory purchases grouped by stock entry date
            </div>
          </div>

          {monthlyInvestment.length > 0 && (
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

        {monthlyInvestment.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px", color: "#64748b" }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px"
            }}>
              <BarChart3 size={28} />
            </div>
            <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>No Investment Data Yet</h4>
            <p style={{ fontSize: "13px", marginTop: "4px", maxWidth: "420px", margin: "4px auto 16px" }}>
              When you add laptops to inventory, the system will automatically track and display month-wise purchase costs here.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setLaptopModalOpen(true)}>
              <Plus size={15} />
              <span>Add Your First Laptop</span>
            </button>
          </div>
        ) : (
          <div style={{ width: "100%", height: "360px", marginTop: "12px" }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={monthlyInvestment} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="investmentBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
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
                    dataKey="investment"
                    name="Monthly Investment"
                    fill="url(#investmentBarGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={55}
                  />
                </BarChart>
              ) : (
                <AreaChart data={monthlyInvestment} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="investmentAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.0} />
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
                    dataKey="investment"
                    name="Monthly Investment"
                    stroke="#d97706"
                    strokeWidth={3}
                    fill="url(#investmentAreaGradient)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Monthly Breakdown Table */}
      {monthlyInvestment.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Monthly Investment Breakdown</h3>
              <div className="card-subtitle">Chronological record of stock additions and purchase costs</div>
            </div>
          </div>

          <div className="table-container" style={{ border: "none", boxShadow: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Units Acquired</th>
                  <th>Total Investment</th>
                  <th>Avg Cost / Unit</th>
                  <th>Share of Total %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyInvestment.map((m) => {
                  const sharePct = totalInvestment > 0 ? ((m.investment / totalInvestment) * 100).toFixed(1) : "0.0";
                  const avgCost = m.laptopCount > 0 ? Math.round(m.investment / m.laptopCount) : 0;
                  return (
                    <tr key={m.key}>
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Calendar size={14} color="#64748b" />
                          <span>{m.fullMonth}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-available">
                          {m.laptopCount} {m.laptopCount === 1 ? "Unit" : "Units"}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: "#0f172a" }}>
                        {formatCurrency(m.investment)}
                      </td>
                      <td style={{ fontWeight: 600, color: "#475569" }}>
                        {formatCurrency(avgCost)}
                      </td>
                      <td>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          backgroundColor: "#fffbeb",
                          color: "#b45309"
                        }}>
                          {sharePct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#f8fafc", fontWeight: 800 }}>
                  <td style={{ color: "#0f172a" }}>Overall Total</td>
                  <td>
                    <span className="badge badge-available">
                      {totalLaptopsCount} Units
                    </span>
                  </td>
                  <td style={{ color: "#d97706", fontSize: "15px" }}>
                    {formatCurrency(totalInvestment)}
                  </td>
                  <td style={{ color: "#475569" }}>
                    {formatCurrency(totalLaptopsCount > 0 ? Math.round(totalInvestment / totalLaptopsCount) : 0)}
                  </td>
                  <td>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 800,
                      backgroundColor: "#fffbeb",
                      color: "#b45309"
                    }}>
                      100.0%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Laptop Modal for Quick Stock Addition */}
      <LaptopModal
        isOpen={laptopModalOpen}
        onClose={() => setLaptopModalOpen(false)}
        onSuccess={fetchInvestmentData}
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
