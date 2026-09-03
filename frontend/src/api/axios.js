import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    (
        window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
            ? "http://localhost:3000/api"
            : "https://name-laptop-billing-api.onrender.com/api"
    );

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json"
    },
    timeout: 20000
});

// Attach the JWT to every request when available.
// The backend accepts this through:
// Authorization: Bearer <token>
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("authToken");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle API errors consistently.
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const message =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            "An unexpected error occurred. Please try again.";

        return Promise.reject({
            ...error,
            customMessage: message
        });
    }
);

export default apiClient;
export { API_BASE_URL };