import React, { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { ChevronLeft, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import logoImg from '../../assets/Logo/Logo.png';
import SidePanelImg from '../../assets/images/hero_market.jpg';
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { useAuth } from '../../context/AuthContext';
import { getRoleHomePath } from '../../components/auth/ProtectedRoute';

export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlError = searchParams.get('error');

  const { login, redirectToGoogleAuth, redirectToFacebookAuth, error, clearError } = useAuth();

  const [role, setRole] = useState<string>('Customer');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const clearErrors = () => {
    setFieldErrors({});
    setGeneralError(null);
    clearError();
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    clearErrors();
  };

  const handleSignInWithPassword = async (e: FormEvent) => {
    e.preventDefault();
    clearErrors();

    const errors: Record<string, string> = {};
    if (!email.trim()) {
      errors.email = 'Please enter your email address.';
    }

    if (!password) {
      errors.password = 'Please enter your password.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login({ email: email.trim(), password });

      if (res.success) {
        const destination = getRoleHomePath(res.user || { role: res.role || role });
        navigate(destination);
      } else {
        const resData = res as any;
        if (resData.field) {
          setFieldErrors({ [resData.field]: res.message || 'Please check this field.' });
        } else {
          setGeneralError(res.message || 'Login failed. Please verify your credentials.');
        }
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Unable to connect to the backend server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await redirectToGoogleAuth('signin', role.toLowerCase());
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to start Google sign-in.');
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      await redirectToFacebookAuth('signin', role.toLowerCase());
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to start Facebook sign-in.');
    }
  };

  const displayGeneralError = urlError || generalError || error;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] flex flex-col font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-10">
        {/* Back Button and Screen Header for Mobile */}
        <div className="w-full max-w-md md:max-w-5xl flex items-center justify-between mb-6 md:hidden">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full border border-stone-200 bg-white flex items-center justify-center text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-label text-[10px] font-semibold">
            SIGN IN
          </span>
          <div className="w-10"></div>
        </div>

        <div className="w-full max-w-md md:max-w-5xl rounded-3xl md:border md:border-[#E8E2D7] md:shadow-xl overflow-hidden flex flex-col md:flex-row my-auto">
          {/* LEFT PANEL - Branding & Details */}
          <div
            className="hidden md:flex md:w-1/2 p-8 lg:p-10 flex-col justify-between border-r border-[#E8E2D7] relative overflow-hidden bg-cover bg-center z-0 before:content-[''] before:absolute before:inset-0 before:bg-[inherit] before:filter before:blur-xl before:scale-110 before:-z-20 after:content-[''] after:absolute after:inset-0 after:bg-white/75 after:-z-10"
            style={{ backgroundImage: `url(${SidePanelImg})` }}
          >
            <div className="relative z-10">
              {/* Logo */}
              <div className="flex items-center gap-3 mb-12">
                <Link to="/" className="w-10 h-10 rounded-lg text-white font-display flex items-center justify-center font-bold text-xl shadow-md hover:opacity-90 transition-opacity">
                  <img src={logoImg} alt="Logo" className="w-full h-full object-cover rounded-full" />
                </Link>
                <div>
                  <h1 className="font-bold text-lg leading-none text-[#1C1917]">
                    Street<span className="text-[#D94A38]">Bites</span>
                  </h1>
                  <p className="text-label text-[10px] mt-1">
                    KHAU GALLI · AHMEDABAD
                  </p>
                </div>
              </div>

              {/* Tag & Heading */}
              <div className="max-w-xl">
                <span className="text-label text-xs text-[#8E8B85] font-medium">
                  WELCOME BACK
                </span>
                <h2 className="text-3xl lg:text-4xl font-semibold leading-[1.15] text-[#1C1917] mt-2 mb-3">
                  Welcome back to <span className="text-[#1C1917] font-bold">Street<span className="text-[#D94A38]">Bites</span></span>
                </h2>
                <p className="text-stone-600 text-sm leading-relaxed mb-6">
                  Your favourite khau gallis, one unified cart. Pick up right where you left off — your saved stalls and past orders are waiting.
                </p>

                {/* Bullet Features */}
                <div className="space-y-2.5 pl-1">
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E54B3C] mt-1.5 shrink-0" />
                    <p className="text-xs sm:text-sm text-stone-700 font-medium">
                      Order from multiple stalls across any cluster in one Flow
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E54B3C] mt-1.5 shrink-0" />
                    <p className="text-xs sm:text-sm text-stone-700 font-medium">
                      Single delivery fee per cluster
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E54B3C] mt-1.5 shrink-0" />
                    <p className="text-xs sm:text-sm text-stone-700 font-medium">
                      Track your rider in real-time from pickup to doorstep
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-6 text-[11px] text-stone-500 border-t border-stone-300/50">
              © 2026 StreetBites
            </div>
          </div>

          {/* RIGHT PANEL - Sign In Form */}
          <div className="w-full md:w-1/2 bg-[#FAF8F5] md:bg-white p-4 sm:p-6 md:p-8 lg:p-10 flex items-center justify-center">
            <div className="w-full">
              {/* Heading Section */}
              <div className="mb-4">
                <span className="hidden md:inline text-label text-xs text-stone-400 font-semibold">
                  WELCOME BACK
                </span>
                <h2 className="text-3xl font-semibold leading-tight text-[#1C1917] mt-1">
                  Sign in to,
                  <span className="text-accent"> StreetBites</span>
                </h2>
              </div>

              {/* Role Tabs */}
              <div className="bg-[#EFEADF] p-1 rounded-full flex items-center mb-4">
                {['Customer', 'Vendor', 'Rider'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${role === r
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Error Banner for General / System Errors */}
              {displayGeneralError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{displayGeneralError}</span>
                  </div>
                  {displayGeneralError.toLowerCase().includes('register first') && (
                    <Link
                      to={`/signup?role=${role.toLowerCase()}`}
                      className="font-bold underline text-red-800 hover:text-red-950 shrink-0 ml-2"
                    >
                      Register Now
                    </Link>
                  )}
                </div>
              )}

              {/* Email / Password Sign In */}
              <form onSubmit={handleSignInWithPassword} className="space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-stone-600 mb-1">
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    className={`auth-input text-xs py-3 px-4 rounded-xl w-full transition-colors ${
                      fieldErrors.email ? '!border-red-500 !ring-1 !ring-red-500/20' : ''
                    }`}
                    placeholder="you@gmail.com"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="block text-xs font-medium text-stone-600">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-[#D94A38] font-semibold hover:underline"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }}
                      className={`auth-input text-xs py-3 pl-4 pr-10 rounded-xl w-full transition-colors ${
                        fieldErrors.password ? '!border-red-500 !ring-1 !ring-red-500/20' : ''
                      }`}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer p-1"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#E54B3C] hover:bg-[#D43B2C] disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-full border border-stone-200 transition-colors shadow-2xs cursor-pointer font-sans text-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign in as {role}</span>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-stone-400 font-medium">or continue with</span>
                </div>
              </div>

              {/* Social Logins */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium transition-all shadow-xs hover:border-stone-300 hover:shadow-sm active:scale-[0.99] cursor-pointer"
                >
                  <FcGoogle size={19} className="shrink-0" />
                  <span>Continue with <b>Google</b></span>
                </button>
                <button
                  type="button"
                  onClick={handleFacebookSignIn}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium transition-all shadow-xs hover:border-stone-300 hover:shadow-sm active:scale-[0.99] cursor-pointer"
                >
                  <FaFacebook size={19} className="text-[#1877F2] shrink-0" />
                  <span>Continue with <b>Facebook</b></span>
                </button>
              </div>

              {/* Link to Register */}
              <p className="text-center text-xs text-stone-500 pt-5">
                New here?{' '}
                <Link to="/signup" className="text-[#E54B3C] font-semibold hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
