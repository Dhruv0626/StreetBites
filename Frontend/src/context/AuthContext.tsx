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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Helper event using useEffectEvent: sets the user data and turns off loading
  const handleSessionResult = useEffectEvent((userData: User | null) => {
    setUser(userData);
    setIsLoading(false);
  });

  // Check login status on first load
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const res = await authService.getProfile();
        if (res.success && res.data?.user) {
          handleSessionResult(res.data.user);
        } else {
          handleSessionResult(null);
        }
      } catch (err) {
        handleSessionResult(null);
      }
    };

    checkUserSession();
  }, []);

  // Login function
  const login = async (credentials: LoginPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.login(credentials);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        setIsLoading(false);
        return { success: true, role: res.data.user.role, user: res.data.user };
      } else {
        const msg = res.message || "Failed to sign in. Please check your credentials.";
        setError(msg);
        setIsLoading(false);
        return { success: false, message: msg };
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred during login.";
      setError(msg);
      setIsLoading(false);
      return { success: false, message: msg };
    }
  };

  // Register function
  const register = async (data: RegisterPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.register(data);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        // Explicitly set notifications and live location to disabled on new registration
        localStorage.setItem("streetbites_notifications_enabled", "false");
        localStorage.setItem("streetbites_location_enabled", "false");
        localStorage.setItem("streetbites_location_permission", "denied");
        setIsLoading(false);
        return { success: true, role: res.data.user.role };
      } else {
        const msg = res.message || "Registration failed. Please check the details.";
        setError(msg);
        setIsLoading(false);
        return { success: false, message: msg };
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred during registration.";
      setError(msg);
      setIsLoading(false);
      return { success: false, message: msg };
    }
  };

  // Google Login function
  const loginWithGoogle = async (tokenOrCode: { token?: string; id_token?: string; credential?: string; code?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.googleAuth(tokenOrCode);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        setIsLoading(false);
        return { success: true };
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
      setError(res.message || "Unable to initiate Google Authentication.");
    }
  };

  // Facebook Login function
  const loginWithFacebook = async (payload: { token?: string; code?: string; action?: 'signin' | 'signup' }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.facebookAuth(payload);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
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
      setError(res.message || "Unable to initiate Facebook Authentication.");
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    await authService.logout();
    setUser(null);
    setIsLoading(false);
  };

  // Refresh profile details
  const refreshProfile = async () => {
    const res = await authService.getProfile();
    if (res.success && res.data?.user) {
      setUser(res.data.user);
    }
  };

  // Update profile details (e.g. phone number)
  const updateProfile = async (data: { name?: string; phone_number?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.updateProfile(data);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
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
