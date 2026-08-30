import apiClient from "./axios";

export const login = async (credentials) => {
    const response = await apiClient.post("/auth/login", credentials);
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
