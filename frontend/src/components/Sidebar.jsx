import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Laptop,
  ReceiptText,
  FileSpreadsheet,
  Users,
  ShieldCheck
} from "lucide-react";

export default function Sidebar() {
  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/inventory", label: "Inventory", icon: Laptop },
    { to: "/create-bill", label: "Create Bill", icon: ReceiptText },
    { to: "/invoices", label: "Invoices", icon: FileSpreadsheet },
    { to: "/customers", label: "Customers", icon: Users },
  ];

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
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981", fontWeight: 600 }}>
          <ShieldCheck size={14} />
          <span>GST Ready & Certified</span>
        </div>
        <div>System Version 1.0.0</div>
      </div>
    </aside>
  );
}
