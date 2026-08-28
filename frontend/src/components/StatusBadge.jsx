import React from "react";
import { CheckCircle2, Clock, AlertCircle, Sparkles, Check } from "lucide-react";

export default function StatusBadge({ status, type = "status" }) {
  if (!status) return null;

  const normalized = status.toUpperCase();

  if (type === "condition") {
    return (
      <span className="badge badge-condition">
        <Sparkles size={11} />
        <span>{status}</span>
      </span>
    );
  }

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
