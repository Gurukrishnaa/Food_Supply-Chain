import axios from 'axios';

// Create a centralized Axios instance configured for the EC2 backend.
// This uses the environment variable VITE_EC2_API_URL.
// Example: VITE_EC2_API_URL="http://12.34.56.78:3000/api"
const api = axios.create({
  baseURL: import.meta.env.VITE_EC2_API_URL || 'http://localhost:3000/api', // fallback for local dev backend
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optionally, add interceptors here to handle authentication tokens or global errors
api.interceptors.request.use(
  (config) => {
    // Example: attach a token if needed
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Global error handling, e.g. redirect on 401 Unauthorized
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
