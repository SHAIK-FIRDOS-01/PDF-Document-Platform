import axios from 'axios';

const ACCESS_TOKEN_KEY = 'pdf_platform_access_token';
const REFRESH_TOKEN_KEY = 'pdf_platform_refresh_token';

export const getStoredAccessToken = () => {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getStoredRefreshToken = () => {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredTokens = (access, refresh) => {
  try {
    if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  } catch {
    // localStorage might be unavailable or restricted
  }
};

export const clearStoredTokens = () => {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
};

const rawBaseURL = import.meta.env.VITE_API_URL || '';
const cleanBaseURL = rawBaseURL.replace(/\/+$/, '');

/**
 * Preconfigured Axios instance enforcing both HttpOnly cookie rotation
 * and Authorization Bearer header support for cross-origin deployments.
 */
const api = axios.create({
  baseURL: cleanBaseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization Bearer header if access token exists in storage
api.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Event listener mechanism for 401 unauthorized session expiration
const authListeners = new Set();

export const subscribeToAuthFailure = (callback) => {
  authListeners.add(callback);
  return () => authListeners.delete(callback);
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt token refresh for auth endpoints or if already retried
    const isAuthRoute =
      originalRequest?.url?.includes('/api/auth/login/') ||
      originalRequest?.url?.includes('/api/auth/register/') ||
      originalRequest?.url?.includes('/api/auth/refresh/') ||
      originalRequest?.url?.includes('/api/auth/logout/');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (newToken) {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefresh = getStoredRefreshToken();
        // Send refresh token in request body as well as cookie
        const refreshResponse = await api.post('/api/auth/refresh/', {
          refresh: storedRefresh,
        });

        const newAccess =
          refreshResponse.data?.access || refreshResponse.data?.tokens?.access;
        const newRefresh =
          refreshResponse.data?.refresh || refreshResponse.data?.tokens?.refresh;

        if (newAccess) {
          setStoredTokens(newAccess, newRefresh || storedRefresh);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }

        processQueue(null, newAccess);
        return api(originalRequest);
      } catch (refreshError) {
        clearStoredTokens();
        processQueue(refreshError, null);
        authListeners.forEach((callback) => callback(refreshError));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // If persistent 401 on retried request, notify listeners to clear session
    if (error.response?.status === 401 && originalRequest?._retry && !isAuthRoute) {
      clearStoredTokens();
      authListeners.forEach((callback) => callback(error));
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: async ({ email, password }) => {
    const response = await api.post('/api/auth/login/', { email, password });
    const access = response.data?.access || response.data?.tokens?.access;
    const refresh = response.data?.refresh || response.data?.tokens?.refresh;
    if (access) {
      setStoredTokens(access, refresh);
    }
    return response.data;
  },
  register: async ({ email, password, role }) => {
    const response = await api.post('/api/auth/register/', { email, password, role });
    const access = response.data?.access || response.data?.tokens?.access;
    const refresh = response.data?.refresh || response.data?.tokens?.refresh;
    if (access) {
      setStoredTokens(access, refresh);
    }
    return response.data;
  },
  logout: async () => {
    try {
      const storedRefresh = getStoredRefreshToken();
      await api.post('/api/auth/logout/', { refresh: storedRefresh });
    } catch {
      // ignore network errors on logout
    } finally {
      clearStoredTokens();
    }
    return { success: true };
  },
  getMe: async () => {
    const response = await api.get('/api/auth/me/');
    return response.data;
  },
  refreshToken: async () => {
    const storedRefresh = getStoredRefreshToken();
    const response = await api.post('/api/auth/refresh/', { refresh: storedRefresh });
    const access = response.data?.access || response.data?.tokens?.access;
    const refresh = response.data?.refresh || response.data?.tokens?.refresh;
    if (access) {
      setStoredTokens(access, refresh);
    }
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.put('/api/auth/profile/', data);
    return response.data;
  },
  changePassword: async ({ old_password, new_password }) => {
    const response = await api.post('/api/auth/change-password/', { old_password, new_password });
    return response.data;
  },
  getLoginHistory: async () => {
    const response = await api.get('/api/auth/history/');
    return response.data;
  },
};

export default api;
