import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100vh",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                fontFamily: "var(--font-sans)"
            }}>
                <div className="spinner" style={{ borderTopColor: "#3b82f6", width: "42px", height: "42px" }}></div>
                <p style={{ marginTop: "18px", fontSize: "14px", color: "#94a3b8", fontWeight: 600 }}>
                    Authenticating Laptop Guy Admin...
                </p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
