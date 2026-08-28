import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { createLaptop, updateLaptop } from "../api/laptopApi";

export default function LaptopModal({ isOpen, onClose, laptop, onSuccess, showToast }) {
  const isEdit = Boolean(laptop && laptop._id);

  const initialForm = {
    brand: "",
    model: "",
    serialNumber: "",
    processor: "",
    ram: "16GB DDR4",
    storage: "512GB NVMe SSD",
    condition: "Mint (Grade A)",
    purchasePrice: "",
    sellingPrice: "",
    warranty: "30 Days Hardware Warranty",
    status: "AVAILABLE"
  };

  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (laptop) {
      setFormData({
        brand: laptop.brand || "",
        model: laptop.model || "",
        serialNumber: laptop.serialNumber || "",
        processor: laptop.processor || "",
        ram: laptop.ram || "16GB DDR4",
        storage: laptop.storage || "512GB NVMe SSD",
        condition: laptop.condition || "Mint (Grade A)",
        purchasePrice: laptop.purchasePrice !== undefined ? laptop.purchasePrice : "",
        sellingPrice: laptop.sellingPrice !== undefined ? laptop.sellingPrice : "",
        warranty: laptop.warranty || "30 Days Hardware Warranty",
        status: laptop.status || "AVAILABLE"
      });
    } else {
      setFormData(initialForm);
    }
    setError("");
  }, [laptop, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "serialNumber" ? value.toUpperCase() : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate required fields
    if (
      !formData.brand.trim() ||
      !formData.model.trim() ||
      !formData.serialNumber.trim() ||
      !formData.processor.trim() ||
      !formData.ram.trim() ||
      !formData.storage.trim() ||
      formData.purchasePrice === "" ||
      formData.sellingPrice === ""
    ) {
      setError("Please fill out all required fields.");
      return;
    }

    if (Number(formData.purchasePrice) < 0 || Number(formData.sellingPrice) < 0) {
      setError("Purchase and selling prices must be positive numbers.");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await updateLaptop(laptop._id, formData);
        showToast("Laptop updated successfully!", "success");
      } else {
        await createLaptop(formData);
        showToast("Laptop added to inventory successfully!", "success");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.customMessage || "Failed to save laptop details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Laptop (${laptop?.brand} ${laptop?.model})` : "Add Laptop to Inventory"}
      size="lg"
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Brand <span className="required">*</span>
              </label>
              <input
                type="text"
                name="brand"
                placeholder="e.g. Dell, Lenovo, HP, Apple"
                className="form-control"
                value={formData.brand}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Model Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="model"
                placeholder="e.g. ThinkPad T480, Latitude 7490"
                className="form-control"
                value={formData.model}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Serial Number <span className="required">*</span>
              </label>
              <input
                type="text"
                name="serialNumber"
                placeholder="e.g. 5CD9245LMN"
                className="form-control"
                style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase" }}
                value={formData.serialNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Processor (CPU) <span className="required">*</span>
              </label>
              <input
                type="text"
                name="processor"
                placeholder="e.g. Intel Core i5-8350U / Ryzen 5 5500U"
                className="form-control"
                value={formData.processor}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                RAM <span className="required">*</span>
              </label>
              <input
                type="text"
                name="ram"
                placeholder="e.g. 8GB DDR4 / 16GB DDR4 / 32GB"
                className="form-control"
                value={formData.ram}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Storage <span className="required">*</span>
              </label>
              <input
                type="text"
                name="storage"
                placeholder="e.g. 256GB SSD / 512GB NVMe / 1TB SSD"
                className="form-control"
                value={formData.storage}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Condition <span className="required">*</span>
              </label>
              <select
                name="condition"
                className="form-control"
                value={formData.condition}
                onChange={handleChange}
                required
              >
                <option value="Mint (Grade A)">Mint (Grade A - Like New)</option>
                <option value="Good (Grade B)">Good (Grade B - Minor signs of use)</option>
                <option value="Fair (Grade C)">Fair (Grade C - Scratches/Dents)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Warranty Period
              </label>
              <input
                type="text"
                name="warranty"
                placeholder="e.g. 30 Days Hardware / 90 Days"
                className="form-control"
                value={formData.warranty}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Purchase Price (₹) <span className="required">*</span>
              </label>
              <input
                type="number"
                name="purchasePrice"
                placeholder="e.g. 18000"
                min="0"
                className="form-control"
                value={formData.purchasePrice}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Selling Price (₹) <span className="required">*</span>
              </label>
              <input
                type="number"
                name="sellingPrice"
                placeholder="e.g. 26000"
                min="0"
                className="form-control"
                value={formData.sellingPrice}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {isEdit && (
            <div className="form-group">
              <label className="form-label">Inventory Status</label>
              <select
                name="status"
                className="form-control"
                value={formData.status}
                onChange={handleChange}
                disabled={laptop?.status === "SOLD"}
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="SOLD">SOLD</option>
              </select>
              {laptop?.status === "SOLD" && (
                <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>
                  Status cannot be changed for laptops with created invoices.
                </small>
              )}
            </div>
          )}
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
            {loading ? "Saving Laptop..." : isEdit ? "Update Laptop" : "Add to Inventory"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
