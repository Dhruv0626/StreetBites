import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Bell,
  Package,
  Tag,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Bike,
  Sparkles,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { notificationService, type AppNotification } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'promos'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await notificationService.getNotifications();
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.warn('Mark all read error:', e);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    const notifId = notif._id || notif.id;
    if (notifId && !notif.is_read) {
      notificationService.markSingleRead(notifId).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => ((n._id || n.id) === notifId ? { ...n, is_read: true } : n))
      );
    }

    if (notif.type === 'ORDER' || notif.type === 'DELIVERY') {
      navigate('/orders');
    } else if (notif.type === 'PROMO') {
      navigate('/offers');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'orders' && (n.type === 'ORDER' || n.type === 'DELIVERY')) return true;
    if (activeTab === 'promos' && (n.type === 'PROMO' || n.type === 'SYSTEM')) return true;
    return false;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotifVisuals = (type: string) => {
    switch (type) {
      case 'ORDER':
        return {
          icon: <Package className="w-5 h-5 text-[#D94A38]" />,
          bg: 'bg-[#FAF0ED]',
          border: 'border-[#FCE8E6]',
          badge: 'Order',
        };
      case 'DELIVERY':
        return {
          icon: <Bike className="w-5 h-5 text-emerald-600" />,
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          badge: 'Delivery',
        };
      case 'PROMO':
        return {
          icon: <Tag className="w-5 h-5 text-[#D94A38]" />,
          bg: 'bg-[#FCE8E6]',
          border: 'border-[#F9C2BD]',
          badge: 'Offer',
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-[#4B5563]" />,
          bg: 'bg-[#FAF7F2]',
          border: 'border-[#EAE4DA]',
          badge: 'Update',
        };
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 mt-4 pb-24 md:pb-8">
      {/* Mobile Header (Hidden on Desktop) */}
      <div className="md:hidden flex items-center justify-between mb-4 sticky top-0 bg-white/90 backdrop-blur-md py-3 z-10 border-b border-[#EAE4DA]">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-[#FAF7F2] flex items-center justify-center border border-[#EAE4DA] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#1C1917]" />
        </button>
        <span className="text-xs font-black uppercase tracking-wider text-[#1C1917]">Notifications</span>
        {unreadCount > 0 ? (
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="text-[10px] font-bold text-[#D94A38] bg-transparent border-0 cursor-pointer p-0"
          >
            Read All
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#1C1917] tracking-tight flex items-center gap-2">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-[#D94A38] text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                {unreadCount} New
              </span>
            )}
          </h1>
          <p className="text-xs text-[#8E8B85] mt-0.5">
            Real-time updates on orders, live food preparation, and exclusive street food offers.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="text-xs font-bold text-[#D94A38] bg-white border border-[#D94A38] hover:bg-[#FAF0ED] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#1C1917] text-white shadow-xs'
              : 'bg-white text-[#4B5563] border border-[#EAE4DA] hover:bg-[#FAF7F2]'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#1C1917] text-white shadow-xs'
              : 'bg-white text-[#4B5563] border border-[#EAE4DA] hover:bg-[#FAF7F2]'
          }`}
        >
          Orders & Deliveries
        </button>
        <button
          onClick={() => setActiveTab('promos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'promos'
              ? 'bg-[#1C1917] text-white shadow-xs'
              : 'bg-white text-[#4B5563] border border-[#EAE4DA] hover:bg-[#FAF7F2]'
          }`}
        >
          Offers & Updates
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-3 animate-fadeIn">
        {isLoading ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#EAE4DA] shadow-3xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#D94A38]" />
            <span className="text-xs text-stone-500 font-medium">Syncing notification hub...</span>
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => {
            const visuals = getNotifVisuals(notif.type);
            const isUnread = !notif.is_read;

            return (
              <div
                key={notif._id || notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`relative bg-white rounded-2xl border p-4 shadow-3xs hover:shadow-md transition-all flex items-start gap-3.5 cursor-pointer ${
                  isUnread
                    ? 'border-[#D94A38]/40 bg-gradient-to-r from-[#FAF0ED]/40 to-white'
                    : 'border-[#EAE4DA]'
                }`}
              >
                {isUnread && (
                  <div className="absolute top-4 left-2 w-1.5 h-1.5 rounded-full bg-[#D94A38] shadow-[0_0_8px_rgba(217,74,56,0.9)]" />
                )}

                <div
                  className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border shadow-inner ${visuals.bg} ${visuals.border}`}
                >
                  {visuals.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded-md bg-[#FAF7F2] border border-[#EAE4DA] text-stone-600">
                        {visuals.badge}
                      </span>
                      <h3
                        className={`text-xs sm:text-sm truncate ${
                          isUnread ? 'font-black text-[#1C1917]' : 'font-bold text-[#4B5563]'
                        }`}
                      >
                        {notif.title}
                      </h3>
                    </div>
                    <span className="text-[10px] text-[#8E8B85] font-medium whitespace-nowrap">
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>

                  <p
                    className={`text-xs leading-relaxed ${
                      isUnread ? 'text-[#1C1917] font-medium' : 'text-[#8E8B85]'
                    }`}
                  >
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    {notif.type === 'ORDER' || notif.type === 'DELIVERY' ? (
                      <span className="text-[10px] font-bold text-[#D94A38] flex items-center gap-1 hover:underline">
                        View in Orders <ChevronRight className="w-3 h-3" />
                      </span>
                    ) : notif.type === 'PROMO' ? (
                      <span className="text-[10px] font-bold text-[#D94A38] flex items-center gap-1 hover:underline">
                        Explore Offers <ChevronRight className="w-3 h-3" />
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#EAE4DA] shadow-3xs">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] flex items-center justify-center mx-auto mb-3 border border-[#EAE4DA]">
              <Bell className="w-6 h-6 text-[#DCD6CC]" />
            </div>
            <h3 className="text-base font-bold text-[#1C1917] mb-1">You're all caught up!</h3>
            <p className="text-xs text-[#8E8B85] max-w-xs mx-auto">
              There are no new notifications in this category right now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
