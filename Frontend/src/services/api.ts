// API Client with automatic Cookie credentials and silent Refresh Token rotation

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
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
    const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) {
      return false;
    }

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error("Token refresh failed:", err);
    return false;
  }
};

// Main API Request Wrapper
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ success: boolean; data?: T; message?: string }> {
  const { requiresAuth = true, headers = {}, ...customConfig } = options;
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  const configHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  try {
    let response = await fetch(url, {
      ...customConfig,
      headers: configHeaders,
      credentials: "include", // Automatically send/receive HTTP-only cookies
    });

    // Handle 401 Token Expired -> Attempt refresh
    if (response.status === 401 && requiresAuth) {
      if (!isRefreshing) {
        isRefreshing = true;
        const refreshed = await refreshAuthTokens();
        isRefreshing = false;

        if (refreshed) {
          onRefreshed(true);
          // Retry original request
          response = await fetch(url, {
            ...customConfig,
            headers: configHeaders,
            credentials: "include",
          });
        } else {
          onRefreshed(false);
        }
      } else {
        const retryOriginalRequest = new Promise<Response>((resolve) => {
          subscribeTokenRefresh(async (refreshed: boolean) => {
            if (refreshed) {
              const res = await fetch(url, {
                ...customConfig,
                headers: configHeaders,
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

    if (!response.ok) {
      return {
        success: false,
        message: resJson.message || `Request failed with status ${response.status}`,
      };
    }

    return resJson;
  } catch (error: any) {
    console.error(`API Error on [${endpoint}]:`, error);
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
