import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { createCustomer, updateCustomer } from "../api/customerApi";

export default function CustomerModal({ isOpen, onClose, customer, onSuccess, showToast }) {
  const isEdit = Boolean(customer && customer._id);

  const initialForm = {
    name: "",
    phone: "",
    email: "",
    address: "",
    gstin: ""
  };

  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        gstin: customer.gstin || ""
      });
    } else {
      setFormData(initialForm);
    }
    setError("");
  }, [customer, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "gstin" ? value.toUpperCase() : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()) {
      setError("Please fill out all required fields (Name, Phone, Address).");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await updateCustomer(customer._id, formData);
        showToast("Customer updated successfully!", "success");
      } else {
        await createCustomer(formData);
        showToast("Customer added successfully!", "success");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.customMessage || "Failed to save customer details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Customer (${customer?.name})` : "Add New Customer"}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && (
            <div style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "13px",
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Customer Full Name <span className="required">*</span>
            </label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Ramesh Kumar / Infosys Technologies"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Phone Number <span className="required">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="e.g. 9876543210"
                className="form-control"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                placeholder="e.g. ramesh@example.com"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Billing Address <span className="required">*</span>
            </label>
            <textarea
              name="address"
              rows={2}
              placeholder="e.g. #101, 2nd Floor, MG Road, Bangalore - 560001"
              className="form-control"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              GSTIN (Optional for business buyers)
            </label>
            <input
              type="text"
              name="gstin"
              placeholder="e.g. 29ABCDE1234F1Z5"
              className="form-control"
              style={{ textTransform: "uppercase" }}
              value={formData.gstin}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? "Saving..." : isEdit ? "Update Customer" : "Add Customer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
