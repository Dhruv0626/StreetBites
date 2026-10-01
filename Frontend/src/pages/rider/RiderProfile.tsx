import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Shield, Bell, Bike, Map, Smartphone, LogOut,
  CheckCircle2, Clock, XCircle, ExternalLink, CreditCard,
  FileText, Loader2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import onboardingService from '../../services/onboardingService';
import riderService from '../../services/riderService';
import riderAvatarImg from '../../assets/images/rider_avatar.jpg';

export const RiderProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [riderData, setRiderData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [autoAccept, setAutoAccept] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [radius, setRadius] = useState(5);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<string | null>(null);
  const [selectedDocPreview, setSelectedDocPreview] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setFetchError(null);
        const [onboardRes, statsRes] = await Promise.allSettled([
          onboardingService.getRiderDetails({
            userId: user?._id || user?.id,
            email: user?.email,
          }),
          riderService.getStats({
            riderId: user?._id || user?.id,
            email: user?.email,
          }),
        ]);

        if (isMounted) {
          if (onboardRes.status === 'fulfilled' && onboardRes.value?.success) {
            setRiderData(onboardRes.value.data || null);
          }
          if (statsRes.status === 'fulfilled' && statsRes.value?.success && statsRes.value.data) {
            const stats = statsRes.value.data;
            if (stats.deliveryRangeKm) setRadius(stats.deliveryRangeKm);
            if (stats.autoAccept !== undefined) setAutoAccept(Boolean(stats.autoAccept));
            if (stats.pushNotifications !== undefined) setPushNotifs(stats.pushNotifications !== false);
          }
        }
      } catch (err: any) {
        console.error('Failed to load rider details:', err);
        if (isMounted) {
          setFetchError(err?.message || 'Failed to fetch rider profile.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSaveSettings = async (newRadius = radius, newAuto = autoAccept, newPush = pushNotifs) => {
    try {
      setIsSavingSettings(true);
      setSettingsSaveMsg(null);
      const res = await riderService.updateSettings(
        {
          deliveryRangeKm: newRadius,
          autoAccept: newAuto,
          pushNotifications: newPush,
        },
        {
          riderId: user?._id || user?.id,
          email: user?.email,
        }
      );
      if (res.success) {
        setSettingsSaveMsg('Settings updated successfully!');
        setTimeout(() => setSettingsSaveMsg(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/signin');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/signin');
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Verified Rider
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-sm">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Verification Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Verification Pending
          </span>
        );
    }
  };

  const documents = [
    { label: 'Driving License', url: riderData?.dl_image_url },
    { label: 'Aadhaar Card', url: riderData?.aadhaar_image_url },
    { label: 'Vehicle RC Book', url: riderData?.rc_image_url },
    { label: 'Vehicle Insurance', url: riderData?.insurance_image_url },
    { label: 'Number Plate Photo', url: riderData?.vehicle_number_plate_image },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Rider Profile</h1>
          <p className="text-sm text-stone-500 mt-1">Live rider account data and verified documents from your onboarding.</p>
        </div>
        {riderData && getStatusBadge(riderData?.verification_status)}
      </div>

      {isLoading ? (
        <div className="bg-white border border-[#EFEBE4] rounded-3xl p-16 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="w-10 h-10 text-[#D94A38] animate-spin" />
          <p className="text-sm font-bold text-stone-600">Fetching live rider profile & document data...</p>
        </div>
      ) : fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 flex items-center gap-4 text-red-700">
          <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
          <div>
            <h4 className="font-bold text-sm">Failed to Load Profile</h4>
            <p className="text-xs text-red-600 mt-1">{fetchError}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Account Info & Verification */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Card */}
            <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-28 h-28 rounded-full bg-stone-100 border-4 border-white shadow-lg flex items-center justify-center mb-4 overflow-hidden relative group">
                <img
                  src={riderAvatarImg}
                  alt="StreetBites Delivery Rider"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h2 className="text-lg font-bold text-stone-900">{riderData?.name || user?.name || 'StreetBites Rider'}</h2>
              <p className="text-xs font-mono text-stone-500 mb-1">{riderData?.phone || user?.phone_number || 'Phone not linked'}</p>
              <p className="text-xs text-stone-400 mb-6">{riderData?.email || user?.email}</p>

              <div className="w-full space-y-2">
                <button
                  onClick={() => navigate('/rider/registration')}
                  className="w-full bg-[#F4F1EA] hover:bg-[#EFEBE4] text-stone-700 text-sm font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Edit / Update Onboarding
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </div>
            </div>

            {/* Documents Verification Card */}
            <div className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-stone-900 text-sm">Uploaded Documents</h3>
                </div>
                <span className="text-[11px] font-bold text-stone-400">Live Status</span>
              </div>

              <ul className="space-y-3 text-sm">
                {documents.map((doc, idx) => {
                  const isUploaded = Boolean(doc.url);
                  const isVerified = riderData?.verification_status === 'VERIFIED';
                  return (
                    <li key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50/70 border border-stone-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-stone-400" />
                        <span className="text-stone-700 font-medium text-xs">{doc.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isUploaded ? (
                          <>
                            <span className={`font-bold text-[10px] px-2 py-0.5 rounded-md ${isVerified
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-50 text-blue-700'
                              }`}>
                              {isVerified ? 'Verified' : 'Uploaded'}
                            </span>
                            <button
                              onClick={() => setSelectedDocPreview({ title: doc.label, url: doc.url! })}
                              className="text-stone-400 hover:text-stone-700 p-1 hover:bg-stone-200/50 rounded transition-colors"
                              title="View Document"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <span className="text-stone-400 font-medium text-[10px] bg-stone-100 px-2 py-0.5 rounded-md">
                            Not Uploaded
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Right Column: Vehicle & Bank Info & Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle & Payout Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vehicle Details */}
              <div className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                    <Bike className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">Assigned Vehicle</h4>
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Registration</span>
                  </div>
                </div>

                <div className="p-3 bg-[#FAF7F2] rounded-2xl space-y-2 border border-[#EFEBE4]/60">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Vehicle Model</span>
                    <span className="font-bold text-stone-900">{riderData?.vehicle_model || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Vehicle Type</span>
                    <span className="font-bold text-stone-900">Motorcycle / Scooter</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Number Plate</span>
                    <span className={`font-bold ${riderData?.vehicle_number_plate_image ? 'text-emerald-600' : 'text-stone-400'}`}>
                      {riderData?.vehicle_number_plate_image ? 'Registered' : 'Not attached'}
                    </span>
                  </div>
                  {riderData?.vehicle_photo_url && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-stone-200/60">
                      <span className="text-stone-500">Vehicle Photo</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDocPreview({ title: 'Assigned Vehicle Photo', url: riderData.vehicle_photo_url })}
                        className="text-xs font-bold text-[#D94A38] hover:text-[#c43d2e] cursor-pointer underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View Vehicle
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank & Payout Details */}
              <div className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">Payout Account</h4>
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Direct Deposit</span>
                  </div>
                </div>

                <div className="p-3 bg-[#FAF7F2] rounded-2xl space-y-2 border border-[#EFEBE4]/60">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Bank Name</span>
                    <span className="font-bold text-stone-900">{riderData?.bank_name || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Account No</span>
                    <span className="font-bold font-mono text-stone-900">
                      {riderData?.bank_account_no ? `•••• •••• ${riderData.bank_account_no.slice(-4)}` : 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">UPI ID</span>
                    <span className="font-bold font-mono text-stone-900">{riderData?.upi_id || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dispatch Settings */}
            <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Dispatch & Delivery Settings</h3>
                  <p className="text-xs text-stone-500">Configure your order reception radius and preferences.</p>
                </div>
                {settingsSaveMsg && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full animate-fadeIn">
                    ✓ {settingsSaveMsg}
                  </span>
                )}
              </div>

              <div className="space-y-6">
                {/* Toggles */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-stone-500" />
                      <h4 className="font-bold text-stone-900 text-sm">Auto-Accept Orders</h4>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Automatically accept orders assigned within your radius.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoAccept;
                      setAutoAccept(next);
                      handleSaveSettings(radius, next, pushNotifs);
                    }}
                    className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${autoAccept ? 'bg-[#D94A38]' : 'bg-stone-200'}`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${autoAccept ? 'translate-x-5' : 'translate-x-0'} shadow-sm`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-stone-500" />
                      <h4 className="font-bold text-stone-900 text-sm">Push Notifications</h4>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Receive sound alerts for new ready orders and cluster surge bonuses.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !pushNotifs;
                      setPushNotifs(next);
                      handleSaveSettings(radius, autoAccept, next);
                    }}
                    className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${pushNotifs ? 'bg-[#D94A38]' : 'bg-stone-200'}`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${pushNotifs ? 'translate-x-5' : 'translate-x-0'} shadow-sm`} />
                  </button>
                </div>

                {/* Radius Slider */}
                <div className="pt-4 border-t border-[#EFEBE4]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Map className="w-4 h-4 text-stone-500" />
                      <div>
                        <h4 className="font-bold text-stone-900 text-sm">Max Delivery Radius</h4>
                        <span className="text-[11px] text-stone-500">Only orders within this distance from your location will be shown.</span>
                      </div>
                    </div>
                    <span className="font-black text-[#D94A38] text-base px-2.5 py-1 bg-red-50 rounded-lg border border-red-100">{radius} km</span>
                  </div>
                  <input
                    type="range"
                    min="1" max="25" step="1"
                    value={radius}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setRadius(val);
                    }}
                    onMouseUp={() => handleSaveSettings(radius, autoAccept, pushNotifs)}
                    onTouchEnd={() => handleSaveSettings(radius, autoAccept, pushNotifs)}
                    className="w-full accent-[#D94A38] h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs font-bold text-stone-400 mt-2">
                    <span>1 km (Local Cluster only)</span>
                    <span>10 km (Standard)</span>
                    <span>25 km (Whole City)</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveSettings(radius, autoAccept, pushNotifs)}
                    disabled={isSavingSettings}
                    className="bg-stone-900 hover:bg-black text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSavingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {isSavingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">{selectedDocPreview.title}</h3>
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-stone-50 border border-stone-200 max-h-[400px] flex items-center justify-center p-2">
              <img
                src={selectedDocPreview.url}
                alt={selectedDocPreview.title}
                className="max-h-[380px] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <a
                href={selectedDocPreview.url}
                target="_blank"
                rel="noreferrer"
                className="bg-[#D94A38] hover:bg-[#c43d2e] text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Full Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderProfilePage;
