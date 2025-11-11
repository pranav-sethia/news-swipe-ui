import axios from 'axios';

const API_URL = 'http://localhost:4000';

const apiClient = axios.create({
  baseURL: API_URL,
});

// --- Interceptor ---
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Auth Functions ---
export const login = (email, password) => {
  return apiClient.post('/auth/login', { email, password });
};

export const register = (email, password) => {
  return apiClient.post('/auth/register', { email, password });
};

// --- App Functions ---
export const getFeed = async () => {
  const { data } = await apiClient.get('/api/feed');
  return data;
};

export const sendSwipe = (articleId, liked) => {
  return apiClient.post('/api/swipe', { articleId, liked });
};

export const resetSwipes = () => {
  return apiClient.post('/api/reset');
};

export const getStats = async () => {
  const { data } = await apiClient.get('/api/stats');
  return data;
};

// --- Liked Articles Function ---
export const getLikedArticles = async () => {
  const { data } = await apiClient.get('/api/liked-articles');
  return data;
};