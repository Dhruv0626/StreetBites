// API Client with automatic Cookie credentials and silent Refresh Token rotation

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  timeoutMs?: number;
}

// Warm up server in background on initial page load (prevents Render cold-start delays)
export const wakeUpBackend = (): void => {
  try {
    const healthUrl = `${API_BASE_URL}/health`;
    fetch(healthUrl, { method: "GET", mode: "cors", credentials: "omit" }).catch(() => {});
  } catch {}
};

// Immediately invoke background wake-up
if (typeof window !== "undefined") {
  wakeUpBackend();
}

// Refresh token handler
let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

const subscribeTokenRefresh = (cb: (success: boolean) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (success: boolean) => {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
};

const refreshAuthTokens = async (): Promise<boolean> => {
  try {
    const storedRefreshToken = typeof window !== "undefined" ? localStorage.getItem("streetbites_refresh_token") : null;
    const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: storedRefreshToken ? JSON.stringify({ refreshToken: storedRefreshToken }) : undefined,
    });

    if (!res.ok) {
      return false;
    }

    const data = await res.json().catch(() => ({}));
    if (data && data.success && data.data?.accessToken) {
      if (typeof window !== "undefined") {
        localStorage.setItem("streetbites_access_token", data.data.accessToken);
        if (data.data.refreshToken) {
          localStorage.setItem("streetbites_refresh_token", data.data.refreshToken);
        }
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  [key: string]: any;
}

// Main API Request Wrapper with Timeout Protection
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { requiresAuth = true, headers = {}, timeoutMs = 15000, ...customConfig } = options;
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  const isValidToken = (t: string | null | undefined): t is string => {
    return Boolean(t && t !== "undefined" && t !== "null" && t !== "[object Object]" && t.trim().length > 20);
  };

  const storedCustomerId = typeof window !== "undefined" ? localStorage.getItem("streetbites_customer_id") : null;
  const storedToken = typeof window !== "undefined" ? localStorage.getItem("streetbites_access_token") : null;
  const storedRefreshToken = typeof window !== "undefined" ? localStorage.getItem("streetbites_refresh_token") : null;
  const configHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(isValidToken(storedToken) ? { Authorization: `Bearer ${storedToken}` } : {}),
    ...(isValidToken(storedRefreshToken) ? { "x-refresh-token": storedRefreshToken } : {}),
    ...(storedCustomerId && storedCustomerId !== "undefined" && storedCustomerId !== "null"
      ? { "x-customer-id": storedCustomerId, "x-user-id": storedCustomerId }
      : {}),
    ...(headers as Record<string, string>),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response = await fetch(url, {
      ...customConfig,
      headers: configHeaders,
      credentials: "include", // Automatically send/receive HTTP-only cookies
      signal: customConfig.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    // Pick up sliding session tokens from response headers
    if (typeof window !== "undefined") {
      const headerAccessToken = response.headers.get("x-access-token");
      const headerRefreshToken = response.headers.get("x-refresh-token");
      if (headerAccessToken) localStorage.setItem("streetbites_access_token", headerAccessToken);
      if (headerRefreshToken) localStorage.setItem("streetbites_refresh_token", headerRefreshToken);
    }

    // Handle 401 Token Expired -> Attempt refresh
    if (response.status === 401 && requiresAuth) {
      if (!isRefreshing) {
        isRefreshing = true;
        const refreshed = await refreshAuthTokens();
        isRefreshing = false;

        if (refreshed) {
          onRefreshed(true);
          // Retry original request with newly minted token
          const freshToken = typeof window !== "undefined" ? localStorage.getItem("streetbites_access_token") : null;
          const freshRefreshToken = typeof window !== "undefined" ? localStorage.getItem("streetbites_refresh_token") : null;
          const retryHeaders = {
            ...configHeaders,
            ...(freshToken ? { Authorization: `Bearer ${freshToken}` } : {}),
            ...(freshRefreshToken ? { "x-refresh-token": freshRefreshToken } : {}),
          };
          response = await fetch(url, {
            ...customConfig,
            headers: retryHeaders,
            credentials: "include",
          });
        } else {
          onRefreshed(false);
        }
      } else {
        const retryOriginalRequest = new Promise<Response>((resolve) => {
          subscribeTokenRefresh(async (refreshed: boolean) => {
            if (refreshed) {
              const freshToken = typeof window !== "undefined" ? localStorage.getItem("streetbites_access_token") : null;
              const freshRefreshToken = typeof window !== "undefined" ? localStorage.getItem("streetbites_refresh_token") : null;
              const retryHeaders = {
                ...configHeaders,
                ...(freshToken ? { Authorization: `Bearer ${freshToken}` } : {}),
                ...(freshRefreshToken ? { "x-refresh-token": freshRefreshToken } : {}),
              };
              const res = await fetch(url, {
                ...customConfig,
                headers: retryHeaders,
                credentials: "include",
              });
              resolve(res);
            } else {
              resolve(response);
            }
          });
        });
        response = await retryOriginalRequest;
      }
    }

    const resJson = await response.json().catch(() => ({}));

    if (typeof window !== "undefined") {
      const token = resJson?.data?.accessToken || resJson?.accessToken;
      const refToken = resJson?.data?.refreshToken || resJson?.refreshToken;
      if (token) localStorage.setItem("streetbites_access_token", token);
      if (refToken) localStorage.setItem("streetbites_refresh_token", refToken);
    }

    if (!response.ok) {
      return {
        success: false,
        message: resJson.message || `Request failed with status ${response.status}`,
        ...resJson,
      };
    }

    return resJson;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      return {
        success: false,
        message: "Server response timed out. Waking up backend, please retry in a moment.",
      };
    }
    // Suppress console spam for optional/initial auth verification
    if (!endpoint.includes("/auth/profile") && !endpoint.includes("/health")) {
      console.warn(`[API] ${endpoint}:`, error?.message || error);
    }
    return {
      success: false,
      message: error.message || "Network error. Please check your backend connection.",
    };
  }
}

// Convenient api object helper
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    }),
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};

export default apiRequest;
