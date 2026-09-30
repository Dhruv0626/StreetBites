import React, { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { CheckCircle2, ChevronLeft, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import logoImg from '../../assets/Logo/Logo.png';
import { useAuth } from '../../context/AuthContext';

export const AdminRegister: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [fullName, setFullName] = useState<string>('');
  const [workEmail, setWorkEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [SecretKey, setSecretKey] = useState<string>('');
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [agreePolicy, setAgreePolicy] = useState<boolean>(false);
  const [activated, setActivated] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const clearErrors = () => { setFieldErrors({}); setGeneralError(null); };

  const handleActivate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearErrors();

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    if (!agreePolicy) {
      setGeneralError('Please agree to the Admin Acceptable Use Policy.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await register({
        name: fullName.trim(),
        email: workEmail.trim(),
        password,
        role: 'ADMIN',
        secretKey: SecretKey.trim(),
      });

      if (res.success) {
        setActivated(true);
        setTimeout(() => {
          navigate('/admin/Dashboard');
        }, 1500);
      } else {
        // Place error under the specific field if the backend returned a field name
        const resData = res as any;
        if (resData.field) {
          setFieldErrors({ [resData.field]: res.message || 'Please check this field.' });
        } else {
          setGeneralError(res.message || 'Admin account creation failed.');
        }
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Unable to connect to the server. Please try again.');
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
          <div className="w-10"></div>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-md md:max-w-5xl bg-white rounded-3xl md:border md:border-[#E8E2D7] md:shadow-xl overflow-hidden flex flex-col md:flex-row my-auto">
          {/* LEFT PANEL - Admin Dark Theme Branding */}
          <div className="hidden md:flex md:w-1/2 bg-black text-white p-8 lg:p-10 flex-col justify-between border-r border-stone-850 relative overflow-hidden">
            <div>
              {/* Dark Theme Logo */}
              <div className="flex items-center gap-3 mb-12">
                <Link to="/" className="w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold text-xl shadow-md hover:opacity-90 transition-opacity">
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
                  ADMIN ACTIVATION
                </span>
                <h2 className="text-3xl lg:text-4xl font-semibold leading-[1.15] text-white mt-2 mb-3">
                  Provision <span className="text-[#E54B3C]">Admin Access</span>
                </h2>
                <p className="text-stone-400 text-sm leading-relaxed mb-6">
                  Set up internal platform administration credentials for cluster operations, commission monitoring, and compliance oversight.
                </p>
              </div>
            </div>

            <div className="text-[11px] text-stone-500 pt-6 border-t border-stone-800">
              © 2026 StreetBites Admin Operations
            </div>
          </div>

          {/* RIGHT PANEL - Registration Form */}
          <div className="w-full md:w-1/2 bg-[#FAF8F5] md:bg-white p-4 sm:p-6 md:p-8 lg:p-10 flex items-center justify-center">
            <div className="w-full">
              <div className="mb-6">
                <span className="hidden md:inline text-label text-xs text-stone-400 font-semibold">
                  PRIVILEGED ACCESS
                </span>
                <h2 className="text-3xl font-semibold leading-tight text-[#1C1917] mt-1">
                  Create <span className="text-accent">Admin Account</span>
                </h2>
              </div>

              {generalError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{generalError}</span>
                </div>
              )}

              {activated ? (
                <div className="bg-[#FAF7F2] border border-[#E8E2D7] text-stone-800 p-6 rounded-2xl text-center my-6 shadow-sm">
                  <CheckCircle2 className="w-10 h-10 text-[#E54B3C] mx-auto mb-2" />
                  <h3 className="font-display text-lg font-semibold">Admin Account Activated!</h3>
                  <p className="text-xs mt-1 text-stone-500">Redirecting to Admin Dashboard...</p>
                </div>
              ) : (
                <form onSubmit={handleActivate} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="admin-fullname" className="block text-xs font-medium text-stone-600 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="admin-fullname"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setFullName(e.target.value);
                        if (fieldErrors.name || fieldErrors.fullName) {
                          setFieldErrors((prev) => ({ ...prev, name: '', fullName: '' }));
                        }
                      }}
                      className={`auth-input text-xs py-3 px-4 rounded-xl w-full transition-colors ${
                        fieldErrors.name || fieldErrors.fullName ? '!border-red-500 !ring-1 !ring-red-500/20' : ''
                      }`}
                      placeholder="Your full name"
                      disabled={isSubmitting}
                    />
                    {(fieldErrors.name || fieldErrors.fullName) && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        <span>{fieldErrors.name || fieldErrors.fullName}</span>
                      </p>
                    )}
                  </div>

                  {/* Work Email */}
                  <div>
                    <label htmlFor="admin-workemail" className="block text-xs font-medium text-stone-600 mb-1">
                      Enter Work Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="admin-workemail"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={workEmail}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setWorkEmail(e.target.value);
                        if (fieldErrors.email || fieldErrors.workEmail) {
                          setFieldErrors((prev) => ({ ...prev, email: '', workEmail: '' }));
                        }
                      }}
                      className={`auth-input text-xs py-3 px-4 rounded-xl w-full transition-colors ${
                        fieldErrors.email || fieldErrors.workEmail ? '!border-red-500 !ring-1 !ring-red-500/20' : ''
                      }`}
                      placeholder="admin@streetbites.com"
                      disabled={isSubmitting}
                    />
                    {(fieldErrors.email || fieldErrors.workEmail) && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        <span>{fieldErrors.email || fieldErrors.workEmail}</span>
                      </p>
                    )}
                  </div>

                  {/* Secret Key */}
                  <div>
                    <label htmlFor="admin-secretkey" className="block text-xs font-medium text-stone-600 mb-1">
                      Secret Key <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="admin-secretkey"
                        name="secretKey"
                        type={showSecretKey ? "text" : "password"}
                        required
                        value={SecretKey}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setSecretKey(e.target.value);
                          if (fieldErrors.secretKey || fieldErrors.SecretKey || fieldErrors.secret_key) {
                            setFieldErrors((prev) => ({ ...prev, secretKey: '', SecretKey: '', secret_key: '' }));
                          }
                        }}
                        className={`auth-input text-xs py-3 pl-4 pr-10 rounded-xl w-full transition-colors ${
                          fieldErrors.secretKey || fieldErrors.SecretKey || fieldErrors.secret_key
                            ? '!border-red-500 !ring-1 !ring-red-500/20'
                            : ''
                        }`}
                        placeholder="Enter Admin Security Key"
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
                    {(fieldErrors.secretKey || fieldErrors.SecretKey || fieldErrors.secret_key) && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        <span>{fieldErrors.secretKey || fieldErrors.SecretKey || fieldErrors.secret_key}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Password */}
                    <div>
                      <label htmlFor="admin-reg-password" className="block text-xs font-medium text-stone-600 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="admin-reg-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          value={password}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setPassword(e.target.value);
                            if (fieldErrors.password) {
                              setFieldErrors((prev) => ({ ...prev, password: '' }));
                            }
                          }}
                          className={`auth-input text-xs py-3 pl-4 pr-10 rounded-xl w-full transition-colors ${
                            fieldErrors.password ? '!border-red-500 !ring-1 !ring-red-500/20' : ''
                          }`}
                          placeholder="••••••••••••"
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

                    {/* Confirm Password */}
                    <div>
                      <label htmlFor="admin-confirm-password" className="block text-xs font-medium text-stone-600 mb-1">
                        Confirm <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="admin-confirm-password"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          value={confirmPassword}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setConfirmPassword(e.target.value);
                            if (fieldErrors.confirmPassword) {
                              setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                            }
                          }}
                          className={`auth-input text-xs py-3 pl-4 pr-10 rounded-xl w-full transition-colors ${
                            fieldErrors.confirmPassword ? '!border-red-500 !ring-1 !ring-red-500/20' : ''
                          }`}
                          placeholder="••••••••••••"
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer p-1"
                          tabIndex={-1}
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors.confirmPassword && (
                        <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                          <span>{fieldErrors.confirmPassword}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="agreePolicy"
                      name="agreePolicy"
                      checked={agreePolicy}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setAgreePolicy(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-300 text-[#E54B3C] focus:ring-[#E54B3C] cursor-pointer"
                    />
                    <label htmlFor="agreePolicy" className="text-xs text-stone-600 leading-snug cursor-pointer">
                      I agree to the <span className="text-[#E54B3C] hover:underline">Admin Acceptable Use Policy</span>.
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
                        <span>Provisioning Account...</span>
                      </>
                    ) : (
                      <span>Activate Admin Account</span>
                    )}
                  </button>

                  <p className="text-center text-xs text-stone-500 pt-3">
                    Already activated?{' '}
                    <Link to="/admin/signin" className="text-[#E54B3C] font-semibold hover:underline">
                      Sign in here
                    </Link>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
