/**
 * api.ts — Shared axios instance for the admin panel
 * Automatically attaches X-Admin-Key header to every request.
 * Import this instead of raw axios in all pages.
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
        config.headers['X-Admin-Key'] = token;
    }
    return config;
});

// Response interceptor: log errors in dev
api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            window.dispatchEvent(new Event('unauthorized'));
        }
        if (import.meta.env.DEV) {
            console.warn('[API Error]', err.config?.url, err.response?.status, err.response?.data);
        }
        return Promise.reject(err);
    }
);

export default api;
export const API = API_BASE;
