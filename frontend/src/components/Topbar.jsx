import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Calendar, Store, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Topbar() {
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
        <h1 className="topbar-title">{getPageTitle()}</h1>
      </div>

      <div className="topbar-right">
        <div className="date-badge">
          <Calendar size={14} />
          <span>{currentDate}</span>
        </div>

        <div className="store-badge">
          <Store size={15} />
          <span>Laptop Guy (Main Branch)</span>
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
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
}
