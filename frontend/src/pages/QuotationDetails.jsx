import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Printer,
  Calendar,
  IndianRupee,
  FileText,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  User,
  Laptop,
  ShieldCheck,
  Building
} from "lucide-react";
import Toast from "../components/Toast";
import Modal from "../components/Modal";
import {
  getQuotationById,
  downloadQuotationPdf,
  updateQuotationStatus,
  deleteQuotation
} from "../api/quotationApi";
import { getBusinessInfo } from "../api/dashboardApi";
import logoImg from "../assets/logo.jpeg";
import sigImg from "../assets/nawsig.jpeg";

export default function QuotationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showAdminCosts, setShowAdminCosts] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchQuotationData = async () => {
    setLoading(true);
    setError("");
    try {
      const [quoteRes, bizRes] = await Promise.all([
        getQuotationById(id),
        getBusinessInfo().catch(() => null)
      ]);
      setQuotation(quoteRes);
      setBusinessInfo(bizRes);
    } catch (err) {
      setError(err.customMessage || "Failed to load quotation details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotationData();
  }, [id]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDownload = async () => {
    if (!quotation) return;
    setDownloading(true);
    try {
      await downloadQuotationPdf(quotation._id, quotation.quotationNumber);
      showToast(`Downloaded Quotation-${quotation.quotationNumber}.pdf`, "success");
    } catch (err) {
      showToast("Failed to download PDF quotation", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!quotation) return;
    try {
      const updated = await updateQuotationStatus(quotation._id, newStatus);
      setQuotation(updated);
      showToast(`Quotation status changed to ${newStatus}`, "success");
    } catch (err) {
      showToast(err.customMessage || "Failed to update quotation status", "error");
    }
  };

  const handleDelete = async () => {
    if (!quotation) return;
    setDeleting(true);
    try {
      const res = await deleteQuotation(quotation._id);
      showToast(res.message || "Quotation deleted successfully", "success");
      setTimeout(() => {
        navigate("/quotations");
      }, 700);
    } catch (err) {
      showToast(err.customMessage || "Failed to delete quotation", "error");
      setDeleting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  if (loading && !quotation) {
    return (
      <div className="state-container">
        <div className="spinner"></div>
        <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>Loading quotation details...</p>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="state-container">
        <div className="state-icon" style={{ color: "#ef4444", backgroundColor: "#fef2f2" }}>
          <AlertCircle size={28} />
        </div>
        <h3 className="state-title">Quotation Not Found</h3>
        <p className="state-desc">{error || "Unable to locate this commercial quotation record."}</p>
        <Link to="/quotations" className="btn btn-primary">
          Back to Quotations
        </Link>
      </div>
    );
  }

  const customer = quotation.customer || {};
  const items = quotation.items || [];
  const isExpired = quotation.validUntil && new Date(quotation.validUntil) < new Date();

  const totalCost = items.reduce((sum, it) => sum + (Number(it.purchasePrice) || 0), 0);
  const totalProfit = quotation.totalQuotedAmount - totalCost;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Top Action Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: "10px"
      }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/quotations")}>
          <ArrowLeft size={16} />
          <span>Back to Quotations</span>
        </button>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Status selector */}
          <select
            className="form-control"
            style={{ width: "auto", fontSize: "12px", padding: "6px 10px", fontWeight: 700 }}
            value={quotation.status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="PENDING">Status: PENDING</option>
            <option value="ACCEPTED">Status: ACCEPTED</option>
            <option value="DECLINED">Status: DECLINED</option>
            <option value="EXPIRED">Status: EXPIRED</option>
          </select>

          {/* Admin Cost Toggle */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAdminCosts(!showAdminCosts)}
            title="Toggle internal cost & margin details"
          >
            {showAdminCosts ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showAdminCosts ? "Hide Margin" : "Show Margin"}</span>
          </button>

          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} />
            <span>Print</span>
          </button>

          <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
            <Download size={16} />
            <span>{downloading ? "Preparing PDF..." : "Download PDF"}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{
              borderColor: "#fca5a5",
              color: "#dc2626",
              backgroundColor: "#fef2f2"
            }}
            onClick={() => setDeleteModalOpen(true)}
            title="Delete this quotation"
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Internal Margin Card (Admin Only) */}
      {showAdminCosts && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "8px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#92400e" }}>
              🔒 Internal Profit & Margin Analysis (Admin Eyes Only)
            </div>
            <div style={{ fontSize: "11px", color: "#b45309" }}>
              This internal section is hidden from printed and downloaded customer PDFs.
            </div>
          </div>

          <div style={{ display: "flex", gap: "20px" }}>
            <div>
              <div style={{ fontSize: "10.5px", color: "#92400e", textTransform: "uppercase" }}>Total Cost</div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#78350f" }}>{formatCurrency(totalCost)}</div>
            </div>
            <div>
              <div style={{ fontSize: "10.5px", color: "#92400e", textTransform: "uppercase" }}>Total Quoted</div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#2563eb" }}>{formatCurrency(quotation.totalQuotedAmount)}</div>
            </div>
            <div>
              <div style={{ fontSize: "10.5px", color: "#92400e", textTransform: "uppercase" }}>Projected Profit</div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: totalProfit >= 0 ? "#059669" : "#dc2626" }}>
                {totalProfit >= 0 ? "+" : ""}{formatCurrency(totalProfit)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Quotation Sheet */}
      <div className="card invoice-sheet-card" style={{ marginBottom: "24px" }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "2px solid #0f172a",
          paddingBottom: "20px",
          marginBottom: "24px"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #e2e8f0"
              }}>
                <img src={logoImg} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
                {businessInfo?.businessName || "LAPTOP_GUY LAPTOPS AND COMPUTERS"}
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
              Certified Pre-Owned Laptops & Workstations
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
              #667, Kumbarageri 3rd cross, C H Mohalla, Mysore - 570004
            </div>
            <div style={{ fontSize: "12px", color: "#475569" }}>
              <strong>Phone:</strong> +91 7795330943 / +91 8217482089 &nbsp;|&nbsp; <strong>Email:</strong> laptopguysales@gmail.com
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{
              display: "inline-block",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 800,
              padding: "4px 14px",
              borderRadius: "4px",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              marginBottom: "8px"
            }}>
              Price Quotation
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", fontFamily: "var(--font-mono)" }}>
              {quotation.quotationNumber}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
              Issue Date: <strong>{formatDate(quotation.createdAt)}</strong>
            </div>
            <div style={{
              display: "inline-block",
              fontSize: "11px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "9999px",
              marginTop: "6px",
              backgroundColor: isExpired ? "#fef2f2" : "#eff6ff",
              color: isExpired ? "#dc2626" : "#2563eb",
              border: `1px solid ${isExpired ? "#fecaca" : "#bfdbfe"}`
            }}>
              {isExpired ? "Expired" : `Valid Until: ${formatDate(quotation.validUntil)}`}
            </div>
          </div>
        </div>

        {/* Customer & Quote Summary Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px"
        }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "6px" }}>
              Quotation Prepared For
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
              {customer.name || "Customer"}
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
              <strong>Phone:</strong> {customer.phone || "N/A"}
            </div>
            {customer.email && (
              <div style={{ fontSize: "12px", color: "#475569" }}>
                <strong>Email:</strong> {customer.email}
              </div>
            )}
            {customer.address && (
              <div style={{ fontSize: "12px", color: "#475569" }}>
                <strong>Address:</strong> {customer.address}
              </div>
            )}
            {customer.gstin && (
              <div style={{ fontSize: "12px", color: "#475569" }}>
                <strong>GSTIN:</strong> {customer.gstin}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "6px" }}>
              Quotation Summary
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginBottom: "3px" }}>
              <strong>Scope:</strong> Pre-Sales Commercial Estimate
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginBottom: "3px" }}>
              <strong>Validity:</strong> {quotation.validityDays} Days from Date of Issue
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginBottom: "3px" }}>
              <strong>Expiry:</strong> {formatDate(quotation.validUntil)}
            </div>
            <div style={{ fontSize: "12px", color: "#475569" }}>
              <strong>Quoted Units:</strong> {items.length} {items.length === 1 ? "Laptop" : "Laptops"}
            </div>
          </div>
        </div>

        {/* Quoted Items Table */}
        <table className="table" style={{ marginBottom: "24px" }}>
          <thead>
            <tr>
              <th style={{ width: "36px", textAlign: "center" }}>#</th>
              <th>Product Details & Technical Specifications</th>
              {showAdminCosts && <th style={{ textAlign: "right", color: "#b45309" }}>Cost Price</th>}
              <th style={{ textAlign: "right" }}>Unit Quote</th>
              <th style={{ textAlign: "center", width: "60px" }}>Qty</th>
              <th style={{ textAlign: "right" }}>Quoted Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const brand = item.brand || item.laptop?.brand || "";
              const model = item.model || item.laptop?.model || "";
              const serial = item.serialNumber || item.laptop?.serialNumber || "N/A";
              const proc = item.processor || item.laptop?.processor || "";
              const ram = item.ram || item.laptop?.ram || "";
              const storage = item.storage || item.laptop?.storage || "";
              const cond = item.condition || item.laptop?.condition || "Pre-Owned Tested";
              const warranty = item.warranty || item.laptop?.warranty || "30 Days Hardware Warranty";
              const price = item.quotedPrice || 0;
              const cost = item.purchasePrice || 0;

              return (
                <tr key={index}>
                  <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{index + 1}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13.5px" }}>
                      {brand} {model}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                      <span style={{ fontSize: "10.5px", padding: "2px 6px", backgroundColor: "#f1f5f9", borderRadius: "4px", color: "#334155", fontFamily: "var(--font-mono)" }}>
                        S/N: {serial}
                      </span>
                      {proc && (
                        <span style={{ fontSize: "10.5px", padding: "2px 6px", backgroundColor: "#f1f5f9", borderRadius: "4px", color: "#334155" }}>
                          {proc}
                        </span>
                      )}
                      {ram && (
                        <span style={{ fontSize: "10.5px", padding: "2px 6px", backgroundColor: "#f1f5f9", borderRadius: "4px", color: "#334155" }}>
                          {ram} RAM
                        </span>
                      )}
                      {storage && (
                        <span style={{ fontSize: "10.5px", padding: "2px 6px", backgroundColor: "#f1f5f9", borderRadius: "4px", color: "#334155" }}>
                          {storage}
                        </span>
                      )}
                      <span style={{ fontSize: "10.5px", padding: "2px 6px", backgroundColor: "#ecfdf5", borderRadius: "4px", color: "#065f46", fontWeight: 600 }}>
                        {cond}
                      </span>
                      <span style={{ fontSize: "10.5px", padding: "2px 6px", backgroundColor: "#eff6ff", borderRadius: "4px", color: "#1d4ed8", fontWeight: 600 }}>
                        {warranty}
                      </span>
                    </div>
                  </td>
                  {showAdminCosts && (
                    <td style={{ textAlign: "right", color: "#b45309", fontWeight: 600 }}>
                      {formatCurrency(cost)}
                    </td>
                  )}
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {formatCurrency(price)}
                  </td>
                  <td style={{ textAlign: "center" }}>1</td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                    {formatCurrency(price)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Bottom Terms & Totals Section */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "24px",
          borderTop: "1px solid #e2e8f0",
          paddingTop: "20px"
        }}>
          <div>
            <div style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "14px"
            }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#475569", marginBottom: "6px" }}>
                Commercial Terms & Notes
              </div>
              <ul style={{ fontSize: "11.5px", color: "#64748b", paddingLeft: "16px", lineHeight: "1.5" }}>
                <li>1. This quotation is a commercial price offer and not an invoice.</li>
                <li>2. Quoted prices are valid for {quotation.validityDays} days from date of issue and subject to physical stock.</li>
                <li>3. Certified pre-owned laptops include diagnostic report and stated warranty upon billing.</li>
                <li>4. Contact us at <strong>laptopguysales@gmail.com</strong> or <strong>+91 7795330943</strong> to convert this quote into an invoice.</li>
              </ul>
              {quotation.notes && (
                <div style={{
                  marginTop: "10px",
                  paddingTop: "8px",
                  borderTop: "1px dashed #cbd5e1",
                  fontSize: "12px",
                  color: "#1e293b"
                }}>
                  <strong>Special Notes:</strong> {quotation.notes}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Items Subtotal:</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{formatCurrency(quotation.subtotal)}</span>
              </div>
              {quotation.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                  <span>Quotation Discount:</span>
                  <span style={{ fontWeight: 700 }}>-{formatCurrency(quotation.discount)}</span>
                </div>
              )}
              <div style={{
                borderTop: "2px solid #0f172a",
                paddingTop: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline"
              }}>
                <span style={{ fontWeight: 800, fontSize: "15px", color: "#0f172a" }}>
                  Total Quoted Amount:
                </span>
                <span style={{ fontWeight: 900, fontSize: "20px", color: "#2563eb" }}>
                  {formatCurrency(quotation.totalQuotedAmount)}
                </span>
              </div>
            </div>

            {/* Signature Block */}
            <div style={{ textAlign: "right", marginTop: "32px" }}>
              <img
                src={sigImg}
                alt="Signature"
                style={{ height: "45px", objectFit: "contain", display: "inline-block", marginBottom: "4px" }}
              />
              <div style={{ borderTop: "1px solid #0f172a", paddingTop: "4px", fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                For {businessInfo?.businessName || "LAPTOP_GUY LAPTOPS AND COMPUTERS"}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Authorized Signatory / Sales Desk
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Quotation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Quotation"
        size="md"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "13.5px", color: "#334155" }}>
            Are you sure you want to delete Quotation <strong>#{quotation.quotationNumber}</strong>?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              style={{ backgroundColor: "#dc2626", color: "#ffffff", borderColor: "#dc2626" }}
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 size={15} />
              <span>{deleting ? "Deleting..." : "Delete Quotation"}</span>
            </button>
          </div>
        </div>
      </Modal>

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
