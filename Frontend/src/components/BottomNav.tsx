import React from 'react';
import { Compass, Search, ShoppingBag, FileText, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  liveOrdersCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, cartCount, liveOrdersCount = 0 }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#EAE4DA] py-2 px-6 flex items-center justify-between z-30 shadow-lg select-none">
      <button
        onClick={() => setActiveTab('discover')}
        className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
          activeTab === 'discover' ? 'text-[#D94A38]' : 'text-[#8E8B85]'
        }`}
      >
        <Compass className="w-5 h-5 stroke-[2]" />
        <span className="text-[10px] font-semibold tracking-tight">Discover</span>
      </button>

      <button
        onClick={() => setActiveTab('search')}
        className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
          activeTab === 'search' ? 'text-[#D94A38]' : 'text-[#8E8B85]'
        }`}
      >
        <Search className="w-5 h-5 stroke-[2]" />
        <span className="text-[10px] font-medium tracking-tight">Search</span>
      </button>

      <button
        onClick={() => setActiveTab('cart')}
        className={`flex flex-col items-center gap-1 transition-colors cursor-pointer relative ${
          activeTab === 'cart' ? 'text-[#D94A38]' : 'text-[#8E8B85]'
        }`}
      >
        <ShoppingBag className="w-5 h-5 stroke-[2]" />
        <span className="text-[10px] font-medium tracking-tight">Cart</span>
        <span className="absolute -top-1 right-1 w-4 h-4 bg-[#D94A38] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {cartCount}
        </span>
      </button>

      <button
        onClick={() => setActiveTab('orders')}
        className={`flex flex-col items-center gap-1 transition-colors cursor-pointer relative ${
          activeTab === 'orders' ? 'text-[#D94A38]' : 'text-[#8E8B85]'
        }`}
      >
        <FileText className="w-5 h-5 stroke-[2]" />
        <span className="text-[10px] font-medium tracking-tight">Orders</span>
        {liveOrdersCount > 0 && (
          <span className="absolute -top-1 right-0 w-2 h-2 bg-[#D94A38] rounded-full animate-ping" />
        )}
      </button>

      <button
        onClick={() => setActiveTab('profile')}
        className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
          activeTab === 'profile' ? 'text-[#D94A38]' : 'text-[#8E8B85]'
        }`}
      >
        <User className="w-5 h-5 stroke-[2]" />
        <span className="text-[10px] font-medium tracking-tight">Profile</span>
      </button>
    </nav>
  );
};

export default BottomNav;
