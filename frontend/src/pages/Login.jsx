import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  ArrowLeft,
  KeyRound,
  RefreshCw,
  Clock,
  Sparkles
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getSetupStatus, sendOtp, verifyOtp, setPassword as apiSetPassword } from "../api/authApi";
import logoImg from "../assets/logo.jpeg";

const ALLOWED_ADMIN_EMAIL = "laptopguysales@gmail.com";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authChecking, loginAdmin } = useAuth();

  // Mode: "LOGIN" | "REQUEST_OTP" | "VERIFY_OTP" | "SET_PASSWORD" | "SUCCESS"
  const [mode, setMode] = useState("LOGIN");
  const [purpose, setPurpose] = useState("RESET"); // "SETUP" | "RESET"

  // Form Fields
  const [email, setEmail] = useState(ALLOWED_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isConfigured, setIsConfigured] = useState(true);

  // OTP Timers
  const [countdown, setCountdown] = useState(300); // 5 min
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check setup status on load
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await getSetupStatus();
        if (res && res.success) {
          setIsConfigured(res.isConfigured);
          if (!res.isConfigured) {
            setPurpose("SETUP");
          }
        }
      } catch (err) {
        // Fallback silently
      }
    };
    checkStatus();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authChecking && isAuthenticated) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authChecking, navigate, location]);

  // Expiry Countdown Timer
  useEffect(() => {
    let timer;
    if (mode === "VERIFY_OTP" && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [mode, countdown]);

  // Resend Cooldown Timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 1. Handle Standard Password Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (trimmedEmail !== ALLOWED_ADMIN_EMAIL) {
      setError("Invalid email or password.");
      return;
    }

    setSubmitting(true);
    try {
      await loginAdmin(trimmedEmail, password);
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.data?.needsSetup) {
        setError("Admin password is not set yet. Please set your password first.");
        setIsConfigured(false);
      } else {
        setError(err.customMessage || "Invalid email or password");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Handle Sending OTP
  const handleSendOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMessage("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your admin email address.");
      return;
    }

    if (trimmedEmail !== ALLOWED_ADMIN_EMAIL) {
      setError(`Unauthorized email. Only ${ALLOWED_ADMIN_EMAIL} can access this portal.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await sendOtp({ email: trimmedEmail, purpose });
      setCountdown(res.expiresInSeconds || 300);
      setResendCooldown(60);
      setMode("VERIFY_OTP");
      setSuccessMessage(`A 6-digit verification code has been sent to ${ALLOWED_ADMIN_EMAIL}.`);
    } catch (err) {
      setError(err.customMessage || "Failed to send verification code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Handle Verifying OTP
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await verifyOtp({ email: email.trim().toLowerCase(), otp: trimmedOtp });
      setResetToken(res.resetToken);
      setMode("SET_PASSWORD");
      setSuccessMessage("Code verified! Please create your admin password.");
    } catch (err) {
      setError(err.customMessage || "Invalid or expired verification code.");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Handle Setting New Password
  const handleSetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiSetPassword({
        email: email.trim().toLowerCase(),
        resetToken,
        password,
        confirmPassword
      });
      setIsConfigured(true);
      setPassword("");
      setConfirmPassword("");
      setOtp("");
      setResetToken("");
      setMode("LOGIN");
      setSuccessMessage(res.message || "Password set successfully! Please sign in with your new password.");
    } catch (err) {
      setError(err.customMessage || "Failed to set password. Please request a new OTP.");
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
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0f172a",
      backgroundImage: "radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(30, 41, 59, 0.5) 0px, transparent 50%)",
      padding: "16px",
      boxSizing: "border-box"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "430px",
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        {/* Top Header */}
        <div style={{
          backgroundColor: "#0f172a",
          padding: "24px 20px 20px",
          textAlign: "center",
          borderBottom: "1px solid #1e293b"
        }}>
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            overflow: "hidden",
            margin: "0 auto 12px",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.15)"
          }}>
            <img 
              src={logoImg} 
              alt="Laptop Guy Logo" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            />
          </div>

          <h1 style={{
            fontSize: "19px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.5px",
            marginBottom: "3px"
          }}>
            LAPTOP GUY
          </h1>
          <p style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>
            Billing & Inventory Management Portal
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: "24px 20px 22px" }}>

          {/* Setup Alert Banner if no password set yet */}
          {!isConfigured && mode === "LOGIN" && (
            <div style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e40af",
              padding: "12px 14px",
              borderRadius: "10px",
              marginBottom: "18px",
              fontSize: "12.5px",
              lineHeight: 1.4
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, marginBottom: "4px" }}>
                <Sparkles size={15} color="#2563eb" />
                <span>Initial Admin Setup Required</span>
              </div>
              <p style={{ color: "#3b82f6", marginBottom: "8px" }}>
                No password is set yet for <strong>{ALLOWED_ADMIN_EMAIL}</strong>. Set your password via email OTP.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ width: "100%", justifyContent: "center", height: "34px", fontSize: "12.5px" }}
                onClick={() => {
                  setPurpose("SETUP");
                  setMode("REQUEST_OTP");
                  setError("");
                }}
              >
                Set Admin Password Now →
              </button>
            </div>
          )}

          {/* Error Message Alert */}
          {error && (
            <div style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: "10px 12px",
              borderRadius: "8px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12.5px",
              fontWeight: 600,
              wordBreak: "break-word"
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message Alert */}
          {successMessage && (
            <div style={{
              backgroundColor: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#047857",
              padding: "10px 12px",
              borderRadius: "8px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12.5px",
              fontWeight: 600,
              wordBreak: "break-word"
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ============================================================
              MODE 1: STANDARD PASSWORD LOGIN
             ============================================================ */}
          {mode === "LOGIN" && (
            <div>
              <div style={{ marginBottom: "18px" }}>
                <h2 style={{ fontSize: "16.5px", fontWeight: 700, color: "#0f172a", marginBottom: "3px" }}>
                  Administrator Sign In
                </h2>
                <p style={{ fontSize: "12.5px", color: "#64748b" }}>
                  Enter your credentials to manage bills and stock.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit}>
                {/* Email Field */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Admin Email Address
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail 
                      size={16} 
                      color="#94a3b8" 
                      style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} 
                    />
                    <input
                      type="email"
                      className="form-control"
                      placeholder={ALLOWED_ADMIN_EMAIL}
                      style={{ paddingLeft: "36px", height: "42px", fontSize: "13.5px", width: "100%", boxSizing: "border-box" }}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="username"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Password Field with Show/Hide Toggle */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#334155" }}>
                      Admin Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPurpose("RESET");
                        setMode("REQUEST_OTP");
                        setError("");
                        setSuccessMessage("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <Lock 
                      size={16} 
                      color="#94a3b8" 
                      style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} 
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="••••••••••••"
                      style={{ paddingLeft: "36px", paddingRight: "38px", height: "42px", fontSize: "13.5px", width: "100%", boxSizing: "border-box" }}
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
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    height: "44px",
                    fontSize: "14px",
                    fontWeight: 700,
                    marginTop: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", borderTopColor: "#ffffff" }}></div>
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              {/* First-time setup link */}
              <div style={{ textAlign: "center", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setPurpose("SETUP");
                    setMode("REQUEST_OTP");
                    setError("");
                    setSuccessMessage("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    fontSize: "12.5px",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  First-time user? Set admin password
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              MODE 2: REQUEST OTP (FORGOT / FIRST-TIME SETUP)
             ============================================================ */}
          {mode === "REQUEST_OTP" && (
            <div>
              <div style={{ marginBottom: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <KeyRound size={18} color="#2563eb" />
                  <h2 style={{ fontSize: "16.5px", fontWeight: 700, color: "#0f172a" }}>
                    {purpose === "SETUP" ? "Set Admin Password" : "Reset Admin Password"}
                  </h2>
                </div>
                <p style={{ fontSize: "12.5px", color: "#64748b" }}>
                  We will send a 6-digit verification code to the authorized administrator email.
                </p>
              </div>

              <form onSubmit={handleSendOtpSubmit}>
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Admin Email Address
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail 
                      size={16} 
                      color="#94a3b8" 
                      style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} 
                    />
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ paddingLeft: "36px", height: "42px", fontSize: "13.5px", width: "100%", boxSizing: "border-box" }}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    Only <strong>{ALLOWED_ADMIN_EMAIL}</strong> is authorized.
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    height: "44px",
                    fontSize: "14px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", borderTopColor: "#ffffff" }}></div>
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send 6-Digit Code</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                <div style={{ textAlign: "center", marginTop: "14px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("LOGIN");
                      setError("");
                      setSuccessMessage("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#64748b",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <ArrowLeft size={13} />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================
              MODE 3: VERIFY OTP
             ============================================================ */}
          {mode === "VERIFY_OTP" && (
            <div>
              <div style={{ marginBottom: "18px" }}>
                <h2 style={{ fontSize: "16.5px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Enter Verification Code
                </h2>
                <p style={{ fontSize: "12.5px", color: "#64748b" }}>
                  Please enter the 6-digit code sent to <strong style={{ color: "#0f172a" }}>{ALLOWED_ADMIN_EMAIL}</strong>.
                </p>
              </div>

              <form onSubmit={handleVerifyOtpSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="form-control"
                    placeholder="123456"
                    style={{
                      height: "46px",
                      fontSize: "22px",
                      fontWeight: 800,
                      letterSpacing: "8px",
                      textAlign: "center",
                      fontFamily: "var(--font-mono)",
                      color: "#2563eb",
                      width: "100%",
                      boxSizing: "border-box"
                    }}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                    required
                    disabled={submitting}
                  />
                </div>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  color: "#64748b",
                  marginBottom: "18px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={13} color={countdown <= 60 ? "#ef4444" : "#64748b"} />
                    <span style={{ color: countdown <= 60 ? "#ef4444" : "#64748b", fontWeight: 600 }}>
                      Expires in: {formatTimer(countdown)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendOtpSubmit}
                    disabled={resendCooldown > 0 || submitting}
                    style={{
                      background: "none",
                      border: "none",
                      color: resendCooldown > 0 ? "#94a3b8" : "#2563eb",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                      padding: 0
                    }}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    height: "44px",
                    fontSize: "14px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                  disabled={submitting || otp.length !== 6 || countdown <= 0}
                >
                  {submitting ? (
                    <>
                      <div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", borderTopColor: "#ffffff" }}></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Proceed</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                <div style={{ textAlign: "center", marginTop: "14px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("REQUEST_OTP");
                      setError("");
                      setSuccessMessage("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#64748b",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <ArrowLeft size={13} />
                    <span>Change Email / Back</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================
              MODE 4: SET NEW PASSWORD
             ============================================================ */}
          {mode === "SET_PASSWORD" && (
            <div>
              <div style={{ marginBottom: "18px" }}>
                <h2 style={{ fontSize: "16.5px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Create Admin Password
                </h2>
                <p style={{ fontSize: "12.5px", color: "#64748b" }}>
                  Set a strong password for <strong style={{ color: "#0f172a" }}>{ALLOWED_ADMIN_EMAIL}</strong>.
                </p>
              </div>

              <form onSubmit={handleSetPasswordSubmit}>
                {/* New Password */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    New Password (min 6 characters)
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock 
                      size={16} 
                      color="#94a3b8" 
                      style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} 
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="••••••••••••"
                      style={{ paddingLeft: "36px", paddingRight: "38px", height: "42px", fontSize: "13.5px", width: "100%", boxSizing: "border-box" }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={submitting}
                      autoFocus
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
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock 
                      size={16} 
                      color="#94a3b8" 
                      style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} 
                    />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="••••••••••••"
                      style={{ paddingLeft: "36px", paddingRight: "38px", height: "42px", fontSize: "13.5px", width: "100%", boxSizing: "border-box" }}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    height: "44px",
                    fontSize: "14px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", borderTopColor: "#ffffff" }}></div>
                      <span>Saving Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Password & Return to Login</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Security Notice */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            marginTop: "20px",
            paddingTop: "14px",
            borderTop: "1px solid #f1f5f9",
            color: "#64748b",
            fontSize: "11.5px",
            textAlign: "center"
          }}>
            <ShieldCheck size={14} color="#10b981" style={{ flexShrink: 0 }} />
            <span>Encrypted Single-Admin Session • Brevo Verified OTP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
