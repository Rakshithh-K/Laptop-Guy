import apiClient from "./axios";

export const getCustomers = async (params = {}) => {
    const response = await apiClient.get("/customers", { params });
    return response.data;
};

export const getCustomerById = async (id) => {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
};

export const createCustomer = async (customerData) => {
    const response = await apiClient.post("/customers", customerData);
    return response.data;
};

export const updateCustomer = async (id, customerData) => {
    const response = await apiClient.put(`/customers/${id}`, customerData);
    return response.data;
};

export const deleteCustomer = async (id) => {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
};
