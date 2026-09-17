import React, { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import logoImg from '../../assets/Logo/Logo.png';
import SidePanelImg from '../../assets/images/hero_market.jpg';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Logic to send OTP/Link goes here
    setIsSubmitted(true);
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
            FORGOT PASSWORD
          </span>
          <div className="w-10"></div> {/* Spacer to center tag */}
        </div>
        
        <div className="w-full max-w-md md:max-w-5xl rounded-3xl md:border md:border-[#E8E2D7] md:shadow-xl overflow-hidden flex flex-col md:flex-row my-auto">
          {/* LEFT PANEL - Branding & Details (Visible on desktop) */}
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

              {/* Tag & Heading */}
              <div className="max-w-xl">
                <span className="text-label text-xs text-[#8E8B85] font-medium">RECOVERY</span>
                <h2 className="text-3xl lg:text-4xl font-semibold leading-[1.15] text-[#1C1917] mt-2 mb-3">
                  Lost access to your <span className="text-[#1C1917] font-bold">account?</span>
                </h2>
                <p className="text-stone-600 text-sm leading-relaxed mb-6">
                  Don't worry, it happens to the best of us. Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>
            </div>

            {/* Left Footer */}
            <div className="relative z-10 pt-6 text-[11px] text-stone-500 border-t border-stone-300/50">
              © 2026 StreetBites
            </div>
          </div>

          {/* RIGHT PANEL - Forgot Password Form */}
          <div className="w-full md:w-1/2 bg-[#FAF8F5] md:bg-white p-4 sm:p-6 md:p-8 lg:p-10 flex items-center justify-center">
            <div className="w-full">
              {/* Heading Section */}
              <div className="mb-6">
                <span className="hidden md:inline text-label text-xs text-stone-400 font-semibold">
                  PASSWORD RESET
                </span>
                <h2 className="text-3xl font-semibold leading-tight text-[#1C1917] mt-1">
                  Forgot Password?
                </h2>
                <p className="text-stone-500 text-sm mt-2">
                  Enter the email address associated with your account.
                </p>
              </div>

              {isSubmitted ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm mb-6">
                  <p className="font-medium mb-1">Check your inbox</p>
                  <p>We've sent a password reset link to <strong>{email}</strong>.</p>
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="mt-3 text-emerald-700 font-semibold hover:underline text-xs"
                  >
                    Try another email address
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Email 
                    </label>
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs py-3 px-4 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E54B3C]/20 focus:border-[#E54B3C] transition-all"
                      placeholder="you@gmail.com"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#E54B3C] hover:bg-[#D43B2C] text-white font-semibold py-3 px-4 rounded-full border border-stone-200 transition-colors shadow-2xs cursor-pointer font-sans text-sm mt-2"
                  >
                    Send Reset Link
                  </button>
                </form>
              )}

              {/* Link back to Login */}
              <p className="text-center text-xs text-stone-500 pt-6 border-t border-stone-200 mt-6">
                Remembered your password?{' '}
                <Link to="/signin" className="text-[#E54B3C] font-semibold hover:underline">
                  Back to Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
