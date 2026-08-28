import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    },
    timeout: 15000
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = 
            error.response?.data?.message || 
            error.response?.data?.error || 
            error.message || 
            "An unexpected error occurred. Please try again.";
        return Promise.reject({ ...error, customMessage: message });
    }
);

export default apiClient;
export { API_BASE_URL };
