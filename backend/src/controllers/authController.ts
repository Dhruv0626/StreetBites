import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import User, { type UserRole, type VerificationStatus } from "../models/User.ts";

const isProduction = process.env.NODE_ENV === "production";

// ─── Helpers ──────────────────────────────────────────────────────────

// Set secure HTTP-only cookies
export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// Clear auth cookies on logout
export const clearAuthCookies = (res: Response): void => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
};

// Generate Access & Refresh tokens
export const generateTokens = (userId: string, role: string) => {
  const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "";
  const refreshSecret = process.env.JWT_REFRESH_SECRET || "";

  const accessToken = jwt.sign({ id: userId, role }, accessSecret, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ id: userId, role }, refreshSecret, { expiresIn: "7d" });

  return { accessToken, refreshToken };
};

// Format user data for API responses
const formatUserResponse = (user: any) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone_number: user.phone_number,
  role: user.role,
  verification_status: user.verification_status,
  account_status: user.account_status,
  wallet_balance: user.wallet_balance || 0,
  avatar_url: user.avatar_url,
});

// ─── Controller Handlers ──────────────────────────────────────────────

// @desc    Register new user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone_number, role = "CUSTOMER", ...otherFields } = req.body || {};

    // Field-level validation with user-friendly messages
    if (!name || !String(name).trim()) {
      res.status(400).json({ success: false, field: "name", message: "Please enter your full name." });
      return;
    }

    if (!email || !String(email).trim()) {
      res.status(400).json({ success: false, field: "email", message: "Please enter your email address." });
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      res.status(400).json({ success: false, field: "email", message: "Please enter a valid email address." });
      return;
    }

    if (!password) {
      res.status(400).json({ success: false, field: "password", message: "Please create a password." });
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({ success: false, field: "password", message: "Password must be at least 6 characters long." });
      return;
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase() });
    if (existingUser) {
      res.status(400).json({ success: false, field: "email", message: "This email is already registered. Try signing in instead." });
      return;
    }

    if (phone_number) {
      const cleanPhone = String(phone_number).trim();
      if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
        res.status(400).json({ success: false, field: "phone", message: "Please enter a valid 10-digit mobile number." });
        return;
      }
      const existingPhone = await User.findOne({ phone_number: cleanPhone });
      if (existingPhone) {
        res.status(400).json({ success: false, field: "phone", message: "This mobile number is already linked to another account." });
        return;
      }
    }

    // Hash password with Argon2
    const hashedPassword = await argon2.hash(password);
    const userRole: UserRole = (role ? String(role).toUpperCase() : "CUSTOMER") as UserRole;

    // Enforce Admin Secret Key validation — exact match against ADMIN_SECRET_KEY in .env
    if (userRole === "ADMIN") {
      const serverAdminSecret = (process.env.ADMIN_SECRET_KEY || "").trim();
      const providedSecret = (req.body.secretKey || req.body.secret_key || req.body.SecretKey || "").trim();

      if (!providedSecret) {
        res.status(403).json({ success: false, field: "secretKey", message: "Please enter the Admin Secret Key." });
        return;
      }

      if (providedSecret !== serverAdminSecret) {
        res.status(403).json({ success: false, field: "secretKey", message: "The secret key you entered is incorrect. Please check with your administrator." });
        return;
      }
    }

    // For ADMIN role, verification_status is set to VERIFIED automatically (no KYC data entry required)
    const verificationStatus: VerificationStatus | undefined =
      userRole === "ADMIN" ? "VERIFIED" : undefined;

    const userData: any = {
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: hashedPassword,
      role: userRole,
      account_status: "ACTIVE",
    };

    if (verificationStatus) {
      userData.verification_status = verificationStatus;
    }

    if (phone_number && String(phone_number).trim()) {
      userData.phone_number = String(phone_number).trim();
    }

    const user: any = await User.create(userData);

    const { accessToken, refreshToken } = generateTokens(String(user._id), user.role);
    user.refresh_token = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      data: { user: formatUserResponse(user), accessToken },
    });
  } catch (error: any) {
    console.error("Register Error:", error);
    // Handle MongoDB duplicate key error (race condition: two simultaneous requests with same email/phone)
    if (error?.code === 11000) {
      const field = Object.keys(error?.keyValue || {})[0] || "email";
      const fieldMap: Record<string, { field: string; message: string }> = {
        email: { field: "email", message: "This email is already registered. Try signing in instead." },
        phone_number: { field: "phone", message: "This mobile number is already linked to another account." },
      };
      const info = fieldMap[field] || { field: "email", message: "An account with these details already exists." };
      res.status(400).json({ success: false, field: info.field, message: info.message });
      return;
    }
    // Handle Mongoose validation errors
    if (error?.name === "ValidationError") {
      const firstError = Object.entries(error.errors || {})[0];
      if (firstError) {
        const [fieldName, err]: [string, any] = firstError;
        const fieldMap: Record<string, string> = { name: "name", email: "email", password: "password", phone_number: "phone" };
        res.status(400).json({ success: false, field: fieldMap[fieldName] || fieldName, message: err.message });
        return;
      }
      res.status(400).json({ success: false, message: "Please check your input and try again." });
      return;
    }
    res.status(500).json({ success: false, message: "Something went wrong. Please try again in a moment." });
  }
};

// @desc    User Login
// @route   POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, phone_number } = req.body || {};

    if (!email && !phone_number) {
      res.status(400).json({ success: false, field: "email", message: "Please enter your email address." });
      return;
    }

    if (!password) {
      res.status(400).json({ success: false, field: "password", message: "Please enter your password." });
      return;
    }

    const query = email ? { email: String(email).toLowerCase() } : { phone_number };
    const user: any = await User.findOne(query).select("+password");

    if (!user || !user.password) {
      res.status(401).json({ success: false, field: "email", message: "No account found with this email. Please check or create a new account." });
      return;
    }

    // Verify Argon2 password
    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) {
      res.status(401).json({ success: false, field: "password", message: "Incorrect password. Please try again or reset your password." });
      return;
    }

    // If user is ADMIN, verify Admin Secret Key against .env ADMIN_SECRET_KEY
    if (user.role === "ADMIN") {
      const serverAdminSecret = (process.env.ADMIN_SECRET_KEY || "").trim();
      const providedSecret = (req.body.secretKey || req.body.secret_key || req.body.SecretKey || "").trim();

      if (!providedSecret) {
        res.status(403).json({ success: false, field: "secretKey", message: "Please enter the Admin Secret Key to access the console." });
        return;
      }

      if (providedSecret !== serverAdminSecret) {
        res.status(403).json({ success: false, field: "secretKey", message: "The secret key you entered is incorrect. Please check with your system administrator." });
        return;
      }
    }

    if (user.account_status === "SUSPENDED") {
      res.status(403).json({ success: false, message: "Your account has been suspended. Please contact support for assistance." });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(String(user._id), user.role);
    user.refresh_token = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: "Login successful!",
      data: { user: formatUserResponse(user), accessToken },
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Something went wrong. Please try again in a moment." });
  }
};

// @desc    Refresh Token
// @route   POST /api/auth/refresh-token
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(200).json({ success: false, message: "No active session." });
      return;
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET || "";
    let decoded: any;

    try {
      decoded = jwt.verify(refreshToken, refreshSecret);
    } catch {
      res.status(200).json({ success: false, message: "Session expired or invalid refresh token." });
      return;
    }

    const user: any = await User.findById(decoded.id).select("+refresh_token");
    if (!user || user.refresh_token !== refreshToken) {
      res.status(200).json({ success: false, message: "Session expired. Please log in again." });
      return;
    }

    const tokens = generateTokens(String(user._id), user.role);
    user.refresh_token = tokens.refreshToken;
    await user.save();

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.status(200).json({ success: true, message: "Tokens refreshed successfully." });
  } catch (error: any) {
    console.error("Refresh Error:", error);
    res.status(500).json({ success: false, message: "Failed to refresh token." });
  }
};

// Helper: fetch Google user from Google OAuth
const fetchGoogleProfile = async (googleToken?: string, code?: string) => {
  if (googleToken) {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(googleToken)}`);
    if (!res.ok) return null;
    const data: any = await res.json();
    return { email: data.email, name: data.name || data.email.split("@")[0], sub: data.sub, picture: data.picture };
  }

  if (code) {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: process.env.GOOGLE_CALLBACK_URL || "",
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) return null;
    const tokenData: any = await tokenRes.json();

    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) return null;
    const data: any = await userRes.json();
    return { email: data.email, name: data.name, sub: data.sub, picture: data.picture };
  }

  return null;
};

// @desc    Google Sign-In / Sign-Up API
// @route   POST /api/auth/google
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, id_token, credential, code, action = "signin" } = req.body || {};
    const googleUser = await fetchGoogleProfile(token || id_token || credential, code);

    if (!googleUser || !googleUser.email) {
      res.status(400).json({ success: false, message: "Google authentication failed." });
      return;
    }

    let user: any = await User.findOne({
      $or: [{ google_id: googleUser.sub }, { email: googleUser.email.toLowerCase() }],
    });

    if (!user) {
      // Option B: If attempting to sign in but account does not exist, reject!
      if (action === "signin") {
        res.status(404).json({
          success: false,
          message: "No account found with this Google email. Please create an account first.",
        });
        return;
      }

      // If action is signup, create account
      user = new User({
        name: googleUser.name,
        email: googleUser.email.toLowerCase(),
        google_id: googleUser.sub,
        role: "CUSTOMER",
        account_status: "ACTIVE",
      });
      await user.save();
    } else {
      if (!user.google_id) user.google_id = googleUser.sub;
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(String(user._id), user.role);
    user.refresh_token = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: action === "signup" ? "Google signup successful!" : "Google login successful!",
      data: { user: formatUserResponse(user) },
    });
  } catch (error: any) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ success: false, message: "Server error during Google auth." });
  }
};

// @desc    Google OAuth2 Callback redirect handler
// @route   GET /api/auth/google/callback
export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || "";
  try {
    const code = req.query.code as string;
    const rawState = (req.query.state as string) || "signin:customer";
    const [action, roleParam] = rawState.split(":");
    const targetRole = (roleParam || "CUSTOMER").toUpperCase() as UserRole;

    const googleUser = await fetchGoogleProfile(undefined, code);

    if (!googleUser || !googleUser.email) {
      res.redirect(`${clientUrl}/signin?error=${encodeURIComponent("Google authentication failed")}`);
      return;
    }

    let user: any = await User.findOne({
      $or: [{ google_id: googleUser.sub }, { email: googleUser.email.toLowerCase() }],
    });

    let isNewUser = false;

    if (!user) {
      // Option B: If user is on Sign In and does not have an account in database, redirect with error
      if (action === "signin") {
        res.redirect(
          `${clientUrl}/signin?error=${encodeURIComponent("No account found with this Google email. Please create an account first.")}`
        );
        return;
      }

      // If action is signup, create user account with specified role
      isNewUser = true;
      user = new User({
        name: googleUser.name,
        email: googleUser.email.toLowerCase(),
        google_id: googleUser.sub,
        role: targetRole,
        account_status: "ACTIVE",
      });
      await user.save();
    } else {
      if (!user.google_id) user.google_id = googleUser.sub;
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(String(user._id), user.role);
    user.refresh_token = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    // Role & Flow-based Navigation:
    const effectiveRole = (user.role || "CUSTOMER").toUpperCase();

    // If Customer signing up or missing mobile number -> redirect to enter mobile number
    if (effectiveRole === "CUSTOMER" && (isNewUser || !user.phone_number || action === "signup")) {
      if (!user.phone_number) {
        res.redirect(`${clientUrl}/signup?step=phone`);
        return;
      }
      res.redirect(`${clientUrl}/home`);
      return;
    }

    // If Vendor
    if (effectiveRole === "VENDOR") {
      if (!user.verification_status) {
        res.redirect(`${clientUrl}/vendor/registration`);
      } else {
        res.redirect(`${clientUrl}/vendor/Dashboard`);
      }
      return;
    }

    // If Rider
    if (effectiveRole === "RIDER") {
      if (!user.verification_status) {
        res.redirect(`${clientUrl}/rider/registration`);
      } else {
        res.redirect(`${clientUrl}/rider/Dashboard`);
      }
      return;
    }

    // If Admin
    if (effectiveRole === "ADMIN") {
      res.redirect(`${clientUrl}/admin/Dashboard`);
      return;
    }

    // Default Customer
    res.redirect(`${clientUrl}/home`);
  } catch (error: any) {
    console.error("Google Callback Error:", error);
    res.redirect(`${clientUrl}/signin?error=${encodeURIComponent("Server error during Google auth")}`);
  }
};

// ─── Facebook OAuth Helpers ──────────────────────────────────────────

const fetchFacebookProfile = async (accessToken?: string, code?: string) => {
  const clientId = (process.env.FACEBOOK_CLIENT_ID || "").trim();
  const clientSecret = (process.env.FACEBOOK_CLIENT_SECRET || "").trim();
  const redirectUri = (
    process.env.FACEBOOK_CALLBACK_URL ||
    ``
  ).trim();

  let token = accessToken;
  if (!token && code) {
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&client_secret=${clientSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) {
      console.error("Facebook token exchange error:", await tokenRes.text());
      return null;
    }
    const tokenData: any = await tokenRes.json();
    token = tokenData.access_token;
  }

  if (token) {
    const userRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${token}`
    );
    if (!userRes.ok) {
      console.error("Facebook user fetch error:", await userRes.text());
      return null;
    }
    const data: any = await userRes.json();
    return {
      email: data.email || `${data.id}@facebook.user`,
      name: data.name || "Facebook User",
      sub: data.id,
      picture: data.picture?.data?.url,
    };
  }

  return null;
};

// @desc    Facebook Sign-In / Sign-Up API (Direct Token / Mobile)
// @route   POST /api/auth/facebook
export const facebookAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, code, action = "signin" } = req.body || {};
    const fbUser = await fetchFacebookProfile(token, code);

    if (!fbUser || !fbUser.sub) {
      res.status(400).json({ success: false, message: "Facebook authentication failed." });
      return;
    }

    let user: any = await User.findOne({
      $or: [{ facebook_id: fbUser.sub }, { email: fbUser.email.toLowerCase() }],
    });

    if (!user) {
      if (action === "signin") {
        res.status(404).json({
          success: false,
          message: "No account found with this Facebook profile. Please create an account first.",
        });
        return;
      }

      user = new User({
        name: fbUser.name,
        email: fbUser.email.toLowerCase(),
        facebook_id: fbUser.sub,
        avatar_url: fbUser.picture,
        role: "CUSTOMER",
        account_status: "ACTIVE",
      });
      await user.save();
    } else {
      if (!user.facebook_id) user.facebook_id = fbUser.sub;
      if (!user.avatar_url && fbUser.picture) user.avatar_url = fbUser.picture;
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(String(user._id), user.role);
    user.refresh_token = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: action === "signup" ? "Facebook signup successful!" : "Facebook login successful!",
      data: { user: formatUserResponse(user) },
    });
  } catch (error: any) {
    console.error("Facebook Auth Error:", error);
    res.status(500).json({ success: false, message: "Server error during Facebook auth." });
  }
};

// @desc    Facebook OAuth2 Callback redirect handler
// @route   GET /api/auth/facebook/callback
export const facebookCallback = async (req: Request, res: Response): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || "";
  try {
    const code = req.query.code as string;
    const rawState = (req.query.state as string) || "signin:customer";
    const [action, roleParam] = rawState.split(":");
    const targetRole = (roleParam || "CUSTOMER").toUpperCase() as UserRole;

    const fbUser = await fetchFacebookProfile(undefined, code);

    if (!fbUser || !fbUser.sub) {
      res.redirect(`${clientUrl}/signin?error=${encodeURIComponent("Facebook authentication failed")}`);
      return;
    }

    let user: any = await User.findOne({
      $or: [{ facebook_id: fbUser.sub }, { email: fbUser.email.toLowerCase() }],
    });

    let isNewUser = false;

    if (!user) {
      if (action === "signin") {
        res.redirect(
          `${clientUrl}/signin?error=${encodeURIComponent(
            "No account found with this Facebook account. Please create an account first."
          )}`
        );
        return;
      }

      isNewUser = true;
      user = new User({
        name: fbUser.name,
        email: fbUser.email.toLowerCase(),
        facebook_id: fbUser.sub,
        avatar_url: fbUser.picture,
        role: targetRole,
        account_status: "ACTIVE",
      });
      await user.save();
    } else {
      if (!user.facebook_id) user.facebook_id = fbUser.sub;
      if (!user.avatar_url && fbUser.picture) user.avatar_url = fbUser.picture;
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(String(user._id), user.role);
    user.refresh_token = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    const effectiveRole = (user.role || "CUSTOMER").toUpperCase();

    if (effectiveRole === "CUSTOMER" && (isNewUser || !user.phone_number || action === "signup")) {
      if (!user.phone_number) {
        res.redirect(`${clientUrl}/signup?step=phone`);
        return;
      }
      res.redirect(`${clientUrl}/home`);
      return;
    }

    if (effectiveRole === "VENDOR") {
      if (isNewUser || action === "signup" || !user.verification_status) {
        res.redirect(`${clientUrl}/vendor/registration`);
      } else {
        res.redirect(`${clientUrl}/vendor/Dashboard`);
      }
      return;
    }

    if (effectiveRole === "RIDER") {
      if (isNewUser || action === "signup" || !user.verification_status) {
        res.redirect(`${clientUrl}/rider/registration`);
      } else {
        res.redirect(`${clientUrl}/rider/Dashboard`);
      }
      return;
    }

    if (effectiveRole === "ADMIN") {
      res.redirect(`${clientUrl}/admin/Dashboard`);
      return;
    }

    res.redirect(`${clientUrl}/home`);
  } catch (error: any) {
    console.error("Facebook Callback Error:", error);
    res.redirect(`${clientUrl}/signin?error=${encodeURIComponent("Server error during Facebook auth")}`);
  }
};

// @desc    Get Facebook OAuth2 URL
// @route   GET /api/auth/facebook/url
export const getFacebookAuthUrl = (req: Request, res: Response): void => {
  const rootUrl = "https://www.facebook.com/v19.0/dialog/oauth";
  const action = (req.query.action as string) || "signin";
  const role = (req.query.role as string) || "customer";

  const clientId = (process.env.FACEBOOK_CLIENT_ID || "").trim();
  const callbackUrl = (
    process.env.FACEBOOK_CALLBACK_URL ||
    ``
  ).trim();

  const state = `${action}:${role.toLowerCase()}`;

  const qs = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    state,
    scope: "email,public_profile",
    response_type: "code",
  });

  res.status(200).json({
    success: true,
    data: { url: `${rootUrl}?${qs.toString()}` },
  });
};

// @desc    Get Google OAuth2 URL
// @route   GET /api/auth/google/url
export const getGoogleAuthUrl = (req: Request, res: Response): void => {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const action = (req.query.action as string) || "signin"; // 'signin' or 'signup'
  const role = (req.query.role as string) || "customer"; // 'customer' | 'vendor' | 'rider'

  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const callbackUrl = (process.env.GOOGLE_CALLBACK_URL || ``).trim();

  // Combine action and role into state (e.g., 'signup:customer', 'signup:vendor', 'signin:customer')
  const state = `${action}:${role.toLowerCase()}`;

  const qs = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid profile email",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  res.status(200).json({
    success: true,
    data: { url: `${rootUrl}?${qs.toString()}` },
  });
};

// @desc    Logout & clear cookies
// @route   POST /api/auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const userId = (req as any).user?.id;

    if (userId) {
      await User.findByIdAndUpdate(userId, { refresh_token: null });
    } else if (refreshToken) {
      await User.findOneAndUpdate({ refresh_token: refreshToken }, { refresh_token: null });
    }

    clearAuthCookies(res);

    res.status(200).json({ success: true, message: "Logged out successfully." });
  } catch (error: any) {
    console.error("Logout Error:", error);
    res.status(500).json({ success: false, message: "Server error during logout." });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const user: any = await User.findById(userId).select("-password");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({ success: true, data: { user: formatUserResponse(user) } });
  } catch (error: any) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch profile." });
  }
};

// @desc    Update Current User Profile (e.g., mobile number, name, notification preferences)
// @route   PUT /api/auth/profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { phone_number, name, push_notifications, email_notifications } = req.body || {};
    const user: any = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    if (phone_number) {
      const cleanedPhone = String(phone_number).trim();
      const existingPhone = await User.findOne({ phone_number: cleanedPhone, _id: { $ne: userId } });
      if (existingPhone) {
        res.status(400).json({ success: false, message: "This phone number is already registered to another account." });
        return;
      }
      user.phone_number = cleanedPhone;
    }

    if (name) {
      user.name = String(name).trim();
    }

    if (push_notifications !== undefined) {
      user.push_notifications = Boolean(push_notifications);
    }

    if (email_notifications !== undefined) {
      user.email_notifications = Boolean(email_notifications);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: { user: formatUserResponse(user) },
    });
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to update profile." });
  }
};

// @desc    Forgot Password - Request Reset Link / OTP
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body || {};
    if (!email || !String(email).trim()) {
      res.status(400).json({ success: false, message: "Please provide your registered email address." });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // Graceful response for security
      res.status(200).json({
        success: true,
        message: "If an account with this email exists, a password reset link has been dispatched.",
      });
      return;
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.reset_password_token = resetToken;
    user.reset_password_expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    console.log(`🔑 [StreetBites Auth] Password Reset Code for ${cleanEmail}: ${resetToken}`);

    res.status(200).json({
      success: true,
      message: "Password reset instructions sent to your email.",
      resetToken,
    });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to process forgot password." });
  }
};

// @desc    Reset Password with New Credentials
// @route   POST /api/auth/reset-password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, token, password, newPassword } = req.body || {};
    const finalPassword = password || newPassword;

    if (!finalPassword || String(finalPassword).length < 6) {
      res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
      return;
    }

    let user: any = null;
    if (token) {
      user = await User.findOne({
        reset_password_token: String(token).trim(),
        reset_password_expires: { $gt: new Date() },
      });
    }

    if (!user && email) {
      user = await User.findOne({ email: String(email).trim().toLowerCase() });
    }

    if (!user) {
      res.status(400).json({ success: false, message: "Invalid or expired password reset request." });
      return;
    }

    user.password = await argon2.hash(finalPassword);
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Your password has been reset successfully. You can now sign in.",
    });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to reset password." });
  }
};

// @desc    User self-delete account
// @route   DELETE /api/auth/profile
export const deleteSelfAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    if (user.role === "VENDOR") {
      const Stall = (await import("../models/Stall.ts")).default;
      await Stall.updateMany({ user_id: user._id }, { status: "CLOSED", is_accepting_orders: false });
    }

    await User.findByIdAndDelete(userId);
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: "Account and associated data deleted successfully.",
    });
  } catch (error: any) {
    console.error("Delete Self Account Error:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to delete account." });
  }
};
// @desc    Get All Users with optional role and search filters (Admin)
// @route   GET /api/auth/users
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, search } = req.query;

    const filter: any = {};
    if (role && role !== "all") {
      filter.role = String(role).toUpperCase();
    }

    if (search && String(search).trim()) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      filter.$or = [
        { name: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
        { phone_number: { $regex: searchRegex } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    const formattedUsers = users.map((u: any) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      phone_number: u.phone_number,
      role: u.role,
      status: (u.account_status || "ACTIVE").toLowerCase(),
      verification_status: u.verification_status || "PENDING",
      joined: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "Recent",
    }));

    res.status(200).json({
      success: true,
      count: formattedUsers.length,
      data: formattedUsers,
    });
  } catch (error: any) {
    console.error("Get All Users Error:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to fetch users." });
  }
};

// @desc    Update User Account Status (Suspend / Activate) (Admin)
// @route   PUT /api/auth/users/:id/status
export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user: any = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    if (status) {
      user.account_status = String(status).toUpperCase();
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: `User status updated to ${user.account_status}`,
      data: { id: user._id, status: user.account_status.toLowerCase() },
    });
  } catch (error: any) {
    console.error("Update User Status Error:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to update user status." });
  }
};

// @desc    Delete User Account (Admin)
// @route   DELETE /api/auth/users/:id
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully.",
      data: { id },
    });
  } catch (error: any) {
    console.error("Delete User Error:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to delete user." });
  }
};
