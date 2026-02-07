import axios from 'axios';

const api = axios.create({
    baseURL: 'https://gpssaasplatform-production.up.railway.app/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the token
api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
