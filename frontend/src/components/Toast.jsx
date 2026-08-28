import React from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

export default function Toast({ message, type = "success", onClose }) {
  if (!message) return null;

  return (
    <div className="toast-container">
      <div className={`toast toast-${type}`}>
        {type === "success" ? (
          <CheckCircle size={18} color="#10b981" />
        ) : (
          <AlertCircle size={18} color="#ef4444" />
        )}
        <span style={{ flex: 1 }}>{message}</span>
        {onClose && (
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex" }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
