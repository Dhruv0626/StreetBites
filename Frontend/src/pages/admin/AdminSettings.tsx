import React, { useState, useEffect } from 'react';
import { Save, Percent, CloudLightning, ShieldAlert, Loader2, CheckCircle2, RotateCcw, AlertCircle, LogOut, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { settingService } from '../../services/settingService';
import { useAuth } from '../../context/AuthContext';

export const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [baseDeliveryFee, setBaseDeliveryFee] = useState('25');
  const [extraStallFee, setExtraStallFee] = useState('5');
  const [vendorCommission, setVendorCommission] = useState('5');
  const [taxPercentage, setTaxPercentage] = useState('5');

  // Operations Toggles
  const [weatherSurge, setWeatherSurge] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [festivalDays, setFestivalDays] = useState(false);

  // Status & Feedback States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of the Admin Portal?')) {
      setIsLoggingOut(true);
      try {
        await logout();
        navigate('/admin/signin');
      } catch (err: any) {
        console.error('Logout failed:', err);
        navigate('/admin/signin');
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  // Fetch settings from MongoDB schema
  const loadSettings = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await settingService.getPlatformSettings();
      if (res.success && res.data) {
        const s = res.data;
        setBaseDeliveryFee(String(s.base_delivery_fee ?? 25));
        setExtraStallFee(String(s.extra_stall_fee ?? 5));
        setVendorCommission(String(s.vendor_commission_percentage ?? 5));
        setTaxPercentage(String(s.tax_percentage ?? 5));
        setWeatherSurge(Boolean(s.is_weather_surge_enabled));
        setMaintenanceMode(Boolean(s.is_maintenance_mode));
        setFestivalDays(Boolean(s.is_festival_incentive_enabled));
      } else {
        setErrorMessage(res.message || 'Failed to load platform settings');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting to settings API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const payload = {
      base_delivery_fee: Number(baseDeliveryFee) || 25,
      extra_stall_fee: Number(extraStallFee) >= 0 ? Number(extraStallFee) : 10,
      vendor_commission_percentage: Number(vendorCommission) || 5,
      tax_percentage: Number(taxPercentage) || 5,
      is_weather_surge_enabled: weatherSurge,
      is_festival_incentive_enabled: festivalDays,
      is_maintenance_mode: maintenanceMode,
    };

    try {
      const res = await settingService.updatePlatformSettings(payload);
      if (res.success) {
        setSuccessMessage('Platform settings saved successfully to the database schema!');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.message || 'Failed to update platform settings');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving platform settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = async () => {
    if (window.confirm('Reset all platform rates and operations to system default values?')) {
      setIsSaving(true);
      setSuccessMessage(null);
      setErrorMessage(null);
      try {
        const res = await settingService.resetPlatformSettings();
        if (res.success && res.data) {
          const s = res.data;
          setBaseDeliveryFee(String(s.base_delivery_fee ?? 25));
          setExtraStallFee(String(s.extra_stall_fee ?? 10));
          setVendorCommission(String(s.vendor_commission_percentage ?? 5));
          setTaxPercentage(String(s.tax_percentage ?? 5));
          setWeatherSurge(Boolean(s.is_weather_surge_enabled));
          setMaintenanceMode(Boolean(s.is_maintenance_mode));
          setFestivalDays(Boolean(s.is_festival_incentive_enabled));
          setSuccessMessage('Platform settings reset to default values.');
          setTimeout(() => setSuccessMessage(null), 4000);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error resetting platform settings');
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-stone-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D94A38]" />
        <span className="text-xs font-bold">Loading platform settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full animate-fadeIn pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Platform Settings</h1>
          <p className="text-xs text-stone-500 mt-1">Configure global financial rates and live operation modes saved in the database.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSaving || isLoggingOut}
            onClick={handleLogout}
            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2.5 px-4 rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs shrink-0 cursor-pointer disabled:opacity-50"
            title="Log out of Admin Portal"
          >
            {isLoggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            <span>Log Out</span>
          </button>
          <button
            type="button"
            disabled={isSaving || isLoggingOut}
            onClick={handleResetSettings}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 px-4 rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
          <button
            type="button"
            disabled={isSaving || isLoggingOut}
            onClick={handleSaveSettings}
            className="bg-[#1C1917] hover:bg-black text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm shrink-0 cursor-pointer disabled:opacity-75"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save All Changes</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Financial Rates Card */}
        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#EFEBE4]">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 leading-tight">Financial & Tax Rates</h2>
              <p className="text-xs text-stone-500">Global aggregator fees and statutory taxes.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Base Delivery Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={baseDeliveryFee}
                  onChange={(e) => setBaseDeliveryFee(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-900 focus:outline-none focus:border-[#D94A38] transition-colors"
                  placeholder="25"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">First 2 km base charge</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Extra Stall Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={extraStallFee}
                  onChange={(e) => setExtraStallFee(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-900 focus:outline-none focus:border-[#D94A38] transition-colors"
                  placeholder="10"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Per extra stall in multi-stall order</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Vendor Commission (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={vendorCommission}
                  onChange={(e) => setVendorCommission(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-900 focus:outline-none focus:border-[#D94A38] transition-colors"
                  placeholder="5"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Platform fee on vendor sales</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">GST Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-900 focus:outline-none focus:border-[#D94A38] transition-colors"
                  placeholder="5"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Statutory aggregator tax</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Operational Live Modes */}
        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#EFEBE4]">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <CloudLightning className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 leading-tight">Live Operations</h2>
              <p className="text-xs text-stone-500">Real-time emergency & incentive toggles.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <div>
                <h4 className="text-xs font-bold text-stone-900">Weather Surge Pricing</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">+₹15 extra delivery fee for rain/peak traffic.</p>
              </div>
              <button
                type="button"
                onClick={() => setWeatherSurge(!weatherSurge)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center cursor-pointer ${weatherSurge ? 'bg-[#D94A38]' : 'bg-stone-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform absolute ${weatherSurge ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <div>
                <h4 className="text-xs font-bold text-stone-900">Festival Days Incentive</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">Adds flat ₹20 bonus to all rider pickups.</p>
              </div>
              <button
                type="button"
                onClick={() => setFestivalDays(!festivalDays)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center cursor-pointer ${festivalDays ? 'bg-[#D94A38]' : 'bg-stone-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform absolute ${festivalDays ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-900">Maintenance Mode</h4>
                  <p className="text-[11px] text-red-700 mt-0.5">Pauses all new checkout orders globally.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center cursor-pointer ${maintenanceMode ? 'bg-red-600' : 'bg-red-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform absolute ${maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Admin Account & Session Management Card */}
      <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center shrink-0 border border-stone-200">
              <UserCheck className="w-6 h-6 text-[#D94A38]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900">Admin Account & Active Session</h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Superadmin Active
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1 max-w-xl">
                Signed in as <span className="font-semibold text-stone-800">{user?.email || 'admin@streetbites.com'}</span>. Logging out terminates this admin session, clears credentials, and redirects to the administrator login screen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-xs shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>Log Out of Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
