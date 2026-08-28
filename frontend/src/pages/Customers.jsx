import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  ReceiptText, 
  Phone, 
  Mail, 
  MapPin, 
  RefreshCw,
  AlertCircle,
  ShoppingBag
} from "lucide-react";
import CustomerModal from "../components/CustomerModal";
import CustomerHistoryModal from "../components/CustomerHistoryModal";
import Toast from "../components/Toast";
import { getCustomers, getCustomerById } from "../api/customerApi";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search
  const [search, setSearch] = useState("");

  // Modals & Selected Customer
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState(null);

  const [toast, setToast] = useState(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCustomers({
        search: search.trim() || undefined
      });
      setCustomers(data);
    } catch (err) {
      setError(err.customMessage || "Unable to load customer directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenAdd = () => {
    setSelectedCustomer(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setSelectedCustomer(customer);
    setModalOpen(true);
  };

  const handleOpenHistory = async (customer) => {
    try {
      const details = await getCustomerById(customer._id);
      setHistoryCustomer(details);
      setHistoryModalOpen(true);
    } catch (err) {
      showToast("Failed to fetch customer invoice records", "error");
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
            Customer Directory
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Maintain customer records, contact information, GSTIN details, and track lifetime laptop purchases.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "10px", flex: 1, minWidth: "280px" }}>
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by customer name, phone number, email, or GSTIN..."
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
              onClick={() => { setSearch(""); fetchCustomers(); }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="state-container">
          <div className="spinner"></div>
          <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>Loading customer records...</p>
        </div>
      ) : error ? (
        <div className="state-container">
          <div className="state-icon" style={{ color: "#ef4444", backgroundColor: "#fef2f2" }}>
            <AlertCircle size={28} />
          </div>
          <h3 className="state-title">Unable to load customers</h3>
          <p className="state-desc">{error}</p>
          <button type="button" className="btn btn-primary" onClick={fetchCustomers}>
            <RefreshCw size={15} />
            <span>Retry</span>
          </button>
        </div>
      ) : customers.length === 0 ? (
        <div className="state-container card">
          <div className="state-icon">
            <Users size={32} />
          </div>
          <h3 className="state-title">No Customers Found</h3>
          <p className="state-desc">
            {search
              ? "No customer matches your search query."
              : "No customer records have been added yet."}
          </p>
          {search ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setSearch(""); fetchCustomers(); }}
            >
              Reset Search
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>Add First Customer</span>
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>Email</th>
                <th>Billing Address</th>
                <th>GSTIN</th>
                <th>Total Purchases</th>
                <th>Lifetime Spent</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer._id}>
                  <td>
                    <div 
                      style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px", cursor: "pointer" }}
                      onClick={() => handleOpenHistory(customer)}
                    >
                      {customer.name}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#334155" }}>
                      <Phone size={13} color="#94a3b8" />
                      <span>{customer.phone}</span>
                    </div>
                  </td>
                  <td>
                    {customer.email ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                        <Mail size={13} color="#94a3b8" />
                        <span>{customer.email}</span>
                      </div>
                    ) : (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569", maxWidth: "250px" }}>
                      <MapPin size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {customer.address}
                      </span>
                    </div>
                  </td>
                  <td>
                    {customer.gstin ? (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", fontWeight: 600, color: "#1e293b" }}>
                        {customer.gstin}
                      </span>
                    ) : (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    )}
                  </td>
                  <td>
                    <span 
                      className="badge badge-available"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleOpenHistory(customer)}
                    >
                      <ShoppingBag size={11} />
                      <span>{customer.purchaseCount || 0} Orders</span>
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: "#2563eb", fontSize: "13.5px" }}>
                      {formatCurrency(customer.totalSpent)}
                    </strong>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        title="View Purchases"
                        onClick={() => handleOpenHistory(customer)}
                      >
                        <ReceiptText size={13} />
                        <span>Invoices</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        title="Edit Customer"
                        onClick={() => handleOpenEdit(customer)}
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Add/Edit Modal */}
      <CustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={selectedCustomer}
        onSuccess={fetchCustomers}
        showToast={showToast}
      />

      {/* Customer Invoice History Modal */}
      <CustomerHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        customer={historyCustomer}
      />

      {/* Toast */}
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
