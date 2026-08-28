import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Calendar, Store } from "lucide-react";

export default function Topbar() {
  const location = useLocation();
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
          <span>Laptop_guy(Main Branch)</span>
        </div>
      </div>
    </header>
  );
}
