import apiClient, { API_BASE_URL } from "./axios";

export const getQuotations = async (params = {}) => {
    const response = await apiClient.get("/quotations", { params });
    return response.data;
};

export const getQuotationById = async (id) => {
    const response = await apiClient.get(`/quotations/${id}`);
    return response.data;
};

export const createQuotation = async (quotationData) => {
    const response = await apiClient.post("/quotations", quotationData);
    return response.data;
};

export const getQuotationPdfUrl = (id) => {
    return `${API_BASE_URL}/quotations/${id}/pdf`;
};

export const downloadQuotationPdf = async (id, quotationNumber) => {
    const response = await apiClient.get(`/quotations/${id}/pdf`, {
        responseType: "blob"
    });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Quotation-${quotationNumber || id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const updateQuotationStatus = async (id, status) => {
    const response = await apiClient.put(`/quotations/${id}/status`, { status });
    return response.data;
};

export const deleteQuotation = async (id) => {
    const response = await apiClient.delete(`/quotations/${id}`);
    return response.data;
};
