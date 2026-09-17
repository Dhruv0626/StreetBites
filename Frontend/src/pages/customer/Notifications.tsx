import React, { useState } from 'react';
import { ArrowLeft, Bell, Package, Tag, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'promos'>('all');

  const notifications = [
    {
      id: 1,
      type: 'order',
      title: 'Order MO-77213 Delivered! 🎉',
      message: 'Your order from Manek Chowk has been delivered. Enjoy your meal and please rate the stalls.',
      time: '10 min ago',
      unread: true,
      icon: <Package className="w-5 h-5 text-[#137333]" />,
      bg: 'bg-[#E6F4EA]',
      border: 'border-[#A7E1BA]'
    },
    {
      id: 2,
      type: 'promo',
      title: 'Flat ₹50 Off on Urban Chowk',
      message: 'Craving late-night snacks? Use code MIDNIGHT50 to get ₹50 off your next order from Urban Chowk.',
      time: '2 hours ago',
      unread: true,
      icon: <Tag className="w-5 h-5 text-[#D94A38]" />,
      bg: 'bg-[#FCE8E6]',
      border: 'border-[#F9C2BD]'
    },
    {
      id: 3,
      type: 'system',
      title: 'Welcome to StreetBites!',
      message: 'Explore the best street food clusters in your city, order from multiple stalls, and pay just one delivery fee.',
      time: '2 days ago',
      unread: false,
      icon: <Bell className="w-5 h-5 text-[#4B5563]" />,
      bg: 'bg-[#FAF7F2]',
      border: 'border-[#EAE4DA]'
    },
    {
      id: 4,
      type: 'order',
      title: 'Order MO-77145 Collected',
      message: 'Your rider Aditya has picked up your order from Gwalia Sweets and is heading your way.',
      time: 'Oct 05, 7:15 PM',
      unread: false,
      icon: <CheckCircle2 className="w-5 h-5 text-[#B76E00]" />,
      bg: 'bg-[#FFF8F0]',
      border: 'border-[#FFE1C2]'
    }
  ];

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'orders' && n.type === 'order') return true;
    if (activeTab === 'promos' && n.type === 'promo') return true;
    return false;
  });

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 mt-4 pb-24 md:pb-8">
      {/* Mobile Header (Hidden on Desktop) */}
      <div className="md:hidden flex items-center justify-between mb-6 sticky top-0 bg-white/80 backdrop-blur-md py-4 z-10 border-b border-[#EAE4DA]">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#FAF7F2] flex items-center justify-center border border-[#EAE4DA] cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-[#1C1917]" />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-[#8E8B85]">Notifications</span>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#1C1917] tracking-tight">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-3 align-middle bg-[#D94A38] text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {unreadCount} New
              </span>
            )}
          </h1>
          <p className="text-sm text-[#8E8B85] mt-1">Stay updated on your orders and exclusive offers.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'all' 
            ? 'bg-[#1C1917] text-white shadow-md' 
            : 'bg-white text-[#4B5563] border border-[#EAE4DA] hover:bg-[#FAF7F2]'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'orders' 
            ? 'bg-[#1C1917] text-white shadow-md' 
            : 'bg-white text-[#4B5563] border border-[#EAE4DA] hover:bg-[#FAF7F2]'
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setActiveTab('promos')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'promos' 
            ? 'bg-[#1C1917] text-white shadow-md' 
            : 'bg-white text-[#4B5563] border border-[#EAE4DA] hover:bg-[#FAF7F2]'
          }`}
        >
          Promotions
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-4 animate-fadeIn">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`relative bg-white rounded-3xl border border-[#EAE4DA] p-5 shadow-2xs hover:shadow-md transition-shadow flex items-start gap-4 ${notif.unread ? 'bg-gradient-to-r from-[#FAF7F2] to-white' : ''}`}
            >
              {notif.unread && (
                <div className="absolute top-1/2 -translate-y-1/2 left-2 w-1.5 h-1.5 rounded-full bg-[#D94A38] shadow-[0_0_8px_rgba(217,74,56,0.8)]" />
              )}
              
              <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center border ${notif.bg} ${notif.border}`}>
                {notif.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className={`text-sm truncate pr-2 ${notif.unread ? 'font-black text-[#1C1917]' : 'font-bold text-[#4B5563]'}`}>
                    {notif.title}
                  </h3>
                  <span className="text-[10px] text-[#8E8B85] font-semibold whitespace-nowrap mt-0.5">
                    {notif.time}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${notif.unread ? 'text-[#4B5563] font-medium' : 'text-[#8E8B85]'}`}>
                  {notif.message}
                </p>
                
                {notif.type === 'promo' && (
                  <button className="mt-3 bg-white border border-[#EAE4DA] text-[#1C1917] text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1 hover:border-[#D94A38] hover:text-[#D94A38] transition-colors cursor-pointer shadow-3xs">
                    Claim Offer <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {notif.type === 'order' && notif.unread && (
                  <button onClick={() => navigate('/orders')} className="mt-3 bg-[#D94A38] text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#C43D2E] transition-colors cursor-pointer shadow-sm">
                    Track Order
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#EAE4DA] shadow-3xs">
            <div className="w-16 h-16 rounded-full bg-[#FAF7F2] flex items-center justify-center mx-auto mb-4 border border-[#EAE4DA]">
              <Bell className="w-6 h-6 text-[#DCD6CC]" />
            </div>
            <h3 className="text-lg font-bold text-[#1C1917] mb-2">You're all caught up!</h3>
            <p className="text-sm text-[#8E8B85] max-w-xs mx-auto">
              There are no new notifications in this category right now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
