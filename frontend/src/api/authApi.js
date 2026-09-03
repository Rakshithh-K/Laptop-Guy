import apiClient from "./axios";

export const getSetupStatus = async () => {
    const response = await apiClient.get("/auth/setup-status");
    return response.data;
};

export const login = async (credentials) => {
    const response = await apiClient.post("/auth/login", credentials);

    const data = response.data;

    // Store the JWT returned by the backend.
    // This allows authentication even when the browser
    // does not send the cross-origin cookie.
    if (data.success && data.token) {
        localStorage.setItem("authToken", data.token);
    }

    return data;
};

export const sendOtp = async (payload) => {
    const response = await apiClient.post("/auth/send-otp", payload);
    return response.data;
};

export const verifyOtp = async (payload) => {
    const response = await apiClient.post("/auth/verify-otp", payload);
    return response.data;
};

export const setPassword = async (payload) => {
    const response = await apiClient.post("/auth/set-password", payload);
    return response.data;
};

export const logout = async () => {
    try {
        const response = await apiClient.post("/auth/logout");
        return response.data;
    } finally {
        // Remove the JWT from the browser regardless
        // of whether the backend logout request succeeds.
        localStorage.removeItem("authToken");
    }
};

export const getMe = async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
};