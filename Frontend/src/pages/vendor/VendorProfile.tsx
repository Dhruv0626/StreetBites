import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Store, MapPin, Phone, Mail, Clock, Camera, CheckCircle2, AlertCircle, Clock3, ChevronRight, LogOut, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { onboardingService } from '../../services/onboardingService';

export const VendorProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stallData, setStallData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const res = await onboardingService.getVendorDetails();
        if (isMounted && res.success && res.data) {
          setStallData(res.data.stall);
          setUserData(res.data.user);
        }
      } catch (err) {
        console.error('Error fetching stall profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/signin');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/signin');
    }
  };

  const currentUser = userData || user;
  const stallName = stallData?.name || currentUser?.name || 'My Stall';
  const category = stallData?.stall_category || 'Street Food';
  const clusterName = stallData?.cluster_id?.name || 'Ahmedabad';
  const description = stallData?.description || 'No stall description provided yet. Update your onboarding details to add a description.';
  const openTill = stallData?.open_till || '11:00 PM';
  const establishedYear = stallData?.since ? `Est. ${stallData.since}` : null;
  const verificationStatus = currentUser?.verification_status || 'PENDING';

  return (
    <div className="animate-fadeIn pb-10 max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Stall Profile</h1>
          <p className="text-sm text-stone-500 mt-1">Manage your public stall identity, timing, and verification details.</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 px-5 rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer text-xs"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-[#E7E2D9] overflow-hidden shadow-sm mb-8">
        {/* Banner Section */}
        <div className="h-48 bg-stone-200 relative group overflow-hidden">
          {stallData?.image_url ? (
            <img 
              src={stallData.image_url} 
              alt={stallName} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#2B1B17] via-[#4A2E2B] to-[#1C1917] flex items-center justify-center text-white/20">
              <Store className="w-24 h-24" />
            </div>
          )}
          <div 
            onClick={() => navigate('/vendor/registration')}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            <div className="bg-white text-stone-900 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-md">
              <Camera className="w-4 h-4" /> Change Stall Photo
            </div>
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="px-6 sm:px-10 pb-10 relative">
          {/* Avatar / Initial */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-4 border-white shadow-md absolute -top-12 sm:-top-14 left-6 sm:left-10 overflow-hidden">
            <div className="w-full h-full bg-[#E54B3C] text-white flex items-center justify-center text-3xl sm:text-4xl font-extrabold select-none">
              {stallName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="pt-16 sm:pt-16 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">{stallName}</h2>
                {establishedYear && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
                    {establishedYear}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-stone-500 mt-2">
                <span className="flex items-center gap-1.5"><Store className="w-4 h-4 text-[#D94A38]" /> {category}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-stone-400" /> {clusterName}</span>
              </div>
              <p className="text-sm text-stone-600 mt-4 leading-relaxed max-w-2xl">
                {description}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button 
                onClick={() => navigate('/vendor/registration')}
                className="shrink-0 bg-[#1C1917] hover:bg-black text-white font-bold py-2.5 px-5 rounded-xl transition-colors shadow-sm self-start cursor-pointer text-xs"
              >
                Edit Onboarding Details
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact & Timing Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-[#E7E2D9] p-6 shadow-sm">
            <h3 className="text-base font-bold text-stone-900 mb-6">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50 border border-transparent">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-500">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Phone Number</p>
                  <p className="text-sm font-bold text-stone-900">{currentUser?.phone || currentUser?.phone_number || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50 border border-transparent">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-500">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Email Address</p>
                  <p className="text-sm font-bold text-stone-900">{currentUser?.email || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E7E2D9] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-stone-900">Operating Hours</h3>
              <button 
                onClick={() => navigate('/vendor/registration')}
                className="text-xs font-bold text-[#D94A38] hover:text-[#B83E2F] cursor-pointer"
              >
                Edit
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-stone-500" />
                <div>
                  <span className="text-sm font-bold text-stone-800">Daily Night Market Timing</span>
                  <p className="text-xs text-stone-500 mt-0.5">Open until {openTill}</p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Schedule
              </span>
            </div>
          </div>
        </div>

        {/* Verification Status Card */}
        <div className="space-y-6">
          {verificationStatus === 'VERIFIED' ? (
            <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-200 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold">Verified Stall</h3>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed mb-6">
                Your stall registration, FSSAI certificate, and identity credentials have been approved by StreetBites Admin.
              </p>
              <button 
                onClick={() => navigate('/vendor/registration')}
                className="w-full bg-white text-emerald-800 font-bold py-2.5 px-4 rounded-xl shadow-xs text-xs hover:bg-emerald-100/50 transition-colors flex justify-between items-center cursor-pointer border border-emerald-200"
              >
                View Submitted KYC
                <ChevronRight className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
          ) : verificationStatus === 'REJECTED' ? (
            <div className="bg-red-50 rounded-3xl p-6 border border-red-200 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2 text-red-800">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold">Verification Rejected</h3>
              </div>
              <p className="text-xs text-red-700 leading-relaxed mb-6">
                Your verification documents could not be approved. Please review and update your documents in Onboarding Details.
              </p>
              <button 
                onClick={() => navigate('/vendor/registration')}
                className="w-full bg-white text-red-700 font-bold py-2.5 px-4 rounded-xl shadow-xs text-xs hover:bg-red-100/50 transition-colors flex justify-between items-center cursor-pointer border border-red-200"
              >
                Update Documents
                <ChevronRight className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2 text-amber-800">
                <Clock3 className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold">Verification Pending</h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed mb-6">
                Your stall documents and identity proofs are submitted and undergoing admin verification review. You can configure your menu and stall details while waiting.
              </p>
              <button 
                onClick={() => navigate('/vendor/registration')}
                className="w-full bg-white text-amber-900 font-bold py-2.5 px-4 rounded-xl shadow-xs text-xs hover:bg-amber-100/50 transition-colors flex justify-between items-center cursor-pointer border border-amber-200"
              >
                Review Submitted KYC
                <ChevronRight className="w-4 h-4 text-amber-600" />
              </button>
            </div>
          )}

          {/* KYC Summary Card */}
          <div className="bg-white rounded-3xl border border-[#E7E2D9] p-6 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">Stall Credentials</h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Stall Category</span>
                <span className="font-bold text-stone-800">{category}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Assigned Khau Galli</span>
                <span className="font-bold text-stone-800">{clusterName}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">FSSAI Document</span>
                <span className="font-bold text-stone-800">{stallData?.fssai_image_url ? 'Attached' : 'Not Provided'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-stone-500">Aadhaar Document</span>
                <span className="font-bold text-stone-800">{currentUser?.aadhaar_image_url || stallData?.aadhar_image_url ? 'Attached' : 'Not Provided'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorProfilePage;