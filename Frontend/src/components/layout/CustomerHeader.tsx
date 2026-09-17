import React, { useState } from 'react';
import { Search, MapPin, ChevronDown, ShoppingBag, User, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../assets/Logo/Logo.png';

export const CustomerHeader: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const displayName = isAuthenticated && user ? user.name.split(' ')[0] : 'Sign In';

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

          {/* Location Selector */}
          <button className="hidden lg:flex items-center gap-2 group hover:text-[#D94A38] transition-colors">
            <MapPin className="w-4 h-4 text-[#D94A38]" />
            <div className="text-left" onClick={() => { navigate("/profile"); }}>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-[#1C1917] cursor-pointer group-hover:text-[#D94A38] border-b-2 border-[#1C1917] group-hover:border-[#D94A38] leading-tight transition-colors">
                  Navrangpura
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#D94A38] mt-0.5" />
              </div>
              <span className="text-[11px] text-[#8E8B85] block mt-0.5 truncate max-w-[150px]">
                Gujarat University Gate, Ahmedabad
              </span>
            </div>
          </button>
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
                <span className="absolute top-0 right-0 w-2 h-2 bg-[#D94A38] rounded-full border border-white"></span>
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

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 pt-3 pb-3 bg-white sticky top-0 z-50 border-b border-[#EFEBE4]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-[#D94A38]" />
          <div>
            <button className="flex items-center gap-1 font-bold text-base text-[#1C1917] leading-tight">
              <span>Navrangpura</span>
              <ChevronDown className="w-4 h-4 text-[#D94A38]" />
            </button>
            <span className="text-[11px] text-[#6B7280] block truncate max-w-[200px]">
              Gujarat University Gate, Ahmedabad
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/notifications')}
            className="relative w-9 h-9 rounded-full bg-[#E5E0D8] text-[#4B5563] flex items-center justify-center border border-[#DCD6CC]"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D94A38] rounded-full border border-white"></span>
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
    </>
  );
};

export default CustomerHeader;
