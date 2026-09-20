import React, { useState } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { useLocationPermission } from '../../hooks/useLocationPermission';

export const CustomerLocationBanner: React.FC = () => {
  const { isGranted, requestLocation, isLocating } = useLocationPermission();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // If already granted or dismissed in current session, do not render banner
  if (isGranted || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleAllowLocation = async () => {
    await requestLocation();
  };

  return (
    <div className="bg-[#FAF0ED] border-b border-[#FCE8E6] px-4 py-2.5 text-xs text-[#1C1917] flex items-center justify-between transition-all z-40 relative">
      <div className="flex items-center gap-2.5 max-w-2xl">
        <div className="w-6 h-6 rounded-full bg-white text-[#D94A38] flex items-center justify-center shrink-0 shadow-3xs border border-[#FCE8E6]">
          <MapPin className="w-3.5 h-3.5 animate-pulse" />
        </div>
        <span className="font-medium leading-tight">
          Allow your <strong className="font-bold text-[#D94A38]">Location Permission</strong> to auto-discover closest Khau Gallis and get fast delivery estimates.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleAllowLocation}
          disabled={isLocating}
          className="bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer border-0 disabled:opacity-60"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Detecting...</span>
            </>
          ) : (
            <span>Allow Permission</span>
          )}
        </button>

        <button
          onClick={handleDismiss}
          className="text-[#8E8B85] hover:text-[#1C1917] p-1 rounded-full transition-colors cursor-pointer bg-transparent border-0"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CustomerLocationBanner;
