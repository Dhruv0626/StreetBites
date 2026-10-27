import React, { useEffect, useState } from 'react';
import { Bell, Bike, UtensilsCrossed, IndianRupee, X, ChevronRight } from 'lucide-react';

export interface DropNotificationData {
  id?: string;
  title: string;
  message: string;
  type?: 'ORDER' | 'PAYOUT' | 'DELIVERY' | 'PROMO' | 'SYSTEM' | string;
  role?: 'VENDOR' | 'RIDER' | 'CUSTOMER' | 'ADMIN' | string;
  orderId?: string;
  link?: string;
}

interface NotificationDropBannerProps {
  notification: DropNotificationData | null;
  onClose: () => void;
  onAction?: (notification: DropNotificationData) => void;
}

export const NotificationDropBanner: React.FC<NotificationDropBannerProps> = ({
  notification,
  onClose,
  onAction,
}) => {
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    const duration = 6000;
    const interval = 50;
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= decrement) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  const role = (notification.role || '').toUpperCase();
  const type = (notification.type || '').toUpperCase();

  // Role badge & color palette
  let badgeLabel = 'STREETBITES ALERT';
  let badgeColor = 'bg-[#D94A38]/20 text-[#FF7043] border-[#D94A38]/40';
  let IconComponent = Bell;

  if (role === 'VENDOR' || type === 'ORDER') {
    badgeLabel = 'KITCHEN ORDER ALERT';
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    IconComponent = UtensilsCrossed;
  } else if (role === 'RIDER' || type === 'DELIVERY') {
    badgeLabel = 'DELIVERY TASK ALERT';
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    IconComponent = Bike;
  } else if (type === 'PAYOUT') {
    badgeLabel = 'PAYOUT SETTLEMENT';
    badgeColor = 'bg-green-500/20 text-green-300 border-green-500/40';
    IconComponent = IndianRupee;
  }

  const handleBannerClick = () => {
    if (onAction) {
      onAction(notification);
    }

    const targetUrl = notification.link
      ? notification.link
      : role === 'VENDOR'
        ? '/vendor/Dashboard/orders'
        : role === 'RIDER'
          ? '/rider/Dashboard/route'
          : role === 'CUSTOMER'
            ? '/orders'
            : '/notifications';

    if (window.location.pathname !== targetUrl) {
      window.location.href = targetUrl;
    }
    onClose();
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[94%] max-w-lg pointer-events-auto transition-all duration-300 animate-slideDown">
      <div 
        onClick={handleBannerClick}
        className="relative overflow-hidden bg-stone-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-stone-700/80 p-4 cursor-pointer hover:border-stone-500 transition-all group"
      >
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E54B3C] to-transparent opacity-80" />

        <div className="flex items-start gap-3.5">
          {/* Animated Glowing Icon Puck */}
          <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0 text-[#E54B3C] relative shadow-inner group-hover:scale-105 transition-transform">
            <span className="w-2 h-2 rounded-full bg-[#E54B3C] animate-ping absolute -top-0.5 -right-0.5" />
            <IconComponent className="w-5 h-5" />
          </div>

          {/* Notification Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                {badgeLabel}
              </span>
              <span className="text-[11px] text-stone-400 font-medium">Just now</span>
            </div>

            <h4 className="text-sm font-bold text-stone-100 truncate tracking-tight">
              {notification.title}
            </h4>
            <p className="text-xs text-stone-300 mt-0.5 line-clamp-2 leading-relaxed">
              {notification.message}
            </p>

            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-[#E54B3C] group-hover:text-white transition-colors">
              <span>Tap to view details</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-3.5 right-3.5 text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Auto-Dismiss Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800">
          <div 
            className="h-full bg-[#E54B3C] transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
