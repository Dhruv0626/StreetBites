import React, { useState } from 'react';
import { Phone, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RequirePhoneModal: React.FC = () => {
  const { user, isAuthenticated, updateProfile, refreshProfile } = useAuth();
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Only show if user is authenticated, has a non-admin role, and phone_number is missing
  const isMissingPhone =
    isAuthenticated &&
    user &&
    user.role !== 'ADMIN' &&
    (!user.phone_number || user.phone_number.trim() === '');

  if (!isMissingPhone) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateProfile({ phone_number: cleanPhone });
      if (res.success) {
        await refreshProfile();
      } else {
        setErrorMsg(res.message || 'Failed to update phone number.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating phone number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 text-stone-900">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#D94A38] flex items-center justify-center mb-4">
          <Phone className="w-6 h-6" />
        </div>

        <span className="text-[10px] font-bold tracking-wider uppercase text-[#D94A38] block mb-1">
          Required Step · Account Setup
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight mb-2">
          Add your Mobile Number
        </h2>
        <p className="text-stone-600 text-xs leading-relaxed mb-4">
          Welcome <strong className="text-stone-900">{user?.name}</strong>! To place orders and receive delivery OTPs, please provide your 10-digit mobile number.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="modal-phone" className="block text-xs font-semibold text-stone-700 mb-1">
              10-Digit Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center bg-stone-50 rounded-xl border border-stone-300 focus-within:border-[#D94A38] focus-within:bg-white focus-within:ring-3 focus-within:ring-[#D94A38]/10 transition-all overflow-hidden">
              <span className="absolute left-3.5 text-xs font-bold text-stone-500 pointer-events-none">
                +91
              </span>
              <input
                id="modal-phone"
                type="tel"
                maxLength={10}
                autoFocus
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                style={{ paddingLeft: '3.2rem', paddingRight: '1rem' }}
                className="w-full bg-transparent border-0 outline-none text-sm py-3 text-stone-900 font-bold tracking-wider"
                placeholder="9876543210"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-stone-500 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Your number is secured and never shared with third parties.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#D94A38] hover:bg-[#C43D2E] disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md cursor-pointer text-sm flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Number...</span>
              </>
            ) : (
              <span>Save &amp; Continue &rarr;</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RequirePhoneModal;
