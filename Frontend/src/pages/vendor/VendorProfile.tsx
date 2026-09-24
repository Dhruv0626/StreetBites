import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Store, MapPin, Phone, Mail, Camera, CheckCircle2, AlertCircle, Clock3, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { onboardingService } from '../../services/onboardingService';

export const VendorProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stallData, setStallData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

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
      <div className="mb-8 flex justify-between items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Stall Profile</h1>
          <p className="text-sm text-stone-500 mt-1">Manage your public stall identity, timing, and verification details.</p>
        </div>
        <button
          onClick={handleLogout}  
          className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 px-4 rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer text-xs shrink-0 whitespace-nowrap"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Log Out</span>
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
                <span className="flex items-center gap-1.5"><Clock3 className="w-4 h-4 text-stone-400" /> Open till {openTill}</span>
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

      {/* Verification Status Banner */}
      <div className="mb-6">
        {verificationStatus === 'VERIFIED' ? (
          <div className="bg-emerald-50/90 rounded-3xl p-6 border border-emerald-200 relative overflow-hidden shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900">Verified Stall Partner</h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your stall registration, FSSAI certificate, and identity credentials have been approved by StreetBites Admin.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/vendor/Dashboard/kyc')}
              className="shrink-0 bg-white hover:bg-emerald-100/60 text-emerald-800 font-bold py-2.5 px-4 rounded-xl shadow-xs text-xs transition-colors flex items-center gap-2 cursor-pointer border border-emerald-200 self-start sm:self-auto"
            >
              <span>View Submitted KYC</span>
              <ChevronRight className="w-4 h-4 text-emerald-600" />
            </button>
          </div>
        ) : verificationStatus === 'REJECTED' ? (
          <div className="bg-red-50/90 rounded-3xl p-6 border border-red-200 relative overflow-hidden shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-900">Verification Rejected</h3>
                <p className="text-xs text-red-700 mt-0.5">
                  Your verification documents could not be approved. Please review and update your onboarding records.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <button 
                onClick={() => navigate('/vendor/Dashboard/kyc')}
                className="bg-white hover:bg-stone-50 text-stone-700 font-bold py-2.5 px-3.5 rounded-xl shadow-xs text-xs transition-colors cursor-pointer border border-stone-200"
              >
                View Record
              </button>
              <button 
                onClick={() => navigate('/vendor/registration')}
                className="bg-[#D94A38] hover:bg-[#B83E2F] text-white font-bold py-2.5 px-4 rounded-xl shadow-xs text-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Update Documents</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50/90 rounded-3xl p-6 border border-amber-200 relative overflow-hidden shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <Clock3 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">Verification Pending</h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Your stall documents and identity proofs are submitted and undergoing admin verification review.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/vendor/Dashboard/kyc')}
              className="shrink-0 bg-white hover:bg-amber-100/60 text-amber-900 font-bold py-2.5 px-4 rounded-xl shadow-xs text-xs transition-colors flex items-center gap-2 cursor-pointer border border-amber-200 self-start sm:self-auto"
            >
              <span>Review Submitted KYC</span>
              <ChevronRight className="w-4 h-4 text-amber-600" />
            </button>
          </div>
        )}
      </div>

      {/* 2-Column Grid: Contact Information & Stall Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-3xl border border-[#E7E2D9] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900 mb-5">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-stone-50 border border-stone-100">
                <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-stone-500 shrink-0">
                  <Phone className="w-4 h-4 text-[#D94A38]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Phone Number</p>
                  <p className="text-sm font-bold text-stone-900 truncate">{currentUser?.phone || currentUser?.phone_number || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-stone-50 border border-stone-100">
                <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-stone-500 shrink-0">
                  <Mail className="w-4 h-4 text-[#D94A38]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Email Address</p>
                  <p className="text-sm font-bold text-stone-900 truncate">{currentUser?.email || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stall Details Card */}
        <div className="bg-white rounded-3xl border border-[#E7E2D9] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-stone-900">Stall Details</h4>
              <button
                onClick={() => navigate('/vendor/Dashboard/kyc')}
                className="text-[11px] font-bold text-[#D94A38] hover:underline cursor-pointer"
              >
                View KYC Record
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-4 py-2 border-b border-stone-100">
                <span className="text-stone-500 shrink-0">Stall Type</span>
                <span className="font-bold text-stone-800 text-right truncate">{category}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2 border-b border-stone-100">
                <span className="text-stone-500 shrink-0">Assigned Khau Galli</span>
                <span className="font-bold text-stone-800 text-right truncate">{clusterName}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2 border-b border-stone-100">
                <span className="text-stone-500 shrink-0">FSSAI Document</span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${stallData?.fssai_image_url ? 'text-emerald-700 bg-emerald-50' : 'text-stone-600 bg-stone-100'}`}>
                  {stallData?.fssai_image_url ? 'Attached' : 'Not Provided'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-1.5">
                <span className="text-stone-500 shrink-0">Aadhaar Document</span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${(currentUser?.aadhaar_image_url || stallData?.aadhar_image_url || stallData?.aadhaar_image_url) ? 'text-emerald-700 bg-emerald-50' : 'text-stone-600 bg-stone-100'}`}>
                  {(currentUser?.aadhaar_image_url || stallData?.aadhar_image_url || stallData?.aadhaar_image_url) ? 'Attached' : 'Not Provided'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorProfilePage;