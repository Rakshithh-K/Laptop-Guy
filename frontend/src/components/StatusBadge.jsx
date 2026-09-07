import React from "react";
import { CheckCircle2, Clock, AlertCircle, Sparkles, Check, RotateCcw, ArrowLeftRight } from "lucide-react";

export default function StatusBadge({ status, type = "status" }) {
  if (!status) return null;

  const normalized = status.toUpperCase().replace(/\s+/g, "_");

  if (type === "condition") {
    return (
      <span className="badge badge-condition">
        <Sparkles size={11} />
        <span>{status}</span>
      </span>
    );
  }

  // Return statuses
  if (normalized === "NOT_RETURNED") {
    return (
      <span className="badge" style={{ backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" }}>
        <span>Not Returned</span>
      </span>
    );
  }

  if (normalized === "PARTIALLY_RETURNED" || normalized === "PARTIAL_RETURN") {
    return (
      <span className="badge" style={{ backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" }}>
        <ArrowLeftRight size={11} />
        <span>Partially Returned</span>
      </span>
    );
  }

  if (normalized === "FULLY_RETURNED" || normalized === "RETURNED") {
    return (
      <span className="badge" style={{ backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
        <RotateCcw size={11} />
        <span>Fully Returned</span>
      </span>
    );
  }

  // Standard statuses
  if (normalized === "AVAILABLE") {
    return (
      <span className="badge badge-available">
        <Check size={12} />
        <span>AVAILABLE</span>
      </span>
    );
  }

  if (normalized === "SOLD") {
    return (
      <span className="badge badge-sold">
        <span>SOLD</span>
      </span>
    );
  }

  if (normalized === "PAID") {
    return (
      <span className="badge badge-paid">
        <CheckCircle2 size={12} />
        <span>PAID</span>
      </span>
    );
  }

  if (normalized === "PARTIAL") {
    return (
      <span className="badge badge-partial">
        <Clock size={12} />
        <span>PARTIAL</span>
      </span>
    );
  }

  if (normalized === "PENDING") {
    return (
      <span className="badge badge-pending">
        <AlertCircle size={12} />
        <span>PENDING</span>
      </span>
    );
  }

  return <span className="badge badge-sold">{status}</span>;
}
