import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Laptop, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authChecking, loginAdmin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authChecking && isAuthenticated) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authChecking, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await loginAdmin(email.trim(), password);
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.customMessage || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "#ffffff"
      }}>
        <div className="spinner" style={{ borderTopColor: "#3b82f6", width: "40px", height: "40px" }}></div>
        <p style={{ marginTop: "16px", fontSize: "14px", color: "#94a3b8", fontWeight: 600 }}>
          Verifying security credentials...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0f172a",
      backgroundImage: "radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(30, 41, 59, 0.5) 0px, transparent 50%)",
      padding: "24px 16px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "440px",
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        {/* Top Header Card */}
        <div style={{
          backgroundColor: "#0f172a",
          padding: "32px 28px 24px",
          textAlign: "center",
          borderBottom: "1px solid #1e293b"
        }}>
          <div style={{
            width: "52px",
            height: "52px",
            backgroundColor: "#2563eb",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
            boxShadow: "0 8px 16px rgba(37, 99, 235, 0.35)"
          }}>
            <Laptop size={28} color="#ffffff" />
          </div>

          <h1 style={{
            fontSize: "20px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.5px",
            marginBottom: "4px"
          }}>
            LAPTOP GUY
          </h1>
          <p style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 500 }}>
            Used Laptop Billing & Inventory Portal
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: "32px 28px 28px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
              Administrator Sign In
            </h2>
            <p style={{ fontSize: "12.5px", color: "#64748b" }}>
              Enter your authorized admin credentials to access the software.
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: "11px 14px",
              borderRadius: "8px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "13px",
              fontWeight: 600
            }}>
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="form-group" style={{ marginBottom: "18px" }}>
              <label className="form-label" style={{ fontSize: "13px", fontWeight: 600 }}>
                Admin Email Address
              </label>
              <div style={{ position: "relative" }}>
                <Mail 
                  size={17} 
                  color="#94a3b8" 
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} 
                />
                <input
                  type="email"
                  className="form-control"
                  placeholder="admin@example.com"
                  style={{ paddingLeft: "38px", height: "42px", fontSize: "14px" }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Password Field with Toggle */}
            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label className="form-label" style={{ fontSize: "13px", fontWeight: 600 }}>
                Admin Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock 
                  size={17} 
                  color="#94a3b8" 
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} 
                />
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="••••••••••••"
                  style={{ paddingLeft: "38px", paddingRight: "40px", height: "42px", fontSize: "14px" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center"
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{
                width: "100%",
                height: "44px",
                fontSize: "14.5px",
                fontWeight: 700,
                backgroundColor: "#2563eb",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="spinner" style={{ width: "18px", height: "18px", borderWidth: "2px", borderTopColor: "#ffffff" }}></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            marginTop: "24px",
            paddingTop: "18px",
            borderTop: "1px solid #f1f5f9",
            color: "#64748b",
            fontSize: "12px"
          }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Encrypted Single-Admin Session • Protected by JWT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
