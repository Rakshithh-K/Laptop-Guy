import apiClient, { API_BASE_URL } from "./axios";

export const getInvoices = async (params = {}) => {
    const response = await apiClient.get("/invoices", { params });
    return response.data;
};

export const getInvoiceById = async (id) => {
    const response = await apiClient.get(`/invoices/${id}`);
    return response.data;
};

export const createInvoice = async (invoiceData) => {
    const response = await apiClient.post("/invoices", invoiceData);
    return response.data;
};

export const getInvoicePdfUrl = (id) => {
    return `${API_BASE_URL}/invoices/${id}/pdf`;
};

export const downloadInvoicePdf = async (id, invoiceNumber) => {
    const response = await apiClient.get(`/invoices/${id}/pdf`, {
        responseType: "blob"
    });
    
    // Create a blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Invoice-${invoiceNumber || id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const sendInvoice = async (id) => {
    const response = await apiClient.post(`/invoices/${id}/send`);
    return response.data;
};
