import React, { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import logoImg from '../../assets/Logo/Logo.png';
import SidePanelImg from '../../assets/images/hero_market.jpg';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password === confirmPassword) {
      // API call to reset password
      navigate('/signin');
    } else {
      alert("Passwords do not match");
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
            RESET PASSWORD
          </span>
          <div className="w-10"></div>
        </div>
        
        <div className="w-full max-w-md md:max-w-5xl rounded-3xl md:border md:border-[#E8E2D7] md:shadow-xl overflow-hidden flex flex-col md:flex-row my-auto">
          {/* LEFT PANEL */}
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
                  <h1 className="font-bold text-lg leading-none text-[#1C1917]">Street<span className="text-[#D94A38]">Bites</span></h1>
                  <p className="text-label text-[10px] mt-1">KHAU GALLI · AHMEDABAD</p>
                </div>
              </div>

              <div className="max-w-xl">
                <span className="text-label text-xs text-[#8E8B85] font-medium">SECURE YOUR ACCOUNT</span>
                <h2 className="text-3xl lg:text-4xl font-semibold leading-[1.15] text-[#1C1917] mt-2 mb-3">
                  Create a new <span className="text-[#1C1917] font-bold">password</span>
                </h2>
                <p className="text-stone-600 text-sm leading-relaxed mb-6">
                  Your new password must be different from previous used passwords. Ensure it is at least 8 characters long.
                </p>
              </div>
            </div>

            <div className="relative z-10 pt-6 text-[11px] text-stone-500 border-t border-stone-300/50">
              © 2026 StreetBites
            </div>
          </div>

          {/* RIGHT PANEL - Reset Password Form */}
          <div className="w-full md:w-1/2 bg-[#FAF8F5] md:bg-white p-4 sm:p-6 md:p-8 lg:p-10 flex items-center justify-center">
            <div className="w-full">
              <div className="mb-6">
                 <h2 className="text-3xl font-semibold leading-tight text-[#1C1917] mt-1">
                  Set new password
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs py-3 px-4 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E54B3C]/20 focus:border-[#E54B3C] transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full text-xs py-3 px-4 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E54B3C]/20 focus:border-[#E54B3C] transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#E54B3C] hover:bg-[#D43B2C] text-white font-semibold py-3 px-4 rounded-full border border-stone-200 transition-colors shadow-2xs cursor-pointer font-sans text-sm mt-4"
                >
                  Reset Password
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
