import apiClient from "./axios";

export const getDashboardStats = async () => {
    const response = await apiClient.get("/dashboard/stats");
    return response.data;
};

export const getProfitAnalytics = async () => {
    const response = await apiClient.get("/dashboard/profit");
    return response.data;
};

export const getInvestmentAnalytics = async () => {
    const response = await apiClient.get("/dashboard/investment");
    return response.data;
};

export const getBusinessInfo = async () => {
    const response = await apiClient.get("/business-info");
    return response.data;
};
