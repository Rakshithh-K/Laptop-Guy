import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Laptop,
  ReceiptText,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  LogOut,
  UserCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logoutAdmin } = useAuth();

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/inventory", label: "Inventory", icon: Laptop },
    { to: "/create-bill", label: "Create Bill", icon: ReceiptText },
    { to: "/invoices", label: "Invoices", icon: FileSpreadsheet },
    { to: "/customers", label: "Customers", icon: Users },
  ];

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to sign out?");
    if (!confirmed) return;
    await logoutAdmin();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Laptop size={22} color="#ffffff" />
        </div>
        <div>
          <div className="sidebar-brand-name">LAPTOP_GUY</div>
          <div className="sidebar-brand-sub">Laptop Billing POS</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 10px",
            backgroundColor: "#1e293b",
            borderRadius: "8px",
            marginBottom: "10px"
          }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "12px",
              flexShrink: 0
            }}>
              A
            </div>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>Admin Account</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.email}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            padding: "9px 12px",
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: "12px",
            transition: "all 0.15s ease"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#ef4444";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.12)";
            e.currentTarget.style.color = "#f87171";
          }}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981", fontWeight: 600 }}>
          <ShieldCheck size={14} />
          <span>GST Ready & Certified</span>
        </div>
        <div>System Version 1.0.0</div>
      </div>
    </aside>
  );
}
