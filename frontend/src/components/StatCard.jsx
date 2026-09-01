import React from "react";

export default function StatCard({ 
  title, 
  value, 
  sub, 
  icon: Icon, 
  iconBg = "#eff6ff", 
  iconColor = "#2563eb",
  onClick,
  badge
}) {
  const isClickable = Boolean(onClick);

  return (
    <div 
      className={`stat-card ${isClickable ? "stat-card-clickable" : ""}`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="stat-label">{title}</div>
          {badge && (
            <span style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: "#ecfdf5",
              color: "#059669",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              {badge}
            </span>
          )}
        </div>
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
