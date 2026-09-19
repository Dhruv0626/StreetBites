import React from 'react';
import { Store, AlertTriangle, ArrowRight, X } from 'lucide-react';

interface KhauGalliConflictModalProps {
  isOpen: boolean;
  currentKhauGalli: string;
  newKhauGalli: string;
  onConfirmReplace: () => void;
  onCancel: () => void;
}

export const KhauGalliConflictModal: React.FC<KhauGalliConflictModalProps> = ({
  isOpen,
  currentKhauGalli,
  newKhauGalli,
  onConfirmReplace,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn select-none font-sans">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-[#EAE4DA] transform transition-all animate-scaleUp">
        {/* Header Ribbon */}
        <div className="p-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FCE8E6] text-[#D94A38] border border-[#F5C7C3] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#1C1917] tracking-tight">
                Switch Khau Galli?
              </h3>
              <p className="text-xs text-[#8E8B85] font-semibold mt-0.5">
                Single Khau Galli order policy
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Khau Galli Switcher Pill Preview */}
        <div className="px-6 py-2">
          <div className="bg-[#FAF7F2] border border-[#EAE4DA] rounded-2xl p-3.5 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#8E8B85] block mb-0.5">
                Current Cart
              </span>
              <span className="text-xs font-bold text-stone-800 truncate block">
                {currentKhauGalli || 'Existing Khau Galli'}
              </span>
            </div>

            <div className="w-7 h-7 rounded-full bg-white border border-[#EAE4DA] flex items-center justify-center text-[#D94A38] shrink-0 shadow-3xs">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>

            <div className="flex-1 min-w-0 text-right">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#D94A38] block mb-0.5">
                New Order
              </span>
              <span className="text-xs font-bold text-[#1C1917] truncate block">
                {newKhauGalli || 'New Khau Galli'}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs text-[#5C5954] leading-relaxed">
            Your cart currently has dishes from <strong className="text-[#1C1917]">{currentKhauGalli}</strong>. 
            StreetBites allows ordering from <strong>multiple stalls</strong> within the <strong>same Khau Galli</strong> for a single consolidated delivery fee.
          </p>
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 flex items-start gap-2.5">
            <Store className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-snug">
              Items from different Khau Gallis cannot be merged in the same delivery. Starting an order from <strong className="font-bold">{newKhauGalli}</strong> will discard your previous cart.
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-6 pt-3 border-t border-[#F5F0E8] flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-1/2 py-3 rounded-xl border border-[#EAE4DA] bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Keep Current Cart
          </button>
          <button
            type="button"
            onClick={onConfirmReplace}
            className="w-full sm:w-1/2 py-3 rounded-xl bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold text-xs transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Discard & Add</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default KhauGalliConflictModal;
