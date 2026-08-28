import apiClient from "./axios";

export const getLaptops = async (params = {}) => {
    const response = await apiClient.get("/laptops", { params });
    return response.data;
};

export const getLaptopById = async (id) => {
    const response = await apiClient.get(`/laptops/${id}`);
    return response.data;
};

export const getLaptopBySerial = async (serialNumber) => {
    const response = await apiClient.get(`/laptops/serial/${serialNumber}`);
    return response.data;
};

export const createLaptop = async (laptopData) => {
    const response = await apiClient.post("/laptops", laptopData);
    return response.data;
};

export const updateLaptop = async (id, laptopData) => {
    const response = await apiClient.put(`/laptops/${id}`, laptopData);
    return response.data;
};

export const deleteLaptop = async (id) => {
    const response = await apiClient.delete(`/laptops/${id}`);
    return response.data;
};
