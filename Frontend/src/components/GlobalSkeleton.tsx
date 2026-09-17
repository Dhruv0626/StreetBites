import React from 'react';
import mainLoader from '../assets/Loader/main_loader_light.gif';

interface GlobalSkeletonProps {
  message?: string;
}

export const GlobalSkeleton: React.FC<GlobalSkeletonProps> = ({ message = "Preparing your Khau Galli" }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[60vh] bg-white font-sans select-none">
      {/* Loader Image Container with pure white background */}
      <div className="relative w-48 h-48 mb-6 flex items-center justify-center bg-white">
        <div className="w-40 h-40 rounded-full overflow-hidden relative z-10 flex items-center justify-center bg-white [clip-path:circle(49.5%_at_50%_50%)]">
          <img
            src={mainLoader}
            alt="Loading..."
            className="w-full h-full object-cover scale-105 rounded-full bg-white mix-blend-multiply contrast-[1.06] brightness-[1.02] [clip-path:circle(49.5%_at_50%_50%)]"
          />
        </div>
      </div>

      {/* StreetBites Text */}
      <div className="text-3xl tracking-tight mb-8 flex items-center select-none">
        <span className="font-bold text-[#1C1917]">Street</span>
        <span className="font-bold text-[#D94A38]">Bites</span>
      </div>

      {/* Dynamic Text with Animated Dot */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="relative flex items-center justify-center w-3 h-3">
          <span className="absolute inset-0 bg-[#D94A38] rounded-full opacity-30 animate-ping"></span>
          <span className="relative w-1.5 h-1.5 bg-[#D94A38] rounded-full"></span>
        </div>
        <span className="text-[#4B5563] font-bold text-sm tracking-wide">{message}</span>
      </div>

      {/* Progress Bar Container */}
      <div className="w-72 max-w-[80vw] h-1 bg-[#EAE4DA] rounded-full overflow-hidden mb-8 relative">
        <div
          className="absolute top-0 left-0 h-full bg-[#D94A38] rounded-full origin-left"
          style={{ animation: 'scaleX 1.5s ease-out forwards' }}
        ></div>
        <style>{`
          @keyframes scaleX {
            0% { transform: scaleX(0); }
            100% { transform: scaleX(1); }
          }
        `}</style>
      </div>

      {/* Footer Text */}
      <div className="text-[#8E8B85] font-extrabold text-[10px] tracking-[0.2em] uppercase">
        HYPERLOCAL · ONE DELIVERY
      </div>
    </div>
  );
};

export default GlobalSkeleton;
