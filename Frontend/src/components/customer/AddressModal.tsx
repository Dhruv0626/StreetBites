import React, { useState, useRef } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Home,
  Briefcase,
  Loader2,
  Check,
  AlertTriangle,
  LocateFixed,

} from 'lucide-react';
import { TomTomMap } from '../map/TomTomMap';
import type { MapMarker } from '../../types/map';
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

  // Default coordinate (Ahmedabad)
  const [lat, setLat] = useState<number>(23.0225);
  const [lng, setLng] = useState<number>(72.5714);
  const [hasGpsLocked, setHasGpsLocked] = useState<boolean>(false);
  const [isGpsDetecting, setIsGpsDetecting] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [showMapAdjuster, setShowMapAdjuster] = useState<boolean>(true);

  const houseNoInputRef = useRef<HTMLInputElement | null>(null);
  const landmarkInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // 1-Tap Live GPS: Pinpoints device coordinates with maximum accuracy (no stale cache)
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
    setGpsStatusMessage('Pinpointing your satellite GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detectedLat = position.coords.latitude;
        const detectedLng = position.coords.longitude;
        setLat(detectedLat);
        setLng(detectedLng);
        setHasGpsLocked(true);
        setShowMapAdjuster(true);
        localStorage.setItem('streetbites_location_permission', 'granted');
        localStorage.setItem('streetbites_location_enabled', 'true');

        // Reverse geocode to get clean Area, City & Pincode (strictly without Taluka)
        try {
          const geoInfo = await reverseGeocodeCoords(detectedLat, detectedLng);
          const detectedArea = geoInfo.area || '';
          const detectedCity = geoInfo.city || 'Ahmedabad';
          const detectedPincode = geoInfo.pincode || '';

          if (detectedArea) setArea(detectedArea);
          if (detectedCity) setCity(detectedCity);
          if (detectedPincode) setPincode(detectedPincode);

          const pinText = detectedPincode ? ` - ${detectedPincode}` : '';
          setGpsStatusMessage(
            `📍 GPS Pinpoint: ${detectedArea}, ${detectedCity}${pinText}. You can tap anywhere on the map to adjust exact building gate.`
          );
        } catch {
          setGpsStatusMessage(`📍 GPS Locked: ${detectedLat.toFixed(4)}, ${detectedLng.toFixed(4)}. Tap on map if you want to adjust.`);
        }

        setIsGpsDetecting(false);

        // Auto-focus House No. input for immediate manual entry
        setTimeout(() => {
          houseNoInputRef.current?.focus();
        }, 150);
      },
      (err) => {
        setIsGpsDetecting(false);
        console.warn('GPS detection error:', err);
        localStorage.setItem('streetbites_location_permission', 'denied');
        setErrorMsg('GPS access denied or unavailable. Please allow permission or click on the map to place your pin manually.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Interactive Map Click to Fine-Tune Delivery Pin
  const handleMapClick = async (coords: [number, number]) => {
    const [clickedLng, clickedLat] = coords;
    setLat(clickedLat);
    setLng(clickedLng);
    setHasGpsLocked(true);
    setGpsStatusMessage('📍 Pin adjusted on map. Fetching street & area details...');

    try {
      const geoInfo = await reverseGeocodeCoords(clickedLat, clickedLng);
      if (geoInfo.area) setArea(geoInfo.area);
      if (geoInfo.city) setCity(geoInfo.city);
      if (geoInfo.pincode) setPincode(geoInfo.pincode);

      const pinText = geoInfo.pincode ? ` - ${geoInfo.pincode}` : '';
      setGpsStatusMessage(`📍 Location adjusted: ${geoInfo.area || 'Selected point'}, ${geoInfo.city || 'Ahmedabad'}${pinText}`);
    } catch {
      setGpsStatusMessage(`📍 Location pin set: ${clickedLat.toFixed(5)}, ${clickedLng.toFixed(5)}`);
    }

    // Auto-focus House No input if empty
    if (!houseNo.trim()) {
      setTimeout(() => {
        houseNoInputRef.current?.focus();
      }, 150);
    }
  };

  // Delivery Pin Marker for TomTom Map
  const mapMarkers: MapMarker[] = [
    {
      id: 'customer-delivery-pin',
      position: [lng, lat],
      title: label === 'Home' ? 'Home' : label === 'Office' ? 'Office' : 'Delivery Address',
      description: area ? `${area}, ${city}` : 'Exact Pinpoint',
      type: 'customer',
    },
  ];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg md:max-w-4xl lg:max-w-5xl shadow-2xl border border-[#EAE4DA] overflow-hidden my-auto max-h-[92vh] md:h-[640px] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-[#F5F0E8] flex justify-between items-center bg-[#FAF7F2] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FAF0ED] text-[#D94A38] flex items-center justify-center border border-[#FCE8E6] shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#1C1917]">Add Delivery Address</h3>
              <p className="text-[10px] sm:text-[11px] text-[#8E8B85] font-medium hidden sm:block">
                Pinpoint your exact location on the map and complete house details
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

        {/* Body Layout: 2 Columns on Desktop (Map Left, Form Right), Stacked on Mobile */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-y-auto md:overflow-hidden">
          {/* ─── LEFT COLUMN: Interactive Map & Live GPS (md:col-span-6 lg:col-span-6) ─── */}
          <div className="md:col-span-6 lg:col-span-6 bg-[#FAF7F2]/60 p-4 sm:p-5 flex flex-col gap-3 border-b md:border-b-0 md:border-r border-[#EAE4DA] md:overflow-y-auto">
            {/* Warning Message */}
            {warningMsg && (
              <div className="p-3 text-xs bg-amber-50 text-amber-900 border border-amber-300 rounded-xl font-medium flex items-start gap-2 shadow-3xs animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px]">
                  <strong className="font-bold block text-amber-950">Enable Live Location</strong>
                  <span>{warningMsg}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium animate-fadeIn text-[11px]">
                {errorMsg}
              </div>
            )}

            {/* GPS Detection Action Card */}
            <div className="bg-[#FAF0ED] border border-[#D94A38]/30 rounded-2xl p-3 sm:p-3.5 transition-all shadow-3xs flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#D94A38] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Navigation className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-[#1C1917]">Live GPS Auto-Fill</span>
                    <span className="text-[8px] bg-[#D94A38] text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                      Auto
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8E8B85] truncate">
                    Detects exact coordinates & fills area
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDetectGpsAndAutoFill}
                disabled={isGpsDetecting}
                className="bg-[#D94A38] hover:bg-[#C43D2E] text-white text-[11px] sm:text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer border-0 disabled:opacity-50"
              >
                {isGpsDetecting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3 h-3" />
                    <span>Locate Me</span>
                  </>
                )}
              </button>
            </div>

            {/* Interactive TomTom Map Box */}
            <div className="flex-1 flex flex-col min-h-[220px] sm:min-h-[260px] md:min-h-[300px] bg-white rounded-2xl border border-[#EAE4DA] overflow-hidden shadow-inner relative">
              {/* Map Header Bar */}
              <div className="px-3 py-2 bg-white/90 backdrop-blur-xs border-b border-[#EAE4DA] flex items-center justify-between z-10">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">📍</span>
                  <span className="text-[11px] font-bold text-[#1C1917]">Map Fine-Tuning</span>
                  <span className="text-[9px] text-[#8E8B85] font-medium hidden sm:inline">(Click map to adjust pin)</span>
                </div>
                <span className="text-[9px] font-mono text-stone-600 bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#EAE4DA]">
                  {lat.toFixed(4)}, {lng.toFixed(4)}
                </span>
              </div>

              {/* Map Canvas */}
              <div className="flex-1 relative w-full h-full min-h-[180px]">
                <TomTomMap
                  center={[lng, lat]}
                  zoom={17}
                  markers={mapMarkers}
                  showControls={true}
                  onMapClick={handleMapClick}
                  className="w-full h-full"
                />

                {/* Floating Map Helper Badge */}
                <div className="absolute top-2 left-2 bg-stone-900/85 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none shadow-md border border-stone-700/80 flex items-center gap-1 z-10">
                  <MapPin className="w-3 h-3 text-[#D94A38]" />
                  <span>Tap anywhere to adjust exact pin</span>
                </div>

                {/* Floating Recenter GPS Button */}
                <button
                  type="button"
                  onClick={handleDetectGpsAndAutoFill}
                  title="Locate Me (Live GPS)"
                  className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-xl bg-white text-[#D94A38] shadow-md border border-stone-200 flex items-center justify-center hover:bg-stone-50 transition-all cursor-pointer z-10"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* GPS Status Message Pill */}
            {gpsStatusMessage && (
              <div className="text-[10px] sm:text-[11px] text-black font-medium flex items-start gap-1.5 bg-[#FAF0ED] p-2.5 rounded-xl border border-[#D94A38] animate-fadeIn shrink-0">
                <span className="leading-snug">{gpsStatusMessage}</span>
              </div>
            )}
          </div>

          {/* ─── RIGHT COLUMN: Structured Address Form (md:col-span-6 lg:col-span-6) ─── */}
          <div className="md:col-span-6 lg:col-span-6 bg-white p-4 sm:p-5 flex flex-col justify-between md:overflow-y-auto">
            <form id="address-form" onSubmit={handleSubmit} className="space-y-3.5">
              {/* Step indicator / Header */}
              <div className="flex items-center justify-between pb-1 border-b border-[#F5F0E8]">
                <span className="text-xs font-black text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#FAF0ED] text-[#D94A38] text-[10px] font-black flex items-center justify-center">
                    2
                  </span>
                  <span>Complete Address Details</span>
                </span>
                <span className="text-[10px] text-[#D94A38] font-bold">* Required Fields</span>
              </div>

              {/* Label Type Selector */}
              <div>
                <label className="block text-[10px] font-bold text-[#8E8B85] uppercase tracking-wider mb-1.5">
                  Address Label
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLabel('Home')}
                    className={`py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
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
                    className={`py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
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
                    className={`py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
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
                <label className="block text-[10px] font-bold text-[#8E8B85] uppercase tracking-wider mb-1">
                  Flat / House / Building Name <span className="text-[#D94A38]">*</span>
                </label>
                <input
                  ref={houseNoInputRef}
                  type="text"
                  value={houseNo}
                  onChange={(e) => setHouseNo(e.target.value)}
                  placeholder="e.g. Flat 402, Block B, Shivalik Heights"
                  required
                  className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-3 py-2 text-xs text-[#1C1917] placeholder-[#A09B90] focus:outline-none focus:ring-1 focus:ring-[#D94A38] focus:bg-white transition-all font-medium"
                />
              </div>

              {/* 2. Landmark (Compulsory * - Filled manually by user) */}
              <div>
                <label className="block text-[10px] font-bold text-[#8E8B85] uppercase tracking-wider mb-1">
                  Landmark <span className="text-[#D94A38]">*</span>
                </label>
                <input
                  ref={landmarkInputRef}
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Swaminarayan Temple, Opp Lake"
                  required
                  className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-3 py-2 text-xs text-[#1C1917] placeholder-[#A09B90] focus:outline-none focus:ring-1 focus:ring-[#D94A38] focus:bg-white transition-all font-medium"
                />
              </div>

              {/* 3. Area / Locality (Auto-filled by GPS or typed manually) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-[#8E8B85] uppercase tracking-wider">
                    Area / Locality <span className="text-[#D94A38]">*</span>
                  </label>
                  {hasGpsLocked && (
                    <span className="text-[8px] font-bold text-[#16A34A] bg-[#DCFCE7] px-1.5 py-0.2 rounded-full flex items-center gap-1">
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
                  className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-3 py-2 text-xs text-[#1C1917] font-semibold placeholder-[#A09B90] focus:outline-none focus:ring-1 focus:ring-[#D94A38] focus:bg-white transition-all"
                />
              </div>

              {/* 4. City & Pincode in 2 Columns */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-[#8E8B85] uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ahmedabad"
                    className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-3 py-2 text-xs text-[#1C1917] font-semibold focus:outline-none focus:ring-1 focus:ring-[#D94A38] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8E8B85] uppercase tracking-wider mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 380015"
                    className="w-full bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl px-3 py-2 text-xs text-[#1C1917] placeholder-[#A09B90] focus:outline-none focus:ring-1 focus:ring-[#D94A38] focus:bg-white transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Address Preview Pill */}
              <div className="p-2.5 bg-[#FAF7F2] border border-[#EAE4DA] rounded-xl text-[10px] text-stone-600">
                <span className="font-bold text-stone-800 block mb-0.5">Address Preview:</span>
                <span className="font-medium text-stone-700 line-clamp-2">
                  {[
                    houseNo.trim() || 'House No.',
                    landmark.trim() || 'Landmark',
                    area.trim() || 'Area',
                    `${city.trim() || 'Ahmedabad'}${pincode.trim() ? ` - ${pincode.trim()}` : ''}`,
                  ].join(', ')}
                </span>
              </div>

              {/* Make Primary Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded text-[#D94A38] focus:ring-[#D94A38] border-[#DCD6CC] cursor-pointer"
                />
                <span className="text-[11px] text-[#5C5954] font-medium select-none">
                  Set as default delivery address
                </span>
              </label>

              {/* Action Buttons (Always visible at the bottom of the right column) */}
              <div className="flex gap-2.5 pt-2 border-t border-[#F5F0E8]">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-[#EAE4DA] rounded-xl text-xs font-bold text-[#5C5954] hover:bg-[#FAF7F2] transition-colors cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-[#D94A38] hover:bg-[#C43D2E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer border-0 disabled:opacity-50"
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
    </div>
  );
};

export default AddressModal;
