import axios, {
  type InternalAxiosRequestConfig,
  type AxiosError,
} from "axios";

// Base URL API
// - docker compose: VITE_API_BASE=http://backend:8000/api
// - dev local vite proxy: fallback "/api"
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const api = axios.create({
  baseURL: API_BASE, // Sử dụng proxy "/api" hoặc biến môi trường
  withCredentials: false,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==========================
// REQUEST INTERCEPTOR
// - Gắn Authorization: Bearer <authToken>
// ==========================
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("authToken"); // 🔁 đồng bộ với AuthContext.tsx
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
      console.log(`[API] Request to ${config.url} with token: ${token.substring(0, 20)}...`);
    } else {
      console.warn(`[API] Request to ${config.url} without token`);
      console.warn(`[API] localStorage.getItem('authToken'):`, localStorage.getItem('authToken'));
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==========================
// RESPONSE INTERCEPTOR
// - Nếu backend trả về 401 => xoá token local
// ==========================
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      // phiên đăng nhập hết hạn / token sai
      const token = localStorage.getItem("authToken");
      localStorage.removeItem("authToken");
      console.warn("[API] Unauthorized (401). Clearing authToken.");
      console.warn("[API] Request URL:", err.config?.url);
      console.warn("[API] Had token:", token ? token.substring(0, 20) + '...' : 'none');
      
      // Redirect to login nếu đang ở trang cần authentication
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        // Chỉ redirect nếu không phải đang ở trang login/register
        // (tránh redirect loop)
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
export { API_BASE };
