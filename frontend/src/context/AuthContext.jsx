import React, { createContext, useContext, useState, useEffect } from "react";
import { login, logout, getMe } from "../api/authApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        setLoading(true);
        try {
            const data = await getMe();
            if (data && data.authenticated && data.email) {
                setUser({ email: data.email });
            } else {
                setUser(null);
            }
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const loginAdmin = async (email, password) => {
        const data = await login({ email, password });
        if (data && data.success) {
            setUser({ email: data.email });
        }
        return data;
    };

    const logoutAdmin = async () => {
        try {
            await logout();
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: Boolean(user),
                loading,
                loginAdmin,
                logoutAdmin,
                checkAuth
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
