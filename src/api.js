import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://news-swipe-api.onrender.com';

const apiClient = axios.create({ baseURL: API_URL });

// --- Interceptor ---
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Auth ---
export const login = (email, password) => apiClient.post('/auth/login', { email, password });
export const register = (email, password) => apiClient.post('/auth/register', { email, password });
export const loginAsGuest = () => apiClient.post('/auth/guest');

// --- Feed ---
export const getFeed = async () => { const { data } = await apiClient.get('/api/feed'); return data; };
export const sendSwipe = (articleId, liked) => apiClient.post('/api/swipe', { articleId, liked });
export const unlikeArticle = (articleId) => apiClient.delete(`/api/swipe/${articleId}`);
export const resetSwipes = () => apiClient.post('/api/reset');

// --- Stats & Likes ---
export const getStats = async () => { const { data } = await apiClient.get('/api/stats'); return data; };
export const getLikedArticles = async () => { const { data } = await apiClient.get('/api/liked-articles'); return data; };