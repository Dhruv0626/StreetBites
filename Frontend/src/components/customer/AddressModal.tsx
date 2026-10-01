import React, { useState, useRef } from 'react';
import { X, MapPin, Navigation, Home, Briefcase, Loader2, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { createCustomerAddress } from '../../services/addressService';
import { geocodeAddressText, reverseGeocodeCoords } from '../../utils/geocoding';
import type { AddressItem } from '../../types';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressCreated: (address: AddressItem) => void;
  userName?: string;
  userPhone?: string;
}

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  onAddressCreated,
  userName,
  userPhone,
}) => {
  const [label, setLabel] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [area, setArea] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Ahmedabad');
  const [pincode, setPincode] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const [lat, setLat] = useState<number>(23.0225);
  const [lng, setLng] = useState<number>(72.5714);
  const [hasGpsLocked, setHasGpsLocked] = useState<boolean>(false);
  const [isGpsDetecting, setIsGpsDetecting] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const houseNoInputRef = useRef<HTMLInputElement | null>(null);
  const landmarkInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // 1-Tap Live GPS: Pinpoints device coordinates, auto-fills Area, City & Pincode (without Taluka), and focuses House No.
  const handleDetectGpsAndAutoFill = () => {
    // Check if user has enabled live location in App Settings
    const isLocationEnabled = localStorage.getItem('streetbites_location_enabled') === 'true';
    if (!isLocationEnabled) {
      setWarningMsg('Enable Live location first from your Profile -> App Settings, or enter your address manually.');
      setErrorMsg(null);
      return;
    }

    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      localStorage.setItem('streetbites_location_permission', 'denied');
      return;
    }

    setIsGpsDetecting(true);
    setErrorMsg(null);
    setWarningMsg(null);
    setGpsStatusMessage('Pinpointing your live GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detectedLat = position.coords.latitude;
        const detectedLng = position.coords.longitude;
        setLat(detectedLat);
        setLng(detectedLng);
        setHasGpsLocked(true);
        localStorage.setItem('streetbites_location_permission', 'granted');
        localStorage.setItem('streetbites_location_enabled', 'true');

        // Reverse geocode to get clean Area, City & Pincode (strictly without Taluka)
        const geoInfo = await reverseGeocodeCoords(detectedLat, detectedLng);
        const detectedArea = geoInfo.area || '';
        const detectedCity = geoInfo.city || 'Ahmedabad';
        const detectedPincode = geoInfo.pincode || '';

        // Auto-fill Area, City, and Pincode
        if (detectedArea) setArea(detectedArea);
        if (detectedCity) setCity(detectedCity);
        if (detectedPincode) setPincode(detectedPincode);

        const pinText = detectedPincode ? ` - ${detectedPincode}` : '';
        setGpsStatusMessage(
          `📍 GPS Location detected: ${detectedArea}, ${detectedCity}${pinText}. Add the House no./apartment and landmark for get easy delivery.`
        );

        setIsGpsDetecting(false);

        // Auto-focus House No. input for immediate manual entry
        setTimeout(() => {
          houseNoInputRef.current?.focus();
        }, 150);

        // Auto-dismiss GPS status message after 8 seconds
        setTimeout(() => {
          setGpsStatusMessage(null);
        }, 8000);
      },
      (err) => {
        setIsGpsDetecting(false);
        console.warn('GPS detection error:', err);
        localStorage.setItem('streetbites_location_permission', 'denied');
        setErrorMsg('GPS access denied or unavailable. Please allow permission or enter address manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!houseNo.trim()) {
      setErrorMsg('Add the House no./apartment and landmark for get easy delivery');
      houseNoInputRef.current?.focus();
      return;
    }
    if (!landmark.trim()) {
      setErrorMsg('Please add a landmark to complete your address and get easy delivery.');
      landmarkInputRef.current?.focus();
      return;
    }
    if (!area.trim()) {
      setErrorMsg('Please enter or GPS-detect your Area / Locality.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    let finalLat = lat;
    let finalLng = lng;

    // Forward geocode structured area/city/pincode if not locked by GPS
    if (!hasGpsLocked) {
      try {
        const geocoded = await geocodeAddressText({
          area: area.trim(),
          city: city.trim() || 'Ahmedabad',
          pincode: pincode.trim(),
          landmark: landmark.trim(),
        });
        if (geocoded) {
          finalLat = geocoded.lat;
          finalLng = geocoded.lng;
        }
      } catch (err) {
        console.warn('Geocoding error on submit:', err);
      }
    }

    // Format: House no/appartment , landmark , area , city - pincode
    const cleanCityPin = pincode.trim()
      ? `${city.trim() || 'Ahmedabad'} - ${pincode.trim()}`
      : city.trim() || 'Ahmedabad';

    const fullDetail = [
      houseNo.trim(),
      landmark.trim(),
      area.trim(),
      cleanCityPin,
    ]
      .filter(Boolean)
      .join(', ');

    try {
      const newAddress = await createCustomerAddress({
        label,
        detail: fullDetail,
        house_no: houseNo.trim(),
        landmark: landmark.trim(),
        area: area.trim(),
        city: city.trim() || 'Ahmedabad',
        pincode: pincode.trim(),
        lat: finalLat,
        lng: finalLng,
        is_primary: isPrimary,
      });

      if (newAddress) {
        onAddressCreated(newAddress);
        onClose();
        // Reset form
        setArea('');
        setHouseNo('');
        setLandmark('');
        setPincode('');
        setHasGpsLocked(false);
        setGpsStatusMessage(null);
      } else {
        setErrorMsg('Could not save address. Please check your connection and try again.');
      }
    } catch (err: any) {
      console.error('Save Address error:', err);
      setErrorMsg(err?.message || 'Failed to save address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#EAE4DA] overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F5F0E8] flex justify-between items-center bg-[#FAF7F2] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FAF0ED] text-[#D94A38] flex items-center justify-center border border-[#FCE8E6]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1C1917]">Add Delivery Address</h3>
              <p className="text-[10px] text-[#8E8B85] font-medium">
                Accurately mapped for street distance & delivery charges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#EAE4DA] flex items-center justify-center text-[#8E8B85] hover:text-[#1C1917] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer Reference Info Pill */}
        {(userName || userPhone) && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span className="text-[#166534] font-medium">
                Recipient: <strong className="font-bold">{userName || 'Customer'}</strong>
                {userPhone ? ` (${userPhone})` : ''}
              </span>
            </div>
            <span className="text-[10px] text-[#15803D] font-bold bg-white px-2 py-0.5 rounded border border-[#BBF7D0]">
              From Profile
            </span>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {warningMsg && (
            <div className="p-3.5 text-xs bg-amber-50 text-amber-900 border border-amber-300 rounded-xl font-medium flex items-start gap-2.5 shadow-3xs animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-bold block text-amber-950 mb-0.5">Enable Live Location</strong>
                <span>{warningMsg}</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium animate-fadeIn">
              {errorMsg}
            </div>
          )}

          {/* ─── 1-Tap Live GPS Auto-Fill Banner ─── */}
          <div className="bg-[#FAF0ED] border-2 border-[#D94A38]/30 rounded-2xl p-4 transition-all hover:border-[#D94A38] shadow-3xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D94A38] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#1C1917] flex items-center gap-1.5">
                    <span>Use Live GPS Location</span>
                    <span className="text-[9px] bg-[#D94A38] text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                      Auto-Fill
                    </span>
                  </h4>
                  <p className="text-[11px] text-[#8E8B85] mt-0.5">
                    Auto-fills Area, City & Pin code · Locks exact GPS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDetectGpsAndAutoFill}
                disabled={isGpsDetecting}
                className="bg-[#D94A38] hover:bg-[#C43D2E] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer border-0 disabled:opacity-50"
              >
                {isGpsDetecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Use Live GPS</span>
                  </>
                )}
              </button>
            </div>

            {/* GPS Detection Confirmation Banner */}
            {gpsStatusMessage && (
              <div className="mt-3 text-[11px] text-[#166534] font-medium flex items-start gap-2 bg-[#F0FDF4] p-2.5 rounded-xl border border-[#BBF7D0] animate-fadeIn">
                <Sparkles className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span>{gpsStatusMessage}</span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Label Type Selector */}
            <div>
              <label className="block text-[11px] font-bold text-[#8E8B85] uppercase tracking-wider mb-2">
                Address Label
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setLabel('Home')}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    label === 'Home'
                      ? 'border-[#D94A38] bg-[#FAF0ED] text-[#D94A38] shadow-3xs'
                      : 'border-[#EAE4DA] bg-white text-[#5C5954] hover:border-[#DCD6CC]'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Home</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLabel('Office')}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    label === 'Office'
                      ? 'border-[#D94A38] bg-[#FAF0ED] text-[#D94A38] shadow-3xs'
                      : 'border-[#EAE4DA] bg-white text-[#5C5954] hover:border-[#DCD6CC]'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Office</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLabel('Other')}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    label === 'Other'
                      ? 'border-[#D94A38] bg-[#FAF0ED] text-[#D94A38] shadow-3xs'
                      : 'border-[#EAE4DA] bg-white text-[#5C5954] hover:border-[#DCD6CC]'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Other</span>
                </button>
              </div>
            </div>

            {/* 1. Flat / House No / Building (Compulsory * - Filled manually by user) */}
            <div>
              <label className="block text-[11px] font-bold text-[#8E8B85] uppercase tracking-wider mb-1.5">
                Flat / House / Building Name <span className="text-[#D94A38]">*</span>
              </label>
              <input
                ref={houseNoInputRef}
                type="text"
                value={houseNo}
                onChange={(e) => setHouseNo(e.target.value)}
                placeholder="e.g. Flat 402, Block B, Shivalik Heights"
                required
                className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-3 py-2.5 text-xs text-[#1C1917] placeholder-[#A09B90] focus:outline-none focus:ring-1 focus:ring-[#D94A38] focus:bg-white transition-all font-medium"
              />
            </div>

            {/* 2. Landmark (Compulsory * - Filled manually by user) */}
            <div>
              <label className="block text-[11px] font-bold text-[#8E8B85] uppercase tracking-wider mb-1.5">
                Landmark <span className="text-[#D94A38]">*</span>
              </label>
              <input
                ref={landmarkInputRef}
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Swaminarayan Temple, Opp Lake"
                required
                className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-3 py-2.5 text-xs text-[#1C1917] placeholder-[#A09B90] focus:outline-none focus:ring-1 focus:ring-[#D94A38] focus:bg-white transition-all font-medium"
              />
            </div>

            {/* 3. Area / Locality (Auto-filled by GPS or typed manually) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-[#8E8B85] uppercase tracking-wider">
                  Area / Locality <span className="text-[#D94A38]">*</span>
                </label>
                {hasGpsLocked && (
                  <span className="text-[9px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> GPS Locked
                  </span>
                )}
              </div>
              <input
                type="text"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setHasGpsLocked(false);
                }}
                placeholder="e.g. Vastrapur, Bodakdev, Prahlad Nagar"
                required
                className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-3 py-2.5 text-xs text-[#1C1917] font-semibold placeholder-[#A09B90] focus:outline-none focus:ring-1 focus:ring-[#D94A38] focus:bg-white transition-all"
              />
            </div>

            {/* 4. City & Pincode in 2 Columns (Auto-filled by GPS or edited manually) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#8E8B85] uppercase tracking-wider mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ahmedabad"
                  className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-3 py-2.5 text-xs text-[#1C1917] font-semibold focus:outline-none focus:ring-1 focus:ring-[#D94A38] focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#8E8B85] uppercase tracking-wider mb-1.5">
                  Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 380015"
                  className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-3 py-2.5 text-xs text-[#1C1917] placeholder-[#A09B90] focus:outline-none focus:ring-1 focus:ring-[#D94A38] focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            {/* Address Format Preview */}
            <div className="p-3 bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl text-[11px] text-stone-600">
              <span className="font-bold text-stone-800 block mb-0.5">Address Preview:</span>
              <span className="font-medium text-stone-700">
                {[
                  houseNo.trim() || 'House No.',
                  landmark.trim() || 'Landmark',
                  area.trim() || 'Area',
                  `${city.trim() || 'Ahmedabad'}${pincode.trim() ? ` - ${pincode.trim()}` : ''}`,
                ].join(', ')}
              </span>
            </div>

            {/* Make Primary Checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="w-4 h-4 rounded text-[#D94A38] focus:ring-[#D94A38] border-[#DCD6CC] cursor-pointer"
              />
              <span className="text-xs text-[#5C5954] font-medium select-none">
                Set as my default delivery address
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-[#EAE4DA] rounded-xl text-xs font-bold text-[#5C5954] hover:bg-[#FAF7F2] transition-colors cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-[#D94A38] hover:bg-[#C43D2E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer border-0 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Address</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddressModal;
