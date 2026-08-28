import React from "react";

export default function StatCard({ title, value, sub, icon: Icon, iconBg = "#eff6ff", iconColor = "#2563eb" }) {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-label">{title}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
      {Icon && (
        <div className="stat-icon" style={{ backgroundColor: iconBg, color: iconColor }}>
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}
