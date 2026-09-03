import apiClient from "./axios";

export const getSetupStatus = async () => {
    const response = await apiClient.get("/auth/setup-status");
    return response.data;
};

export const login = async (credentials) => {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data;
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
    const response = await apiClient.post("/auth/logout");
    return response.data;
};

export const getMe = async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
};
