import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Calendar, Store, LogOut, Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Topbar({ onToggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutAdmin } = useAuth();
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric"
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith("/dashboard")) return "Business Dashboard";
    if (path.startsWith("/profit")) return "Profit Analytics";
    if (path.startsWith("/investment")) return "Investment Analytics";
    if (path.startsWith("/inventory")) return "Laptop Inventory Management";
    if (path.startsWith("/create-bill")) return "Create New Customer Bill";
    if (path.startsWith("/invoices/")) return "Invoice Overview";
    if (path.startsWith("/invoices")) return "Invoice Records & History";
    if (path.startsWith("/customers")) return "Customer Directory";
    return "Laptop Billing System";
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to sign out?");
    if (!confirmed) return;
    await logoutAdmin();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Hamburger Menu button visible on mobile */}
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        <h1 className="topbar-title">{getPageTitle()}</h1>
      </div>

      <div className="topbar-right">
        <div className="date-badge topbar-hide-mobile">
          <Calendar size={14} />
          <span>{currentDate}</span>
        </div>

        <div className="store-badge topbar-hide-mobile">
          <Store size={15} />
          <span>Laptop Guy (Main)</span>
        </div>

        {user && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleLogout}
            title="Sign out of admin session"
            style={{ color: "#ef4444", borderColor: "#fecaca" }}
          >
            <LogOut size={14} />
            <span className="topbar-signout-text">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
}
