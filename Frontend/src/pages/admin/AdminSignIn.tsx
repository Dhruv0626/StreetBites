import React, { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { ChevronLeft, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import logoImg from '../../assets/Logo/Logo.png';
import { useAuth } from '../../context/AuthContext';

export const AdminSignIn: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [SecretKey, setSecretKey] = useState<string>('');
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);
  const [trustDevice, setTrustDevice] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await login({
        email: email.trim(),
        password,
        secretKey: SecretKey.trim(),
      });
      if (res.success) {
        navigate('/admin/Dashboard');
      } else {
        setErrorMsg(res.message || 'Admin authentication failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server connection error.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            ADMIN CONSOLE
          </span>
          <div className="w-10"></div>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-md md:max-w-5xl bg-white rounded-3xl md:border md:border-[#E8E2D7] md:shadow-xl overflow-hidden flex flex-col md:flex-row my-auto">
          {/* LEFT PANEL - Admin Console Dark Theme */}
          <div className="hidden md:flex md:w-1/2 bg-black text-white p-8 lg:p-10 flex-col justify-between border-r border-stone-850 relative overflow-hidden">
            <div>
              {/* Dark Logo */}
              <div className="flex items-center gap-3 mb-12">
                <Link to="/" className="w-10 h-10 rounded-lg text-white font-display flex items-center justify-center font-bold text-xl shadow-md hover:opacity-90 transition-opacity">
                  <img src={logoImg} alt="Logo" className="w-full h-full object-cover rounded-full" />
                </Link>
                <div>
                  <h1 className="font-bold text-lg leading-none text-white">
                    Street<span className="text-[#D94A38]">Bites</span>
                  </h1>
                  <p className="text-label text-[10px] text-stone-400 mt-1">
                    KHAU GALLI · AHMEDABAD
                  </p>
                </div>
              </div>

              {/* Tag & Heading */}
              <div className="max-w-xl">
                <span className="text-label text-xs text-stone-400 font-medium">
                  RESTRICTED
                </span>
                <h2 className="text-3xl lg:text-4xl font-semibold leading-[1.15] text-white mt-2 mb-3">
                  Admin <span className="text-[#E54B3C]">Operations</span>
                </h2>
                <p className="text-stone-400 text-sm leading-relaxed mb-6">
                  Platform management, cluster controls, user verification, transactions, and live operations monitoring.
                </p>

                {/* Bullet Features */}
                <div className="space-y-2.5 pl-1">
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E54B3C] mt-1.5 shrink-0" />
                    <p className="text-xs sm:text-sm text-stone-300 font-medium">
                      Multi-factor administrator validation
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E54B3C] mt-1.5 shrink-0" />
                    <p className="text-xs sm:text-sm text-stone-300 font-medium">
                      Live cluster oversight and financial ledger access
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-stone-500 pt-6 border-t border-stone-800">
              © 2026 StreetBites Admin Operations
            </div>
          </div>

          {/* RIGHT PANEL - Admin Sign In Form */}
          <div className="w-full md:w-1/2 bg-[#FAF8F5] md:bg-white p-4 sm:p-6 md:p-8 lg:p-10 flex items-center justify-center">
            <div className="w-full">
              <div className="mb-6">
                <span className="hidden md:inline text-label text-xs text-stone-400 font-semibold">
                  RESTRICTED ACCESS
                </span>
                <h2 className="text-3xl font-semibold leading-tight text-[#1C1917] mt-1">
                  Admin <span className="text-accent">Sign In</span>
                </h2>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label htmlFor="admin-email" className="block text-xs font-medium text-stone-600 mb-1">
                    Admin Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    className="auth-input text-xs py-3 px-4 rounded-xl w-full"
                    placeholder="admin@streetbites.com"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="admin-password" className="block text-xs font-medium text-stone-600 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="admin-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      className="auth-input text-xs py-3 pl-4 pr-10 rounded-xl w-full"
                      placeholder="••••••••••"
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
                </div>

                <div>
                  <label htmlFor="admin-secret" className="block text-xs font-medium text-stone-600 mb-1">
                    Master Admin Secret Key <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="admin-secret"
                      name="secretKey"
                      type={showSecretKey ? "text" : "password"}
                      required
                      value={SecretKey}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setSecretKey(e.target.value)}
                      className="auth-input text-xs py-3 pl-4 pr-10 rounded-xl w-full"
                      placeholder="Enter Master Admin Secret Key"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer p-1"
                      tabIndex={-1}
                      aria-label={showSecretKey ? "Hide secret key" : "Show secret key"}
                    >
                      {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="trustDevice"
                    name="trustDevice"
                    checked={trustDevice}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTrustDevice(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-[#E54B3C] focus:ring-[#E54B3C] cursor-pointer"
                  />
                  <label htmlFor="trustDevice" className="text-xs text-stone-600 cursor-pointer font-sans">
                    Trust this device for 12h
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#E54B3C] hover:bg-[#D43B2C] disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-full transition-colors shadow-sm cursor-pointer mt-3 font-sans text-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign in to Console</span>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-stone-500 pt-5">
                New Administration?{' '}
                <Link to="/admin/signup" className="text-[#E54B3C] font-semibold hover:underline">
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSignIn;
