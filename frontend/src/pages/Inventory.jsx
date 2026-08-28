import React, { useState, useEffect } from "react";
import { 
  Laptop, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  Filter, 
  RefreshCw,
  AlertCircle
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import LaptopModal from "../components/LaptopModal";
import Toast from "../components/Toast";
import { getLaptops, deleteLaptop } from "../api/laptopApi";

export default function Inventory() {
  const [laptops, setLaptops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals & Selected Laptop
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLaptop, setSelectedLaptop] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchInventory = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLaptops({
        search: search.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined
      });
      setLaptops(data);
    } catch (err) {
      setError(err.customMessage || "Unable to load inventory. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInventory();
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenAdd = () => {
    setSelectedLaptop(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (laptop) => {
    setSelectedLaptop(laptop);
    setModalOpen(true);
  };

  const handleDelete = async (laptop) => {
    if (laptop.status === "SOLD") {
      showToast("Cannot delete a laptop that has already been billed & sold.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ${laptop.brand} ${laptop.model} (S/N: ${laptop.serialNumber}) from inventory?`
    );
    if (!confirmed) return;

    try {
      await deleteLaptop(laptop._id);
      showToast("Laptop removed from inventory", "success");
      fetchInventory();
    } catch (err) {
      showToast(err.customMessage || "Failed to delete laptop", "error");
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>
            Laptop Inventory
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Manage tested used laptop units, technical specifications, serial numbers, and price tags.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>Add Laptop</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "10px", flex: 1, minWidth: "280px" }}>
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by brand, model, or serial number..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
          {search && (
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(""); fetchInventory(); }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab ${statusFilter === "ALL" ? "active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            All Stock
          </button>
          <button
            type="button"
            className={`filter-tab ${statusFilter === "AVAILABLE" ? "active" : ""}`}
            onClick={() => setStatusFilter("AVAILABLE")}
          >
            Available Only
          </button>
          <button
            type="button"
            className={`filter-tab ${statusFilter === "SOLD" ? "active" : ""}`}
            onClick={() => setStatusFilter("SOLD")}
          >
            Sold
          </button>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="state-container">
          <div className="spinner"></div>
          <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>Loading inventory records...</p>
        </div>
      ) : error ? (
        <div className="state-container">
          <div className="state-icon" style={{ color: "#ef4444", backgroundColor: "#fef2f2" }}>
            <AlertCircle size={28} />
          </div>
          <h3 className="state-title">Failed to load inventory</h3>
          <p className="state-desc">{error}</p>
          <button type="button" className="btn btn-primary" onClick={fetchInventory}>
            <RefreshCw size={15} />
            <span>Retry</span>
          </button>
        </div>
      ) : laptops.length === 0 ? (
        <div className="state-container card">
          <div className="state-icon">
            <Laptop size={32} />
          </div>
          <h3 className="state-title">No Laptops Found</h3>
          <p className="state-desc">
            {search || statusFilter !== "ALL"
              ? "No inventory matches your current search or filter criteria."
              : "No laptops have been added to inventory yet. Start by adding your first unit."}
          </p>
          {search || statusFilter !== "ALL" ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setSearch(""); setStatusFilter("ALL"); }}
            >
              Reset Filters
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>Add Your First Laptop</span>
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Brand & Model</th>
                <th>Serial Number</th>
                <th>Processor</th>
                <th>RAM</th>
                <th>Storage</th>
                <th>Selling Price</th>
                <th>Condition</th>
                <th>Warranty</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {laptops.map((laptop) => (
                <tr key={laptop._id}>
                  <td>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                      {laptop.brand} {laptop.model}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                      Cost: {formatCurrency(laptop.purchasePrice)}
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      fontFamily: "var(--font-mono)", 
                      fontWeight: 600, 
                      backgroundColor: "#f1f5f9", 
                      padding: "3px 7px", 
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: "#1e293b"
                    }}>
                      {laptop.serialNumber}
                    </span>
                  </td>
                  <td>{laptop.processor}</td>
                  <td>{laptop.ram}</td>
                  <td>{laptop.storage}</td>
                  <td>
                    <strong style={{ color: "#0f172a", fontSize: "14px" }}>
                      {formatCurrency(laptop.sellingPrice)}
                    </strong>
                  </td>
                  <td>
                    <StatusBadge status={laptop.condition} type="condition" />
                  </td>
                  <td style={{ fontSize: "12px", color: "#475569" }}>
                    {laptop.warranty || "30 Days"}
                  </td>
                  <td>
                    <StatusBadge status={laptop.status} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        title="Edit Laptop"
                        onClick={() => handleOpenEdit(laptop)}
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                      
                      {laptop.status === "AVAILABLE" && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Delete Laptop"
                          style={{ color: "#dc2626" }}
                          onClick={() => handleDelete(laptop)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Laptop Add/Edit Modal */}
      <LaptopModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        laptop={selectedLaptop}
        onSuccess={fetchInventory}
        showToast={showToast}
      />

      {/* Toast Feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
