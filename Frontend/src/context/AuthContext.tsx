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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read cached user synchronously on mount so initial screen renders with 0ms delay
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem(CACHED_USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Never block guest users from seeing the public pages (e.g. Home, Splash, SignIn)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const updateCachedUser = (userData: User | null) => {
    setUser(userData);
    try {
      if (userData) {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(userData));
        if (userData.id || (userData as any)._id) {
          localStorage.setItem("streetbites_customer_id", userData.id || (userData as any)._id);
        }
      } else {
        localStorage.removeItem(CACHED_USER_KEY);
        localStorage.removeItem("streetbites_customer_id");
        localStorage.removeItem("streetbites_access_token");
      }
    } catch { }
  };

  // Helper event using useEffectEvent: sets the user data and turns off loading
  const handleSessionResult = useEffectEvent((userData: User | null) => {
    updateCachedUser(userData);
    setIsLoading(false);
  });

  // Check login status on first load in background (non-blocking)
  useEffect(() => {
    let isMounted = true;
    const checkUserSession = async () => {
      try {
        const res = await authService.getProfile();
        if (!isMounted) return;
        if (res.success && res.data?.user) {
          handleSessionResult(res.data.user);
        } else if (res.message && (res.message.includes("401") || res.message.includes("Unauthorized") || res.message.includes("Session expired"))) {
          handleSessionResult(null);
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
        updateCachedUser(res.data.user);
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
        updateCachedUser(res.data.user);
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
        updateCachedUser(res.data.user);
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
        updateCachedUser(res.data.user);
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
