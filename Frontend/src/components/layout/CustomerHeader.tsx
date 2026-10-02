import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  ChevronDown,
  ShoppingBag,
  User,
  Bell,
  Plus,
  Check,
  Home,
  Briefcase
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { getCustomerAddresses, updateCustomerAddress } from '../../services/addressService';
import { AddressModal } from '../customer/AddressModal';
import type { AddressItem } from '../../types';
import logoImg from '../../assets/Logo/Logo.png';
import { notificationService } from '../../services/notificationService';

export const CustomerHeader: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);

  // Real Database Addresses State
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [activeAddress, setActiveAddress] = useState<AddressItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Load real customer addresses from MongoDB
  const loadAddresses = async () => {
    try {
      const saved = await getCustomerAddresses();
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setAddresses(saved);
        const primary = saved.find((a) => a.is_primary) || saved[0];
        setActiveAddress(primary);
      } else {
        setAddresses([]);
        setActiveAddress(null);
      }
    } catch (err) {
      console.warn('Failed to load customer addresses in header:', err);
      setAddresses([]);
      setActiveAddress(null);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [user]);

  // Load unread notifications count
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotifsCount(0);
      return;
    }
    const checkUnread = async () => {
      try {
        const res = await notificationService.getUnreadCount();
        if (res.success && typeof res.count === 'number') {
          setUnreadNotifsCount(res.count);
        }
      } catch (e) {}
    };

    checkUnread();
    const interval = setInterval(checkUnread, 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectAddress = async (addr: AddressItem) => {
    setActiveAddress(addr);
    setIsDropdownOpen(false);
    try {
      const addrId = addr.id || addr._id;
      if (addrId) {
        await updateCustomerAddress(addrId, { is_primary: true });
      }
    } catch (e) {
      console.warn('Failed to set primary address from header:', e);
    }
  };

  const handleAddressCreated = (newAddr: AddressItem) => {
    setAddresses((prev) => [newAddr, ...prev.filter((a) => a.id !== newAddr.id && a._id !== newAddr._id)]);
    setActiveAddress(newAddr);
    setIsDropdownOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const displayName = isAuthenticated && user ? user.name.split(' ')[0] : 'Sign In';

  // Format real display labels for header location
  const locationTitle = activeAddress ? activeAddress.label : 'Select Location';
  const locationSubtitle = activeAddress
    ? (activeAddress.detail ? `${activeAddress.detail}` : "")
    : 'Add delivery address';

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between py-4 px-8 border-b border-[#EFEBE4]/60 bg-white sticky top-0 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        {/* Left Section: Logo & Location */}
        <div className="flex items-center gap-8">
          <Link to="/home" className="flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-[#D94A38] text-white flex items-center justify-center shadow-xs">
              <img src={logoImg} alt="StreetBites" className="w-full h-full object-cover rounded-full" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#1C1917]">
              Street<span className="text-[#D94A38]">Bites</span>
            </span>
          </Link>
          <div className="h-6 w-px bg-[#EFEBE4] mx-2 hidden lg:block"></div>

          {/* Real Customer Location Selector */}
          <div className="relative hidden lg:block" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (addresses.length === 0) {
                  setIsAddressModalOpen(true);
                } else {
                  setIsDropdownOpen(!isDropdownOpen);
                }
              }}
              className="flex items-center gap-2 group hover:text-[#D94A38] transition-colors cursor-pointer bg-transparent border-0 p-0 text-left"
            >
              <MapPin className="w-4 h-4 text-[#D94A38] shrink-0" />
              <div className="text-left max-w-[220px]">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-[#1C1917] cursor-pointer group-hover:text-[#D94A38] border-b-2 border-[#1C1917] group-hover:border-[#D94A38] leading-tight transition-colors truncate">
                    {locationTitle}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#D94A38] mt-0.5 shrink-0" />
                </div>
                <span className="text-[11px] text-[#8E8B85] block mt-0.5 truncate">
                  {locationSubtitle}
                </span>
              </div>
            </button>

            {/* Saved Addresses Dropdown Popover */}
            {isDropdownOpen && (
              <div className="absolute left-0 mt-3 w-80 bg-white rounded-2xl border border-[#EAE4DA] shadow-xl p-3 z-50 animate-fadeIn space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#F5F0E8] px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8E8B85]">
                    Saved Delivery Locations
                  </span>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsAddressModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#D94A38] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add New</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5">
                  {addresses.map((addr) => {
                    const isSelected = activeAddress && (activeAddress.id === addr.id || activeAddress._id === addr._id);
                    return (
                      <button
                        key={addr.id || addr._id}
                        onClick={() => handleSelectAddress(addr)}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-start gap-2.5 transition-all cursor-pointer ${isSelected
                          ? 'border-[#D94A38] bg-[#FAF0ED]/50'
                          : 'border-transparent hover:border-[#EAE4DA] hover:bg-[#FAF7F2]'
                          }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#FAF0ED] text-[#D94A38] flex items-center justify-center shrink-0 mt-0.5">
                          {addr.label === 'Home' && <Home className="w-3.5 h-3.5" />}
                          {addr.label === 'Office' && <Briefcase className="w-3.5 h-3.5" />}
                          {addr.label !== 'Home' && addr.label !== 'Office' && <MapPin className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#1C1917]">{addr.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#D94A38]" />}
                          </div>
                          <p className="text-[10px] text-[#8E8B85] truncate leading-tight mt-0.5">
                            {addr.detail}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#F5F0E8]">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsAddressModalOpen(true);
                    }}
                    className="w-full py-2 bg-[#FAF0ED] text-[#D94A38] hover:bg-[#FCE8E6] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-[#FCE8E6] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Address</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Search, Cart, Profile */}
        <div className="flex items-center gap-6">
          {/* Global Search Bar */}
          <div className="relative flex items-center bg-[#F0ECE4] rounded-full px-4 py-2.5 w-80 border border-transparent focus-within:border-[#DCD6CC] focus-within:bg-white focus-within:shadow-sm transition-all group">
            <Search className="w-4 h-4 mr-3 text-[#9CA3AF] group-focus-within:text-[#D94A38] transition-colors" />
            <input
              type="text"
              placeholder="Search for 'Pav Bhaji'"
              className="bg-transparent outline-none w-full text-sm text-[#1C1917] placeholder-[#9CA3AF]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          <nav className="flex items-center gap-4">
            <button
              onClick={() => navigate('/notifications')}
              className="flex items-center gap-2 text-[#4B5563] cursor-pointer hover:text-[#D94A38] font-bold text-sm transition-colors"
            >
              <div className="relative w-8 h-8 rounded-full bg-[#F0ECE4] flex items-center justify-center group-hover:bg-[#FCE8E6]">
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#D94A38] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-white">
                    {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => navigate('/cart')}
              className="flex items-center gap-2 text-[#4B5563] cursor-pointer hover:text-[#D94A38] font-bold text-sm transition-colors"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 stroke-[2]" />
                <span className="absolute -top-1.5 -right-1.5 bg-[#D94A38] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                  {cartCount}
                </span>
              </div>
              Cart
            </button>

            <button
              onClick={() => navigate(isAuthenticated ? '/profile' : '/signin')}
              className="flex items-center gap-2 text-[#4B5563] cursor-pointer hover:text-[#1C1917] font-bold text-sm transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#F0ECE4] text-[#D94A38] font-bold text-xs flex items-center justify-center overflow-hidden border border-[#E8E2D7]">
                {isAuthenticated && user?.name ? (
                  <span>{user.name.charAt(0).toUpperCase()}</span>
                ) : (
                  <User className="w-4 h-4 text-[#4B5563]" />
                )}
              </div>
              <span>{displayName}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Top Header: App Name with Logo */}
      <header className="md:hidden flex items-center justify-between px-4 pt-3 pb-3 bg-white sticky top-0 z-50 border-b border-[#EFEBE4]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        {/* Left Section: Brand Logo & App Name */}
        <Link to="/home" className="flex items-center gap-2 cursor-pointer no-underline">
          <span className="text-xl font-black tracking-tight text-[#1C1917]">
            Street<span className="text-[#D94A38]">Bites</span>
          </span>
        </Link>

        {/* Right Section: Notifications & Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/notifications')}
            className="relative w-9 h-9 rounded-full bg-[#E5E0D8] text-[#4B5563] flex items-center justify-center border border-[#DCD6CC]"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#D94A38] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-white">
                {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate(isAuthenticated ? '/profile' : '/signin')}
            className="w-9 h-9 rounded-full bg-[#E5E0D8] text-[#4B5563] text-xs font-semibold flex items-center justify-center border border-[#DCD6CC] overflow-hidden"
          >
            {isAuthenticated && user?.name ? (
              <span className="font-bold text-[#D94A38]">{user.name.charAt(0).toUpperCase()}</span>
            ) : (
              <User className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Add Address Modal for instant address creation */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onAddressCreated={handleAddressCreated}
        userName={user?.name}
        userPhone={user?.phone_number}
      />
    </>
  );
};

export default CustomerHeader;
