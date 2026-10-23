import React, { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { CheckCircle2, ChevronLeft, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import logoImg from '../../assets/Logo/Logo.png';
import SidePanelImg from '../../assets/images/hero_market.jpg';
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { useAuth } from '../../context/AuthContext';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, register, updateProfile, refreshProfile, redirectToGoogleAuth, redirectToFacebookAuth, error, clearError } = useAuth();

  const [role, setRole] = useState<string>('Customer');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    agreeTerms: false,
  });

  // 'form' for main registration, 'oauth_phone' only if OAuth user needs to add phone, 'completed' on success
  const [currentStep, setCurrentStep] = useState<'form' | 'oauth_phone' | 'completed'>('form');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // If redirected back from OAuth without a phone number, show the OAuth phone completion step
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam === 'phone' || (isAuthenticated && user?.role === 'CUSTOMER' && !user?.phone_number)) {
      setCurrentStep('oauth_phone');
    }
  }, [searchParams, isAuthenticated, user]);

  const clearErrors = () => {
    setFieldErrors({});
    setGeneralError(null);
    clearError();
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    clearErrors();
  };

  // Main Registration Submission (Name, Email, Mobile Number, Password)
  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearErrors();

    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.name = 'Please enter your full name.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Please enter your email address.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address (e.g. name@example.com).';
      }
    }

    const cleanPhone = formData.phone.trim().replace(/\D/g, '');
    if (!cleanPhone) {
      errors.phone = 'Please enter your 10-digit mobile number.';
    } else if (cleanPhone.length !== 10) {
      errors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    if (!formData.password) {
      errors.password = 'Please create a password.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (!formData.agreeTerms) {
      errors.agreeTerms = 'Please check this box to agree to our Terms and Privacy Policy.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await register({
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone_number: cleanPhone,
        role: role.toUpperCase(),
      });

      if (res.success) {
        setCurrentStep('completed');
        setTimeout(() => {
          if (role === 'Vendor') {
            navigate('/vendor/registration');
          } else if (role === 'Rider') {
            navigate('/rider/registration');
          } else {
            navigate('/home');
          }
        }, 1200);
      } else {
        const resData = res as any;
        if (resData.field) {
          setFieldErrors({ [resData.field]: res.message || 'Please check this field.' });
        } else {
          setGeneralError(res.message || 'Registration failed. Please check your information.');
        }
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Unable to connect to the server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // OAuth Missing Phone Number Submit
  const handleOAuthPhoneSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearErrors();

    const cleanPhone = formData.phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setFieldErrors({ phone: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const updateRes = await updateProfile({ phone_number: cleanPhone });
      if (updateRes.success) {
        await refreshProfile();
        setCurrentStep('completed');
        setTimeout(() => {
          if (user?.role === 'VENDOR' || role === 'Vendor') navigate('/vendor/registration');
          else if (user?.role === 'RIDER' || role === 'Rider') navigate('/rider/registration');
          else navigate('/home');
        }, 1000);
      } else {
        setGeneralError(updateRes.message || 'Failed to update phone number.');
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Network error connecting to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await redirectToGoogleAuth('signup', role.toLowerCase());
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to start Google sign-up.');
    }
  };

  const handleFacebookSignUp = async () => {
    try {
      await redirectToFacebookAuth('signup', role.toLowerCase());
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to start Facebook sign-up.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] flex flex-col font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-10">

        {/* Mobile Top Header */}
        <div className="w-full max-w-md md:max-w-5xl flex items-center justify-between mb-4 md:hidden">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full border border-stone-200 bg-white flex items-center justify-center text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-label text-[10px] font-semibold">
            CREATE ACCOUNT
          </span>
          <div className="w-10"></div>
        </div>

        <div className="w-full max-w-md md:max-w-5xl bg-white rounded-3xl md:border md:border-[#E8E2D7] md:shadow-xl overflow-hidden flex flex-col md:flex-row my-auto">

          {/* LEFT PANEL - Branding & Details */}
          <div
            className="hidden md:flex md:w-1/2 p-8 lg:p-10 flex-col justify-between border-r border-[#E8E2D7] relative overflow-hidden bg-cover bg-center z-0 before:content-[''] before:absolute before:inset-0 before:bg-[inherit] before:filter before:blur-xl before:scale-110 before:-z-20 after:content-[''] after:absolute after:inset-0 after:bg-white/75 after:-z-10"
            style={{ backgroundImage: `url(${SidePanelImg})` }}
          >
            <div className="relative z-10">
              {/* Logo */}
              <div className="flex items-center gap-3 mb-10">
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
                  CREATE YOUR ACCOUNT
                </span>
                <h2 className="text-3xl lg:text-4xl font-semibold leading-[1.15] text-[#1C1917] mt-2 mb-3">
                  Every cluster, <span className="text-accent">one cart.</span>
                </h2>
                <p className="text-stone-600 text-sm leading-relaxed mb-6">
                  Order from multiple street food stalls across Ahmedabad&apos;s iconic khau gallis — all in one cart, one checkout, one delivery.
                </p>
              </div>
            </div>

            {/* Left Footer Links */}
            <div className="relative z-10 pt-4 border-t border-stone-300/50 flex items-center gap-3 text-[11px] text-stone-500">
              <a href="#privacy" className="hover:text-stone-900 transition-colors">Privacy</a>
              <span>·</span>
              <a href="#terms" className="hover:text-stone-900 transition-colors">Terms</a>
              <span>·</span>
              <a href="#refund" className="hover:text-stone-900 transition-colors">Refund policy</a>
            </div>
          </div>

          {/* RIGHT PANEL - Registration Form */}
          <div className="w-full md:w-1/2 bg-[#FAF8F5] md:bg-white p-4 sm:p-6 md:p-8 lg:p-10 flex items-center justify-center">
            <div className="w-full">

              {/* Heading Section */}
              <div className="mb-4">
                <span className="hidden md:inline text-label text-xs text-stone-400 font-semibold">
                  {currentStep === 'oauth_phone' ? 'Complete Profile' : 'Sign up'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-semibold leading-tight text-[#1C1917] mt-1">
                  {currentStep === 'oauth_phone' ? (
                    <>
                      Add your <span className="text-[#E54B3C]">Mobile Number</span>
                    </>
                  ) : (
                    <>
                      One cart, <span className="text-accent">every stall.</span>
                    </>
                  )}
                </h2>
                {currentStep === 'oauth_phone' && (
                  <p className="text-stone-500 text-xs mt-1">
                    Please provide your 10-digit phone number to complete account setup.
                  </p>
                )}
              </div>

              {/* Role Tabs */}
              {currentStep === 'form' && (
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
              )}

              {/* Error Banner for General / System Errors */}
              {(generalError || error) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{generalError || error}</span>
                </div>
              )}

              {/* ─── Completed State ─── */}
              {currentStep === 'completed' && (
                <div className="bg-[#FAF7F2] border border-[#E8E2D7] text-stone-800 p-6 rounded-2xl text-center my-6 shadow-sm">
                  <CheckCircle2 className="w-10 h-10 text-[#E54B3C] mx-auto mb-2" />
                  <h3 className="font-display text-lg font-semibold">Account Created!</h3>
                  <p className="text-xs mt-1 text-stone-500">
                    {role === 'Customer'
                      ? 'Redirecting to your home page...'
                      : `Redirecting to ${role} Onboarding Form...`}
                  </p>
                </div>
              )}

              {/* ─── Main Registration Form (Includes Mobile Number Strictly) ─── */}
              {currentStep === 'form' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="fullName" className="block text-xs font-medium text-stone-600 mb-1">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      value={formData.fullName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setFormData({ ...formData, fullName: e.target.value });
                        if (fieldErrors.name || fieldErrors.fullName) {
                          setFieldErrors((prev) => ({ ...prev, name: '', fullName: '' }));
                        }
                      }}
                      className={`auth-input text-xs py-2.5 px-3.5 rounded-xl w-full transition-colors ${
                        fieldErrors.name || fieldErrors.fullName ? '!border-red-500 !ring-1 !ring-red-500/20' : ''
                      }`}
                      placeholder="Enter your name"
                      disabled={isSubmitting}
                    />
                    {(fieldErrors.name || fieldErrors.fullName) && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        <span>{fieldErrors.name || fieldErrors.fullName}</span>
                      </p>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label htmlFor="signup-email" className="block text-xs font-medium text-stone-600 mb-1">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: '' }));
                        }
                      }}
                      className={`auth-input text-xs py-2.5 px-3.5 rounded-xl w-full transition-colors ${
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

                  {/* Strictly Visible Mobile Number */}
                  <div>
                    <label htmlFor="signup-phone" className="block text-xs font-medium text-stone-600 mb-1">
                      Mobile number <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`relative flex items-center bg-white rounded-xl border transition-all overflow-hidden ${
                        fieldErrors.phone || fieldErrors.phone_number
                          ? 'border-red-500 ring-1 ring-red-500/20'
                          : 'border-[#E7E2D9] focus-within:border-[#E54B3C] focus-within:ring-3 focus-within:ring-[#E54B3C]/10'
                      }`}
                    >
                      <span className="absolute left-3.5 text-xs font-bold text-stone-500 pointer-events-none">
                        +91
                      </span>
                      <input
                        id="signup-phone"
                        name="phone"
                        type="tel"
                        maxLength={10}
                        autoComplete="tel"
                        required
                        value={formData.phone}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') });
                          if (fieldErrors.phone || fieldErrors.phone_number) {
                            setFieldErrors((prev) => ({ ...prev, phone: '', phone_number: '' }));
                          }
                        }}
                        style={{ paddingLeft: '3.2rem', paddingRight: '1rem' }}
                        className="w-full bg-transparent border-0 outline-none text-xs py-2.5 text-stone-800 font-semibold tracking-wide"
                        placeholder="9876543210"
                        disabled={isSubmitting}
                      />
                    </div>
                    {(fieldErrors.phone || fieldErrors.phone_number) && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        <span>{fieldErrors.phone || fieldErrors.phone_number}</span>
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="signup-password" className="block text-xs font-medium text-stone-600 mb-1">
                      Create password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="signup-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={formData.password}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setFormData({ ...formData, password: e.target.value });
                          if (fieldErrors.password) {
                            setFieldErrors((prev) => ({ ...prev, password: '' }));
                          }
                        }}
                        className={`auth-input text-xs py-2.5 pl-3.5 pr-10 rounded-xl w-full transition-colors ${
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
                    {fieldErrors.password ? (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        <span>{fieldErrors.password}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-stone-400 mt-0.5">Minimum 6 characters</p>
                    )}
                  </div>

                  {/* Terms checkbox */}
                  <div>
                    <div className="flex items-start gap-2.5 pt-0.5">
                      <input
                        type="checkbox"
                        id="agreeTerms"
                        name="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setFormData({ ...formData, agreeTerms: e.target.checked });
                          if (fieldErrors.agreeTerms) {
                            setFieldErrors((prev) => ({ ...prev, agreeTerms: '' }));
                          }
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-stone-300 text-[#E54B3C] focus:ring-[#E54B3C] cursor-pointer"
                      />
                      <label htmlFor="agreeTerms" className="text-[11px] text-stone-600 leading-tight">
                        I agree to the{' '}
                        <a href="#terms" className="text-[#D94A38] underline">
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="#privacy" className="text-[#D94A38] underline">
                          Privacy Policy
                        </a>
                      </label>
                    </div>
                    {fieldErrors.agreeTerms && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        <span>{fieldErrors.agreeTerms}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#E54B3C] hover:bg-[#D43B2C] disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-full border border-stone-200 transition-colors shadow-2xs cursor-pointer font-sans text-sm flex items-center justify-center gap-2 mt-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <span>
                        {role === 'Customer' ? 'Create Customer Account →' : `Register as ${role} →`}
                      </span>
                    )}
                  </button>
                </form>
              )}

              {/* ─── OAuth Missing Phone Step ─── */}
              {currentStep === 'oauth_phone' && (
                <form onSubmit={handleOAuthPhoneSubmit} className="space-y-4 animate-fadeIn">
                  <div>
                    <label htmlFor="oauth-phone" className="block text-xs font-medium text-stone-600 mb-1">
                      10-Digit Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`relative flex items-center bg-white rounded-xl border transition-all overflow-hidden ${
                        fieldErrors.phone
                          ? 'border-red-500 ring-1 ring-red-500/20'
                          : 'border-[#E7E2D9] focus-within:border-[#E54B3C] focus-within:ring-3 focus-within:ring-[#E54B3C]/10'
                      }`}
                    >
                      <span className="absolute left-4 text-xs font-bold text-stone-500 pointer-events-none">
                        +91
                      </span>
                      <input
                        id="oauth-phone"
                        name="phone"
                        type="tel"
                        maxLength={10}
                        autoComplete="tel"
                        required
                        autoFocus
                        value={formData.phone}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') });
                          if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                        }}
                        style={{ paddingLeft: '3.5rem', paddingRight: '1rem' }}
                        className="w-full bg-transparent border-0 outline-none text-sm py-3 text-stone-800 font-bold tracking-wider"
                        placeholder="98765 43210"
                        disabled={isSubmitting}
                      />
                    </div>
                    {fieldErrors.phone && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        <span>{fieldErrors.phone}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#E54B3C] hover:bg-[#D43B2C] disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-full border border-stone-200 transition-colors shadow-2xs cursor-pointer font-sans text-sm flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Complete Registration &rarr;</span>
                    )}
                  </button>
                </form>
              )}

              {/* Social Logins */}
              {currentStep === 'form' && (
                <>
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
                      onClick={handleGoogleSignUp}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-3 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium transition-all shadow-xs hover:border-stone-300 hover:shadow-sm active:scale-[0.99] cursor-pointer"
                    >
                      <FcGoogle size={19} className="shrink-0" />
                      <span>Continue with <b>Google</b></span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFacebookSignUp}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-3 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium transition-all shadow-xs hover:border-stone-300 hover:shadow-sm active:scale-[0.99] cursor-pointer"
                    >
                      <FaFacebook size={19} className="text-[#1877F2] shrink-0" />
                      <span>Continue with <b>Facebook</b></span>
                    </button>
                  </div>

                  {/* Link to Sign In */}
                  <p className="text-center text-xs text-stone-500 pt-5">
                    Already have an account?{' '}
                    <Link to="/signin" className="text-[#E54B3C] font-semibold hover:underline">
                      Sign in
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
