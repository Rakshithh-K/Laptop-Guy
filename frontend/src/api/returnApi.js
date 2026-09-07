import apiClient from "./axios";

// Process a product return
export const createReturn = async (returnData) => {
    const response = await apiClient.post("/returns", returnData);
    return response.data;
};

// Get all returns with search and filters
export const getReturns = async (params = {}) => {
    const response = await apiClient.get("/returns", { params });
    return response.data;
};

// Get single return by ID
export const getReturnById = async (id) => {
    const response = await apiClient.get(`/returns/${id}`);
    return response.data;
};

// Get returns for a specific invoice
export const getInvoiceReturns = async (invoiceId) => {
    const response = await apiClient.get(`/returns/invoice/${invoiceId}`);
    return response.data;
};
