import React, { createContext, useContext, useState, useEffect } from "react";
import authService, { type User, type RegisterPayload, type LoginPayload } from "../services/authService";
import { useEffectEvent } from "../hooks/useEffectEvent";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginPayload) => Promise<{ success: boolean; message?: string; role?: string; user?: User }>;
  register: (data: RegisterPayload) => Promise<{ success: boolean; message?: string; role?: string; user?: User }>;
  loginWithGoogle: (tokenOrCode: { token?: string; id_token?: string; credential?: string; code?: string; action?: 'signin' | 'signup' }) => Promise<{ success: boolean; message?: string; user?: User }>;
  redirectToGoogleAuth: (action?: 'signin' | 'signup', role?: string) => Promise<void>;
  loginWithFacebook: (payload: { token?: string; code?: string; action?: 'signin' | 'signup' }) => Promise<{ success: boolean; message?: string; user?: User }>;
  redirectToFacebookAuth: (action?: 'signin' | 'signup', role?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { name?: string; phone_number?: string }) => Promise<{ success: boolean; message?: string }>;
  clearError: () => void;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => ({ success: false, message: 'Not initialized' }),
  register: async () => ({ success: false, message: 'Not initialized' }),
  loginWithGoogle: async () => ({ success: false, message: 'Not initialized' }),
  redirectToGoogleAuth: async () => { },
  loginWithFacebook: async () => ({ success: false, message: 'Not initialized' }),
  redirectToFacebookAuth: async () => { },
  logout: async () => { },
  refreshProfile: async () => { },
  updateProfile: async () => ({ success: false, message: 'Not initialized' }),
  clearError: () => { },
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

const CACHED_USER_KEY = "streetbites_auth_user";

// Extract oauth_token and decode initial user claims synchronously on mount
let initialOAuthToken: string | null = null;
let initialUserFromToken: User | null = null;

if (typeof window !== "undefined") {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = searchParams.get("oauth_token");
    const refreshTokenFromUrl = searchParams.get("refresh_token");
    if (tokenFromUrl) {
      initialOAuthToken = tokenFromUrl;
      localStorage.setItem("streetbites_access_token", tokenFromUrl);
      if (refreshTokenFromUrl) {
        localStorage.setItem("streetbites_refresh_token", refreshTokenFromUrl);
      }

      // Synchronously decode token payload for immediate zero-delay identity hydration
      const base64Url = tokenFromUrl.split(".")[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const decoded = JSON.parse(jsonPayload);
        if (decoded?.id) {
          initialUserFromToken = {
            id: decoded.id,
            _id: decoded.id,
            name: decoded.name || "Customer",
            email: decoded.email || "",
            role: decoded.role || "CUSTOMER",
          };
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(initialUserFromToken));
          localStorage.setItem("streetbites_customer_id", decoded.id);
        }
      }
    }
  } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read cached user synchronously on mount so initial screen renders with 0ms delay
  const [user, setUser] = useState<User | null>(() => {
    if (initialUserFromToken) return initialUserFromToken;
    try {
      const cached = localStorage.getItem(CACHED_USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Start with loading = true when an OAuth token is being verified without pre-hydrated user
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (initialOAuthToken && !initialUserFromToken) return true;
    if (typeof window !== "undefined") {
      const hasStoredToken = Boolean(localStorage.getItem("streetbites_access_token"));
      const hasSessionCookie = typeof document !== "undefined" && document.cookie.includes("sb_auth_active");
      const hasCachedUser = Boolean(localStorage.getItem(CACHED_USER_KEY));
      if ((hasStoredToken || hasSessionCookie) && !hasCachedUser) {
        return true;
      }
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const updateCachedUser = (userData: User | null, accessToken?: string | null, refreshToken?: string | null) => {
    setUser(userData);
    try {
      if (userData) {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(userData));
        if (userData.id || (userData as any)._id) {
          localStorage.setItem("streetbites_customer_id", userData.id || (userData as any)._id);
        }
        if (accessToken) {
          localStorage.setItem("streetbites_access_token", accessToken);
        }
        if (refreshToken) {
          localStorage.setItem("streetbites_refresh_token", refreshToken);
        }
      } else {
        localStorage.removeItem(CACHED_USER_KEY);
        localStorage.removeItem("streetbites_customer_id");
        localStorage.removeItem("streetbites_access_token");
        localStorage.removeItem("streetbites_refresh_token");
      }
    } catch { }
  };

  // Helper event using useEffectEvent: sets the user data and turns off loading
  const handleSessionResult = useEffectEvent((userData: User | null, accessToken?: string | null, refreshToken?: string | null) => {
    updateCachedUser(userData, accessToken, refreshToken);
    setIsLoading(false);
  });

  // Check login status on first load in background (non-blocking)
  useEffect(() => {
    let isMounted = true;
    const checkUserSession = async () => {
      // Check if user has an active session before invoking protected profile call
      const hasOAuthToken = Boolean(initialOAuthToken);
      const hasSessionIndicator =
        hasOAuthToken ||
        (typeof window !== "undefined" && Boolean(localStorage.getItem(CACHED_USER_KEY))) ||
        (typeof window !== "undefined" && Boolean(localStorage.getItem("streetbites_access_token"))) ||
        (typeof document !== "undefined" && (document.cookie.includes("sb_auth_active") || document.cookie.includes("accessToken") || document.cookie.includes("token")));

      if (!hasSessionIndicator) {
        if (isMounted) setIsLoading(false);
        return;
      }

      // If redirected with oauth_token or refresh_token, clean the query parameters from URL cleanly without reload
      if (typeof window !== "undefined" && (window.location.search.includes("oauth_token") || window.location.search.includes("refresh_token"))) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("oauth_token");
        cleanUrl.searchParams.delete("refresh_token");
        window.history.replaceState({}, document.title, cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : "") + cleanUrl.hash);
      }

      try {
        const res = await authService.getProfile();
        if (!isMounted) return;
        if (res.success && res.data?.user) {
          handleSessionResult(res.data.user, (res.data as any)?.accessToken, (res.data as any)?.refreshToken);
        } else if (res.message && (res.message.includes("401") || res.message.includes("Unauthorized") || res.message.includes("Session expired"))) {
          // If profile call failed with 401, check if we still have tokens in localStorage or active user before resetting
          const hasStoredToken = typeof window !== "undefined" && Boolean(localStorage.getItem("streetbites_access_token"));
          if (!hasStoredToken) {
            handleSessionResult(null);
          } else {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        // In case of cold-start or offline, preserve existing cache or allow guest browsing
        if (isMounted) setIsLoading(false);
      }
    };

    checkUserSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Login function
  const login = async (credentials: LoginPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.login(credentials);
      if (res.success && res.data?.user) {
        updateCachedUser(res.data.user, (res.data as any)?.accessToken, (res.data as any)?.refreshToken);
        setIsLoading(false);
        return { success: true, role: res.data.user.role, user: res.data.user };
      } else {
        const msg = res.message || "Failed to sign in. Please check your credentials.";
        setError(msg);
        setIsLoading(false);
        return { success: false, message: msg, field: (res as any)?.field, data: res.data };
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred during login.";
      setError(msg);
      setIsLoading(false);
      return { success: false, message: msg, field: err?.field };
    }
  };

  // Register function
  const register = async (data: RegisterPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.register(data);
      if (res.success && res.data?.user) {
        updateCachedUser(res.data.user, (res.data as any)?.accessToken, (res.data as any)?.refreshToken);
        setIsLoading(false);
        return { success: true, role: res.data.user.role, user: res.data.user };
      } else {
        const msg = res.message || "Registration failed. Please check the details.";
        setError(msg);
        setIsLoading(false);
        return { success: false, message: msg, field: (res as any)?.field, data: res.data };
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred during registration.";
      setError(msg);
      setIsLoading(false);
      return { success: false, message: msg, field: err?.field };
    }
  };

  // Google Login function
  const loginWithGoogle = async (tokenOrCode: { token?: string; id_token?: string; credential?: string; code?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.googleAuth(tokenOrCode);
      if (res.success && res.data?.user) {
        updateCachedUser(res.data.user, (res.data as any)?.accessToken, (res.data as any)?.refreshToken);
        setIsLoading(false);
        return { success: true, user: res.data.user };
      } else {
        const msg = res.message || "Google sign-in failed.";
        setError(msg);
        setIsLoading(false);
        return { success: false, message: msg };
      }
    } catch (err: any) {
      const msg = err.message || "Google authentication error.";
      setError(msg);
      setIsLoading(false);
      return { success: false, message: msg };
    }
  };

  // Redirect to Google login or signup
  const redirectToGoogleAuth = async (action: 'signin' | 'signup' = 'signin', role: string = 'customer') => {
    const res = await authService.getGoogleAuthUrl(action, role);
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    } else {
      const msg = res.message || "Unable to initiate Google Authentication.";
      setError(msg);
      throw new Error(msg);
    }
  };

  // Facebook Login function
  const loginWithFacebook = async (payload: { token?: string; code?: string; action?: 'signin' | 'signup' }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.facebookAuth(payload);
      if (res.success && res.data?.user) {
        updateCachedUser(res.data.user, (res.data as any)?.accessToken, (res.data as any)?.refreshToken);
        setIsLoading(false);
        return { success: true, user: res.data.user };
      } else {
        const msg = res.message || "Facebook sign-in failed.";
        setError(msg);
        setIsLoading(false);
        return { success: false, message: msg };
      }
    } catch (err: any) {
      const msg = err.message || "Facebook authentication error.";
      setError(msg);
      setIsLoading(false);
      return { success: false, message: msg };
    }
  };

  // Redirect to Facebook login or signup
  const redirectToFacebookAuth = async (action: 'signin' | 'signup' = 'signin', role: string = 'customer') => {
    const res = await authService.getFacebookAuthUrl(action, role);
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    } else {
      const msg = res.message || "Unable to initiate Facebook Authentication.";
      setError(msg);
      throw new Error(msg);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch { }
    try {
      localStorage.removeItem('streetbites_cart_items_v4');
      localStorage.removeItem('streetbites_cart_khau_galli_v4');
      localStorage.removeItem('streetbites_cart_items_v2');
      localStorage.removeItem('streetbites_cart_items');
      localStorage.removeItem('streetbites_cart_khau_galli');
      localStorage.removeItem('streetbites_customer_id');
    } catch { }
    updateCachedUser(null);
    setIsLoading(false);
  };

  // Refresh profile details
  const refreshProfile = async () => {
    try {
      const res = await authService.getProfile();
      if (res.success && res.data?.user) {
        updateCachedUser(res.data.user);
      }
    } catch { }
  };

  // Update profile details (e.g. phone number)
  const updateProfile = async (data: { name?: string; phone_number?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.updateProfile(data);
      if (res.success && res.data?.user) {
        updateCachedUser(res.data.user);
        setIsLoading(false);
        return { success: true };
      } else {
        const msg = res.message || "Failed to update profile.";
        setError(msg);
        setIsLoading(false);
        return { success: false, message: msg };
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred.";
      setError(msg);
      setIsLoading(false);
      return { success: false, message: msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        loginWithGoogle,
        redirectToGoogleAuth,
        loginWithFacebook,
        redirectToFacebookAuth,
        logout,
        refreshProfile,
        updateProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
};

export default AuthContext;
