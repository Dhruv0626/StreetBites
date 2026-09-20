import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Settings,
  MapPin,
  ChevronDown,
  ChevronUp,
  LogOut,
  LogIn,
  FileText,
  Heart,
  ShieldCheck,
  Store,
  Bike,
  Plus,
  Trash2,
  Navigation,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../hooks/useFavorites';
import {
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
} from '../../services/addressService';
import { geocodeAddressText, reverseGeocodeCoords } from '../../utils/geocoding';
import type { AddressItem } from '../../types';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateProfile, refreshProfile } = useAuth();
  const { favorites } = useFavorites();
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Editable Personal Details State
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [personalDetails, setPersonalDetails] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone_number || '',
  });

  // Sync personal details when user loads
  useEffect(() => {
    if (user) {
      setPersonalDetails({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone_number || '',
      });
    }
  }, [user]);

  // Real Saved Addresses State (Fetched from MongoDB based on user_id)
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const data = await getCustomerAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Failed to load profile addresses from API:', e);
      setAddresses([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [user]);

  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editAddressData, setEditAddressData] = useState({
    label: 'Home',
    area: '',
    house_no: '',
    landmark: '',
    city: 'Ahmedabad',
    pincode: '',
  });
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressWarning, setAddressWarning] = useState<string | null>(null);
  const [newAddressData, setNewAddressData] = useState({
    label: 'Home',
    area: '',
    house_no: '',
    landmark: '',
    city: 'Ahmedabad',
    pincode: '',
  });

  // Total Orders calculation from storage / user history
  const [totalOrdersCount, setTotalOrdersCount] = useState<number>(0);

  useEffect(() => {
    if (isAuthenticated) {
      const storedOrders = localStorage.getItem('streetbites_orders');
      if (storedOrders) {
        try {
          const parsed = JSON.parse(storedOrders);
          setTotalOrdersCount(Array.isArray(parsed) ? parsed.length : 0);
        } catch (e) {
          setTotalOrdersCount(0);
        }
      } else {
        setTotalOrdersCount(0);
      }
    } else {
      setTotalOrdersCount(0);
    }
  }, [isAuthenticated, user]);

  // App Settings State (Saved in Browser Storage - Defaults to Disabled)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('streetbites_notifications_enabled');
    return saved === 'true';
  });
  const [locationEnabled, setLocationEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('streetbites_location_enabled');
    return saved === 'true';
  });

  const handleToggleNotifications = () => {
    const updated = !notificationsEnabled;
    setNotificationsEnabled(updated);
    localStorage.setItem('streetbites_notifications_enabled', String(updated));
  };

  const handleToggleLocation = () => {
    const updated = !locationEnabled;
    setLocationEnabled(updated);
    localStorage.setItem('streetbites_location_enabled', String(updated));
    localStorage.setItem('streetbites_location_permission', updated ? 'granted' : 'denied');
    if (updated) {
      localStorage.removeItem('streetbites_location_banner_dismissed');
      setAddressWarning(null);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {});
      }
    }
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleSavePersonal = async () => {
    setPersonalError(null);
    const cleanPhone = personalDetails.phone.trim().replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 10) {
      setPersonalError('Phone number must be exactly 10 digits.');
      return;
    }

    setIsSavingPersonal(true);
    try {
      const res = await updateProfile({
        name: personalDetails.name.trim(),
        phone_number: cleanPhone || undefined,
      });
      if (res.success) {
        await refreshProfile();
        setIsEditingPersonal(false);
      } else {
        setPersonalError(res.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      setPersonalError(err.message || 'Error updating profile.');
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleSetPrimaryAddress = async (id: string) => {
    await updateCustomerAddress(id, { is_primary: true });
    await loadAddresses();
  };

  const handleEditAddressClick = (addr: AddressItem) => {
    setEditingAddressId(addr.id || addr._id || '');
    setEditAddressData({
      label: addr.label,
      area: addr.area || '',
      house_no: addr.house_no || '',
      landmark: addr.landmark || '',
      city: addr.city || 'Ahmedabad',
      pincode: addr.pincode || '',
    });
  };

  const handleSaveAddress = async () => {
    if (!editingAddressId || (!editAddressData.area.trim() && !editAddressData.house_no.trim())) return;

    let geocodedLat: number | undefined;
    let geocodedLng: number | undefined;
    try {
      const geo = await geocodeAddressText({
        area: editAddressData.area.trim(),
        city: editAddressData.city.trim() || 'Ahmedabad',
        pincode: editAddressData.pincode.trim(),
        landmark: editAddressData.landmark.trim(),
      });
      if (geo) {
        geocodedLat = geo.lat;
        geocodedLng = geo.lng;
      }
    } catch {
      // Backend fallback geocoding will handle it
    }

    const fullDetail = [
      editAddressData.house_no.trim(),
      editAddressData.landmark.trim(),
      editAddressData.area.trim(),
      editAddressData.city.trim(),
      editAddressData.pincode.trim(),
    ]
      .filter(Boolean)
      .join(', ');

    await updateCustomerAddress(editingAddressId, {
      label: editAddressData.label || 'Home',
      detail: fullDetail,
      house_no: editAddressData.house_no.trim(),
      area: editAddressData.area.trim(),
      city: editAddressData.city.trim() || 'Ahmedabad',
      pincode: editAddressData.pincode.trim(),
      landmark: editAddressData.landmark ? editAddressData.landmark.trim() : undefined,
      lat: geocodedLat,
      lng: geocodedLng,
    });
    setEditingAddressId(null);
    await loadAddresses();
  };

  const handleAddNewAddress = async () => {
    if (!newAddressData.area.trim() && !newAddressData.house_no.trim()) return;

    let geocodedLat: number | undefined;
    let geocodedLng: number | undefined;
    try {
      const geo = await geocodeAddressText({
        area: newAddressData.area.trim(),
        city: newAddressData.city.trim() || 'Ahmedabad',
        pincode: newAddressData.pincode.trim(),
        landmark: newAddressData.landmark.trim(),
      });
      if (geo) {
        geocodedLat = geo.lat;
        geocodedLng = geo.lng;
      }
    } catch {
      // Backend fallback geocoding will handle it
    }

    const fullDetail = [
      newAddressData.house_no.trim(),
      newAddressData.landmark.trim(),
      newAddressData.area.trim(),
      newAddressData.city.trim(),
      newAddressData.pincode.trim(),
    ]
      .filter(Boolean)
      .join(', ');

    await createCustomerAddress({
      label: newAddressData.label || 'Home',
      detail: fullDetail,
      house_no: newAddressData.house_no.trim(),
      area: newAddressData.area.trim(),
      city: newAddressData.city.trim() || 'Ahmedabad',
      pincode: newAddressData.pincode.trim(),
      landmark: newAddressData.landmark.trim() ? newAddressData.landmark.trim() : undefined,
      is_primary: addresses.length === 0,
      lat: geocodedLat,
      lng: geocodedLng,
    });
    setNewAddressData({
      label: 'Home',
      area: '',
      house_no: '',
      landmark: '',
      city: 'Ahmedabad',
      pincode: '',
    });
    setIsAddingAddress(false);
    await loadAddresses();
  };

  const [isGpsLocatingProfile, setIsGpsLocatingProfile] = useState(false);

  const handleAddGpsAddressProfile = () => {
    const isEnabled = localStorage.getItem('streetbites_location_enabled') === 'true';
    if (!isEnabled) {
      setAddressWarning('Enable the Live location first under App Settings below before using Live GPS.');
      return;
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setAddressWarning(null);
    setIsGpsLocatingProfile(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detectedLat = position.coords.latitude;
        const detectedLng = position.coords.longitude;
        localStorage.setItem('streetbites_location_permission', 'granted');
        localStorage.setItem('streetbites_location_enabled', 'true');

        // Reverse geocode to get clean Area & City (e.g. "Chandkheda, Ahmedabad")
        const geoInfo = await reverseGeocodeCoords(detectedLat, detectedLng);
        const detectedArea = geoInfo.area;
        const detectedCity = geoInfo.city;
        const detectedPincode = geoInfo.pincode;
        const formattedAddress = geoInfo.formattedAddress;

        await createCustomerAddress({
          label: 'Home',
          detail: formattedAddress,
          area: detectedArea,
          city: detectedCity,
          pincode: detectedPincode,
          is_primary: addresses.length === 0,
          lat: detectedLat,
          lng: detectedLng,
        });
        setIsGpsLocatingProfile(false);
        setIsAddingAddress(false);
        await loadAddresses();
      },
      (err) => {
        setIsGpsLocatingProfile(false);
        console.warn('Geolocation error in profile:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleDeleteAddress = async (id: string) => {
    await deleteCustomerAddress(id);
    await loadAddresses();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/signin');
  };

  // Determine real user information based on authentication state
  const displayName = isAuthenticated && user ? user.name : 'Guest User';
  const displayEmail = isAuthenticated && user ? user.email : 'guest@streetbites.in';
  const displayPhone = isAuthenticated && user ? (user.phone_number || 'Not provided') : 'Not signed in';
  const displayRole = isAuthenticated && user ? user.role : 'GUEST';
  const walletBalance = isAuthenticated && user ? (user.wallet_balance || 0) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto md:mt-4 pb-20 font-sans">
      {/* ─── Hero Section ─── */}
      <div className="bg-gradient-to-r from-[#D94A38] to-[#993427] md:rounded-3xl relative overflow-hidden px-6 pt-12 pb-24 md:pt-16 md:pb-28 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white text-[#D94A38] text-3xl font-black flex items-center justify-center shadow-xl border-4 border-white/20">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{displayName}</h1>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isAuthenticated ? 'bg-white/20 text-white' : 'bg-amber-400 text-stone-900'
                  }`}
                >
                  {displayRole}
                </span>
              </div>
              <p className="text-white/80 text-sm font-medium">{displayEmail}</p>
              <p className="text-white/80 text-sm font-medium">{displayPhone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Real Stats Bar ─── */}
      <div className="px-4 sm:px-6 lg:px-8 -mt-12 relative z-20 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-[#EAE4DA] flex justify-between md:justify-around items-center divide-x divide-[#F5F0E8]">
          <div
            className="flex-1 text-center cursor-pointer group"
            onClick={() => navigate(isAuthenticated ? '/orders' : '/signin')}
          >
            <span className="text-[#8E8B85] text-[10px] font-bold uppercase tracking-widest block mb-1">Total Orders</span>
            <span className="text-2xl font-black text-[#1C1917] group-hover:text-[#D94A38] transition-colors">
              {totalOrdersCount}
            </span>
          </div>
          <div className="flex-1 text-center cursor-pointer group" onClick={() => navigate('/favorites')}>
            <span className="text-[#8E8B85] text-[10px] font-bold uppercase tracking-widest block mb-1">Favorites</span>
            <span className="text-2xl font-black text-[#1C1917] group-hover:text-[#D94A38] transition-colors">
              {favorites.length}
            </span>
          </div>
          <div className="flex-1 text-center cursor-pointer group">
            <span className="text-[#8E8B85] text-[10px] font-bold uppercase tracking-widest block mb-1">Wallet Balance</span>
            <span className="text-2xl font-black text-[#1C1917] group-hover:text-[#D94A38] transition-colors">
              ₹{walletBalance}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        {/* ─── Guest Welcome Banner (When Not Logged In) ─── */}
        {!isAuthenticated && (
          <div className="bg-amber-50 border border-[#D94A38] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div>
                <h3 className="font-black text-sm text-black">You are currently browsing in Guest Mode</h3>
                <p className="text-xs text-black mt-0.5">
                  Sign in to save multiple delivery addresses, track live orders, and enjoy seamless ordering.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/signin')}
              className="bg-[#D94A38] hover:bg-[#993427] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0 w-full sm:w-auto text-center"
            >
              Sign In Now
            </button>
          </div>
        )}

        {/* ─── Role Dashboard Shortcut (If Vendor, Rider, or Admin) ─── */}
        {isAuthenticated && user && user.role !== 'CUSTOMER' && (
          <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
                {user.role === 'VENDOR' && <Store className="w-5 h-5 text-amber-400" />}
                {user.role === 'RIDER' && <Bike className="w-5 h-5 text-emerald-400" />}
                {user.role === 'ADMIN' && <ShieldCheck className="w-5 h-5 text-purple-400" />}
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">
                  Authorized Role Access
                </span>
                <span className="font-bold text-sm text-white">Switch to {user.role} Portal</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (user.role === 'VENDOR') navigate('/vendor/Dashboard');
                else if (user.role === 'RIDER') navigate('/rider/Dashboard');
                else if (user.role === 'ADMIN') navigate('/admin/Dashboard');
              }}
              className="bg-white text-stone-900 hover:bg-stone-100 font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Open Dashboard &rarr;
            </button>
          </div>
        )}

        {/* ─── Quick Actions Grid ─── */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate(isAuthenticated ? '/orders' : '/signin')}
            className="bg-white p-4 rounded-2xl border border-[#EAE4DA] hover:border-[#D94A38] hover:shadow-md transition-all group cursor-pointer text-left flex flex-col justify-between min-h-[100px]"
          >
            <div className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#D94A38] flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-[#1C1917]">My Orders</span>
          </button>

          <button
            onClick={() => navigate('/favorites')}
            className="bg-white p-4 rounded-2xl border border-[#EAE4DA] hover:border-pink-500 hover:shadow-md transition-all group cursor-pointer text-left flex flex-col justify-between min-h-[100px]"
          >
            <div className="w-8 h-8 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Heart className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-[#1C1917]">Favorites</span>
          </button>
        </div>

        {/* ─── Account Settings Accordion ─── */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#8E8B85] mb-3 ml-2">Account Settings</h3>
          <div className="bg-white rounded-3xl border border-[#EAE4DA] overflow-hidden shadow-2xs">
            {/* Personal Details */}
            <div>
              <button
                onClick={() => toggleSection('personal')}
                className={`w-full flex items-center justify-between p-5 hover:bg-[#FAF7F2] transition-colors border-b border-[#F5F0E8] cursor-pointer ${
                  openSection === 'personal' ? 'bg-[#FAF7F2]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#D94A38] flex items-center justify-center">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-[#1C1917] block">Personal Details</span>
                    <span className="text-[11px] text-[#8E8B85] font-medium block">Name, Email, Phone number</span>
                  </div>
                </div>
                {openSection === 'personal' ? (
                  <ChevronUp className="w-5 h-5 text-[#D94A38]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#DCD6CC]" />
                )}
              </button>
              {openSection === 'personal' && (
                <div className="p-5 bg-[#FAF7F2]/50 border-b border-[#F5F0E8] text-sm text-[#4B5563] space-y-4 animate-fadeIn">
                  {!isEditingPersonal ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold">Full Name</span>
                        <span className="font-bold text-[#1C1917]">{displayName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold">Email Address</span>
                        <span className="font-bold text-[#1C1917]">{displayEmail}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold">Phone Number</span>
                        <span className="font-bold text-[#1C1917]">{displayPhone}</span>
                      </div>
                      {isAuthenticated ? (
                        <button
                          onClick={() => setIsEditingPersonal(true)}
                          className="text-xs font-bold text-[#D94A38] bg-white border border-[#D94A38] px-4 py-2 rounded-xl hover:bg-[#FCE8E6] transition-colors cursor-pointer mt-2 inline-block"
                        >
                          Edit Details
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate('/signin')}
                          className="text-xs font-bold text-[#D94A38] bg-white border border-[#D94A38] px-4 py-2 rounded-xl hover:bg-[#FCE8E6] transition-colors cursor-pointer mt-2 inline-block"
                        >
                          Sign In
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 bg-white p-4 rounded-xl border border-[#EAE4DA]">
                      {personalError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                          {personalError}
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">Full Name</label>
                        <input
                          type="text"
                          value={personalDetails.name}
                          onChange={(e) => setPersonalDetails({ ...personalDetails, name: e.target.value })}
                          className="w-full text-xs font-bold text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">Email Address</label>
                        <input
                          type="email"
                          disabled
                          value={personalDetails.email}
                          className="w-full text-xs font-bold text-stone-500 bg-stone-100 border border-[#DCD6CC] rounded-lg p-2 outline-none cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                          10-Digit Phone Number
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-xs font-bold text-stone-400 pointer-events-none">+91</span>
                          <input
                            type="tel"
                            maxLength={10}
                            value={personalDetails.phone}
                            onChange={(e) =>
                              setPersonalDetails({ ...personalDetails, phone: e.target.value.replace(/\D/g, '') })
                            }
                            style={{ paddingLeft: '2.8rem' }}
                            className="w-full text-xs font-bold text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                            placeholder="9876543210"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleSavePersonal}
                          disabled={isSavingPersonal}
                          className="text-xs font-bold text-white bg-[#D94A38] px-4 py-2 rounded-xl hover:bg-[#993427] transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {isSavingPersonal ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingPersonal(false);
                            setPersonalError(null);
                          }}
                          disabled={isSavingPersonal}
                          className="text-xs font-bold text-[#8E8B85] bg-transparent border border-[#DCD6CC] px-4 py-2 rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Saved Addresses */}
            <div>
              <button
                onClick={() => toggleSection('addresses')}
                className={`w-full flex items-center justify-between p-5 hover:bg-[#FAF7F2] transition-colors border-b border-[#F5F0E8] cursor-pointer ${
                  openSection === 'addresses' ? 'bg-[#FAF7F2]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#D94A38] flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-[#1C1917] block">Saved Addresses</span>
                    <span className="text-[11px] text-[#8E8B85] font-medium block">
                      {addresses.length} saved location{addresses.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                {openSection === 'addresses' ? (
                  <ChevronUp className="w-5 h-5 text-[#D94A38]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#DCD6CC]" />
                )}
              </button>
              {openSection === 'addresses' && (
                <div className="p-5 bg-[#FAF7F2]/50 border-b border-[#F5F0E8] text-sm text-[#4B5563] space-y-4 animate-fadeIn">
                  {addresses.length === 0 && !isAddingAddress && (
                    <div className="text-center py-6 bg-white rounded-2xl border border-[#EAE4DA] p-4">
                      <p className="text-xs text-stone-500 font-medium mb-3">No saved addresses yet.</p>
                      <button
                        onClick={() => setIsAddingAddress(true)}
                        className="text-xs font-bold text-white bg-[#D94A38] px-4 py-2 rounded-xl hover:bg-[#993427] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Address</span>
                      </button>
                    </div>
                  )}

                  {addresses.length > 0 && (
                    <div className="space-y-3">
                      {addresses.map((addr) => {
                        const addrId = addr.id || addr._id || '';
                        return (
                          <div
                            key={addrId}
                            className="bg-white p-3.5 rounded-xl border border-[#EAE4DA] flex items-start justify-between gap-3 shadow-3xs"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-xs text-[#1C1917]">{addr.label}</span>
                                {addr.is_primary && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#8E8B85] leading-relaxed">{addr.detail}</p>
                              {addr.landmark && (
                                <p className="text-[10px] text-stone-500 mt-0.5">
                                  <span className="font-semibold">Landmark:</span> {addr.landmark}
                                </p>
                              )}
                              <div className="flex gap-3 mt-2">
                                {!addr.is_primary && (
                                  <button
                                    onClick={() => handleSetPrimaryAddress(addrId)}
                                    className="text-[10px] font-bold text-[#D94A38] hover:underline cursor-pointer"
                                  >
                                    Set as Default
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditAddressClick(addr)}
                                  className="text-[10px] font-bold text-stone-600 hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteAddress(addrId)}
                                  className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {!isAddingAddress && (
                        <button
                          onClick={() => setIsAddingAddress(true)}
                          className="text-xs font-bold text-[#D94A38] bg-white border border-[#D94A38] px-4 py-2 rounded-xl hover:bg-[#FCE8E6] transition-colors cursor-pointer inline-flex items-center gap-1.5 w-full justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Another Address</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Add New Address Form */}
                  {isAddingAddress && (
                    <div className="bg-white p-4 rounded-xl border border-[#EAE4DA] space-y-3 shadow-sm">
                      {addressWarning && (
                        <div className="p-3 text-xs bg-amber-50 text-amber-900 border border-amber-300 rounded-xl font-medium flex items-start gap-2.5 shadow-3xs animate-fadeIn">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <strong className="font-bold block text-amber-950 mb-0.5">Enable the Live location first</strong>
                            <span>{addressWarning}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#1C1917]">Add New Delivery Address</h4>
                        <button
                          type="button"
                          onClick={handleAddGpsAddressProfile}
                          disabled={isGpsLocatingProfile}
                          className="text-[11px] font-bold text-white bg-[#D94A38] hover:bg-[#C43D2E] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isGpsLocatingProfile ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Saving GPS...</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3 h-3" />
                              <span>Use Live GPS</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div>
                        <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                          Label (e.g. Home, Office, Other)
                        </label>
                        <input
                          type="text"
                          value={newAddressData.label}
                          onChange={(e) => setNewAddressData({ ...newAddressData, label: e.target.value })}
                          className="w-full text-xs font-bold text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                          placeholder="Home"
                        />
                      </div>

                      {/* Area / Locality (Compulsory *) */}
                      <div>
                        <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                          Area / Locality <span className="text-[#D94A38]">*</span>
                        </label>
                        <input
                          type="text"
                          value={newAddressData.area}
                          onChange={(e) => setNewAddressData({ ...newAddressData, area: e.target.value })}
                          className="w-full text-xs font-semibold text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                          placeholder="e.g. Vastrapur, Bodakdev, Prahlad Nagar"
                        />
                      </div>

                      {/* House / Flat No (Compulsory *) */}
                      <div>
                        <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                          Flat / House / Building Name <span className="text-[#D94A38]">*</span>
                        </label>
                        <input
                          type="text"
                          value={newAddressData.house_no}
                          onChange={(e) => setNewAddressData({ ...newAddressData, house_no: e.target.value })}
                          className="w-full text-xs font-medium text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                          placeholder="e.g. Flat 402, Block B, Shivalik Heights"
                        />
                      </div>

                      {/* Landmark (Optional - no asterisk, no Optional text) */}
                      <div>
                        <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                          Landmark
                        </label>
                        <input
                          type="text"
                          value={newAddressData.landmark}
                          onChange={(e) => setNewAddressData({ ...newAddressData, landmark: e.target.value })}
                          className="w-full text-xs font-medium text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                          placeholder="e.g. Near Swaminarayan Temple, Opp Lake"
                        />
                      </div>

                      {/* City & Pincode (Optional - no asterisk, no Optional text) */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={newAddressData.city}
                            onChange={(e) => setNewAddressData({ ...newAddressData, city: e.target.value })}
                            className="w-full text-xs font-semibold text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                            placeholder="Ahmedabad"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                            Pincode
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={newAddressData.pincode}
                            onChange={(e) => setNewAddressData({ ...newAddressData, pincode: e.target.value.replace(/\D/g, '') })}
                            className="w-full text-xs font-medium text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                            placeholder="380015"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleAddNewAddress}
                          className="text-xs font-bold text-white bg-[#D94A38] px-4 py-2 rounded-xl hover:bg-[#993427] transition-colors cursor-pointer"
                        >
                          Save Address
                        </button>
                        <button
                          onClick={() => setIsAddingAddress(false)}
                          className="text-xs font-bold text-[#8E8B85] bg-transparent border border-[#DCD6CC] px-4 py-2 rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Edit Address Form */}
                  {editingAddressId && (
                    <div className="mt-4 bg-white p-4 rounded-xl border border-[#EAE4DA] space-y-3 shadow-sm">
                      <h4 className="text-xs font-bold text-[#1C1917]">Edit Delivery Address</h4>
                      <div>
                        <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                          Address Label
                        </label>
                        <input
                          type="text"
                          value={editAddressData.label}
                          onChange={(e) => setEditAddressData({ ...editAddressData, label: e.target.value })}
                          className="w-full text-xs font-bold text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                        />
                      </div>

                      {/* Area / Locality (Compulsory *) */}
                      <div>
                        <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                          Area / Locality <span className="text-[#D94A38]">*</span>
                        </label>
                        <input
                          type="text"
                          value={editAddressData.area}
                          onChange={(e) => setEditAddressData({ ...editAddressData, area: e.target.value })}
                          className="w-full text-xs font-semibold text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                          placeholder="e.g. Vastrapur, Bodakdev, Prahlad Nagar"
                        />
                      </div>

                      {/* House / Flat No (Compulsory *) */}
                      <div>
                        <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                          Flat / House / Building Name <span className="text-[#D94A38]">*</span>
                        </label>
                        <input
                          type="text"
                          value={editAddressData.house_no}
                          onChange={(e) => setEditAddressData({ ...editAddressData, house_no: e.target.value })}
                          className="w-full text-xs font-medium text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                        />
                      </div>

                      {/* Landmark (Optional - no asterisk, no Optional text) */}
                      <div>
                        <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                          Landmark
                        </label>
                        <input
                          type="text"
                          value={editAddressData.landmark}
                          onChange={(e) => setEditAddressData({ ...editAddressData, landmark: e.target.value })}
                          className="w-full text-xs font-medium text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                          placeholder="e.g. Near Swaminarayan Temple"
                        />
                      </div>

                      {/* City & Pincode (Optional - no asterisk, no Optional text) */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={editAddressData.city}
                            onChange={(e) => setEditAddressData({ ...editAddressData, city: e.target.value })}
                            className="w-full text-xs font-semibold text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#8E8B85] uppercase tracking-wider block font-bold mb-1">
                            Pincode
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={editAddressData.pincode}
                            onChange={(e) => setEditAddressData({ ...editAddressData, pincode: e.target.value.replace(/\D/g, '') })}
                            className="w-full text-xs font-medium text-[#1C1917] border border-[#DCD6CC] rounded-lg p-2 outline-none focus:border-[#D94A38]"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSaveAddress}
                          className="text-xs font-bold text-white bg-[#D94A38] px-4 py-2 rounded-xl hover:bg-[#993427] transition-colors cursor-pointer"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingAddressId(null)}
                          className="text-xs font-bold text-[#8E8B85] bg-transparent border border-[#DCD6CC] px-4 py-2 rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* App Settings */}
            <div>
              <button
                onClick={() => toggleSection('app')}
                className={`w-full flex items-center justify-between p-5 hover:bg-[#FAF7F2] transition-colors cursor-pointer ${
                  openSection === 'app' ? 'bg-[#FAF7F2]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#D94A38] flex items-center justify-center">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-[#1C1917] block">App Settings</span>
                    <span className="text-[11px] text-[#8E8B85] font-medium block">Notifications, Location</span>
                  </div>
                </div>
                {openSection === 'app' ? (
                  <ChevronUp className="w-5 h-5 text-[#D94A38]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#DCD6CC]" />
                )}
              </button>
              {openSection === 'app' && (
                <div className="p-5 bg-[#FAF7F2]/50 border-t border-[#F5F0E8] text-sm text-[#4B5563] space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#EAE4DA]">
                    <div>
                      <span className="font-bold text-[#1C1917] block text-xs">Notification Permission</span>
                      <span className="text-[10px] text-[#8E8B85]">Receive order updates and offers</span>
                    </div>
                    <button
                      onClick={handleToggleNotifications}
                      className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                        notificationsEnabled ? 'bg-[#D94A38]' : 'bg-[#DCD6CC]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      ></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#EAE4DA]">
                    <div>
                      <span className="font-bold text-[#1C1917] block text-xs">Live Location</span>
                      <span className="text-[10px] text-[#8E8B85]">Better stall recommendations</span>
                    </div>
                    <button
                      onClick={handleToggleLocation}
                      className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                        locationEnabled ? 'bg-[#D94A38]' : 'bg-[#DCD6CC]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          locationEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      ></div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Bottom Action Button (Log Out for User vs Sign In for Guest) ─── */}
        {isAuthenticated ? (
          <button
            className="w-full flex items-center justify-center gap-2 p-4 text-[#D94A38] bg-white rounded-2xl border border-[#EAE4DA] shadow-sm hover:bg-[#FCE8E6] transition-colors mt-8 font-black uppercase tracking-wider text-sm cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 stroke-[2.5]" />
            <span>Log out</span>
          </button>
        ) : (
          <button
            className="w-full flex items-center justify-center gap-2 p-4 text-white bg-[#D94A38] rounded-2xl shadow-sm hover:bg-[#993427] transition-colors mt-8 font-black uppercase tracking-wider text-sm cursor-pointer"
            onClick={() => navigate('/signin')}
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>Sign In to Your Account</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Profile;
