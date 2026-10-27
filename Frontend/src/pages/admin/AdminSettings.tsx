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
  const [riderCashLimit, setRiderCashLimit] = useState('0');

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
        setBaseDeliveryFee(String(s.base_delivery_fee ?? 22));
        setExtraStallFee(String(s.extra_stall_fee ?? 10));
        setVendorCommission(String(s.vendor_commission_percentage ?? 5));
        setTaxPercentage(String(s.tax_percentage ?? 5));
        setRiderCashLimit(String(s.rider_cash_limit ?? 0));
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
      base_delivery_fee: Number(baseDeliveryFee) || 22,
      extra_stall_fee: Number(extraStallFee) >= 0 ? Number(extraStallFee) : 10,
      vendor_commission_percentage: Number(vendorCommission) || 5,
      tax_percentage: Number(taxPercentage) || 5,
      rider_cash_limit: Number(riderCashLimit) >= 0 ? Number(riderCashLimit) : 0,
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
          setBaseDeliveryFee(String(s.base_delivery_fee ?? 22));
          setExtraStallFee(String(s.extra_stall_fee ?? 10));
          setVendorCommission(String(s.vendor_commission_percentage ?? 5));
          setTaxPercentage(String(s.tax_percentage ?? 5));
          setRiderCashLimit(String(s.rider_cash_limit ?? 0));
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
      <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D94A38]" />
        <span className="text-xs font-semibold">Loading platform system settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-fadeIn pb-16 font-sans">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Platform Global Engine Settings</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Configure global financial rates, aggregator commission, statutory taxes, and emergency dispatch switches.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            disabled={isSaving || isLoggingOut}
            onClick={handleResetSettings}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 text-xs shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            disabled={isSaving || isLoggingOut}
            onClick={handleSaveSettings}
            className="bg-[#D94A38] hover:bg-[#C43D2E] text-white font-semibold py-2 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-xs shrink-0 cursor-pointer disabled:opacity-75"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-red-50/90 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Financial Rates Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Financial & Tax Rates</h2>
              <p className="text-xs text-slate-500">Platform billing formulas and statutory taxes.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Base Delivery Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={baseDeliveryFee}
                  onChange={(e) => setBaseDeliveryFee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  placeholder="25"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">First 2 km base charge</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Extra Stall Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={extraStallFee}
                  onChange={(e) => setExtraStallFee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  placeholder="10"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Per extra stall in multi-cart</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Vendor Commission (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={vendorCommission}
                  onChange={(e) => setVendorCommission(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  placeholder="5"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Platform fee on vendor sales</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">GST Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                  placeholder="5"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Statutory aggregator tax</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Rider Max COD Floating Cash Limit (₹)
              </label>
              <input
                type="number"
                min="0"
                value={riderCashLimit}
                onChange={(e) => setRiderCashLimit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#D94A38] focus:bg-white transition-colors"
                placeholder="0"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Maximum floating cash riders can hold before account blocks accepting new COD orders (Default: ₹0).
              </span>
            </div>
          </div>
        </div>

        {/* 2. Operational Live Modes */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shrink-0">
              <CloudLightning className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Live Operation Switches</h2>
              <p className="text-xs text-slate-500">Real-time emergency & incentive toggles.</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl hover:border-slate-300 transition-colors">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Weather Surge Pricing</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">+₹15 extra delivery fee during rain or peak traffic.</p>
              </div>
              <button
                type="button"
                onClick={() => setWeatherSurge(!weatherSurge)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center cursor-pointer shrink-0 ${weatherSurge ? 'bg-[#D94A38]' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-xs transition-transform absolute ${weatherSurge ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl hover:border-slate-300 transition-colors">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Festival Days Incentive</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Adds flat ₹20 bonus to all rider pickups automatically.</p>
              </div>
              <button
                type="button"
                onClick={() => setFestivalDays(!festivalDays)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center cursor-pointer shrink-0 ${festivalDays ? 'bg-[#D94A38]' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-xs transition-transform absolute ${festivalDays ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Platform Maintenance Mode</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">Emergency switch: Pauses all checkout placements platform-wide.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center cursor-pointer shrink-0 ${maintenanceMode ? 'bg-rose-600' : 'bg-rose-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-xs transition-transform absolute ${maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Admin Account & Session Management Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 border border-slate-800">
              <UserCheck className="w-5 h-5 text-[#D94A38]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Administrator Credentials & Active Session</h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Superadmin Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Authenticated as <span className="font-semibold text-slate-800">{user?.email || 'admin@streetbites.com'}</span>. Logging out terminates this session, revokes access tokens, and securely returns to the authentication gate.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="w-full md:w-auto bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-semibold py-2.5 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-xs shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5 text-rose-600" />}
              <span>Log Out Administrator</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

