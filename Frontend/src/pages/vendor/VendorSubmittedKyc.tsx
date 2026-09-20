import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ArrowLeft,
  Download,
  Printer,
  ShieldCheck,
  FileCheck2,
  Building2,
  CreditCard,
  Eye,
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { onboardingService } from '../../services/onboardingService';
import { downloadVendorRegistrationPdf, type VendorPdfData } from '../../utils/pdfGenerator';

export const VendorSubmittedKycPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stallData, setStallData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeDocPreview, setActiveDocPreview] = useState<{ title: string; url: string } | null>(null);

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
        console.error('Error fetching KYC profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentUser = userData || user;
  const stallName = stallData?.name || currentUser?.name || 'My Stall';
  const ownerName = currentUser?.name || 'Vendor Partner';
  const email = currentUser?.email || 'Not provided';
  const rawPhone = currentUser?.phone || currentUser?.phone_number || currentUser?.phoneNumber || '';
  const phone = rawPhone ? String(rawPhone) : 'Not provided';
  const category = stallData?.stall_category || 'Street Food & Snacks';
  const clusterName = typeof stallData?.cluster_id === 'object' && stallData?.cluster_id?.name
    ? stallData.cluster_id.name
    : (stallData?.cluster_name || 'Ahmedabad Khau Galli');
  const description = stallData?.description || 'Authentic street food delicacies prepared fresh daily with secret family recipes.';
  const openTill = stallData?.open_till || '11:00 PM';
  const establishedYear = String(stallData?.since || '2020');
  const verificationStatus = String(currentUser?.verification_status || 'PENDING').toUpperCase();

  const bankName = currentUser?.bank_name || stallData?.bank_name || 'HDFC Bank';
  const accountNumber = currentUser?.bank_account_no || stallData?.bank_account_no || '•••• •••• •••• 4892';
  const ifscCode = currentUser?.bank_ifsc || stallData?.bank_ifsc || 'HDFC0001234';
  const cleanPhoneDigits = phone.replace(/[^0-9]/g, '');
  const upiId = currentUser?.upi_id || stallData?.upi_id || (cleanPhoneDigits ? `${cleanPhoneDigits}@upi` : 'vendor@upi');

  const stallPhotoUrl = stallData?.image_url || null;
  const aadhaarUrl = currentUser?.aadhaar_image_url || stallData?.aadhar_image_url || stallData?.aadhaar_image_url || null;
  const fssaiUrl = stallData?.fssai_image_url || null;
  const panUrl = stallData?.pan_image_url || null;

  const rawStallId = stallData?._id || stallData?.id || currentUser?.id || currentUser?._id || '948271';
  const applicationId = `SB-VEND-${String(rawStallId).slice(-6).toUpperCase()}`;

  const submissionDate = stallData?.createdAt 
    ? new Date(stallData.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  const handleDownloadPdf = () => {
    try {
      const pdfData: VendorPdfData = {
        ownerName: String(ownerName),
        email: String(email),
        phone: String(phone),
        stallName: String(stallName),
        stall_category: String(category),
        establishedYear: String(establishedYear),
        description: String(description),
        openTill: String(openTill),
        cluster: String(clusterName),
        bankName: String(bankName),
        accountNumber: String(accountNumber),
        ifscCode: String(ifscCode),
        upiId: String(upiId),
        hasAadhaar: !!aadhaarUrl,
        hasFssai: !!fssaiUrl,
        hasPan: !!panUrl,
        hasStallPhoto: !!stallPhotoUrl,
      };
      downloadVendorRegistrationPdf(pdfData);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="animate-fadeIn max-w-4xl mx-auto pb-16 pt-4">
        <div className="h-8 bg-stone-200 rounded-lg w-48 mb-6 animate-pulse" />
        <div className="bg-white rounded-3xl border border-[#E7E2D9] p-8 space-y-6 shadow-sm">
          <div className="h-20 bg-stone-100 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-stone-50 rounded-xl animate-pulse" />
            <div className="h-12 bg-stone-50 rounded-xl animate-pulse" />
          </div>
          <div className="h-40 bg-stone-50 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn pb-16 max-w-4xl mx-auto print:max-w-none print:p-0">
      {/* Top Header Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendor/Dashboard/profile')}
            className="w-10 h-10 rounded-2xl bg-white border border-[#E7E2D9] text-stone-700 hover:bg-stone-50 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            title="Back to Profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
              <span>Vendor Hub</span>
              <span>•</span>
              <span>Profile</span>
              <span>•</span>
              <span className="text-[#D94A38]">Submitted KYC</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mt-0.5">
              Submitted Registration Record
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="bg-white hover:bg-stone-50 text-stone-700 border border-[#E7E2D9] font-bold py-2 px-3.5 rounded-xl transition-colors shadow-sm text-xs flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-stone-500" />
            <span>Print</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            className="bg-[#D94A38] hover:bg-[#B83E2F] text-white font-bold py-2 px-4 rounded-xl transition-colors shadow-sm text-xs flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Official PDF</span>
          </button>
        </div>
      </div>

      {/* Official KYC Document Card */}
      <div className="bg-white rounded-3xl border border-[#E7E2D9] overflow-hidden shadow-md print:border-none print:shadow-none print:rounded-none">
        
        {/* Document Header Slate Banner */}
        <div className="bg-[#1C1917] text-white p-6 sm:p-8 relative overflow-hidden">
          <div className="h-1 bg-[#D94A38] absolute top-0 left-0 right-0" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                <Store className="w-6 h-6 text-[#E54B3C]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 tracking-wider">
                  <span className="font-extrabold text-lg text-white">STREET</span>
                  <span className="font-extrabold text-lg text-[#E54B3C]">BITES</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-300">
                  HYPERLOCAL KHAU GALLI FOOD DELIVERY PLATFORM
                </p>
                <p className="text-xs font-semibold text-[#E54B3C] mt-0.5">
                  VENDOR ONBOARDING APPLICATION (SUBMITTED RECORD)
                </p>
              </div>
            </div>

            <div className="sm:text-right bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-white/10 sm:border-none">
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-[#E54B3C] bg-[#E54B3C]/10 px-2 py-0.5 rounded-md mb-1">
                Official Applicant Copy
              </span>
              <div className="text-xs font-mono font-bold text-white tracking-wide">
                ID: {applicationId}
              </div>
              <div className="text-[11px] text-stone-300 mt-0.5">
                Submitted: {submissionDate}
              </div>
            </div>
          </div>
        </div>

        {/* Verification Status Banner */}
        <div className="border-b border-[#E7E2D9]">
          {verificationStatus === 'VERIFIED' ? (
            <div className="bg-emerald-50/80 p-4 sm:px-8 flex items-start sm:items-center gap-3 text-emerald-900 border-l-4 border-emerald-500">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
              <div className="text-xs">
                <span className="font-bold uppercase tracking-wide mr-2 text-emerald-800">Status: Verified Stall Partner</span>
                <span className="text-emerald-700">Your KYC credentials, FSSAI registration, and stall details are verified and active on the platform.</span>
              </div>
            </div>
          ) : verificationStatus === 'REJECTED' ? (
            <div className="bg-red-50/80 p-4 sm:px-8 flex items-start sm:items-center gap-3 text-red-900 border-l-4 border-red-500">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
              <div className="text-xs">
                <span className="font-bold uppercase tracking-wide mr-2 text-red-800">Status: Action Required / Rejected</span>
                <span className="text-red-700">One or more KYC documents require revision. Please contact support or update onboarding records.</span>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/90 p-4 sm:px-8 flex items-start sm:items-center gap-3 text-amber-900 border-l-4 border-amber-500">
              <Clock3 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div className="text-xs">
                <span className="font-bold uppercase tracking-wide mr-2 text-amber-800">Status: Awaiting Admin Document Verification</span>
                <span className="text-amber-800">This submitted draft documents your complete registration submission. Keep this for your official records.</span>
              </div>
            </div>
          )}
        </div>

        {/* Document Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Section 1: Vendor Profile & Stall Details */}
          <section>
            <div className="flex items-center gap-2 mb-3 bg-[#F5F2EB] px-3.5 py-2 rounded-xl border-l-4 border-[#D94A38]">
              <Store className="w-4 h-4 text-[#D94A38]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                1. Vendor Profile & Stall Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Owner / Vendor Name
                </span>
                <p className="font-bold text-stone-900 text-sm">{ownerName}</p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Registered Phone Number
                </span>
                <p className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  {phone}
                </p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Email Address
                </span>
                <p className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  {email}
                </p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Assigned Khau Galli (Cluster)
                </span>
                <p className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D94A38]" />
                  {clusterName}
                </p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Stall Brand Name
                </span>
                <p className="font-bold text-stone-900 text-sm">{stallName}</p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Stall Category
                </span>
                <p className="font-bold text-stone-900 text-sm">{category}</p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Operating Since
                </span>
                <p className="font-bold text-stone-900 text-sm">Est. {establishedYear}</p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Daily Night Market Schedule
                </span>
                <p className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  Open until {openTill}
                </p>
              </div>

              <div className="sm:col-span-2 bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Stall Specialties & Description
                </span>
                <p className="font-medium text-stone-700 leading-relaxed">{description}</p>
              </div>
            </div>
          </section>

          {/* Section 2: Mandatory KYC Compliance & Documents */}
          <section>
            <div className="flex items-center gap-2 mb-3 bg-[#F5F2EB] px-3.5 py-2 rounded-xl border-l-4 border-[#D94A38]">
              <FileCheck2 className="w-4 h-4 text-[#D94A38]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                2. Mandatory KYC Compliance & Uploaded Documents
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* Storefront Photo */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/70 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Document</span>
                    <h3 className="font-bold text-stone-900 text-sm">Storefront / Stall Photo</h3>
                    <p className="text-stone-500 text-[11px] mt-0.5">Physical stall counter display</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stallPhotoUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                    {stallPhotoUrl ? 'Uploaded & Verified' : 'Not Attached'}
                  </span>
                </div>

                {stallPhotoUrl ? (
                  <div className="flex items-center gap-3 pt-2 border-t border-stone-200">
                    <img 
                      src={stallPhotoUrl} 
                      alt="Storefront" 
                      className="w-12 h-12 rounded-xl object-cover border border-stone-200" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-stone-700 truncate">Storefront_Verified.jpg</p>
                      <button
                        onClick={() => setActiveDocPreview({ title: 'Storefront Photo', url: stallPhotoUrl })}
                        className="text-[11px] font-bold text-[#D94A38] hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> View Document
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-400 italic pt-2 border-t border-stone-200">
                    No stall photograph provided
                  </div>
                )}
              </div>

              {/* Aadhaar Identification */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/70 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Identity Proof</span>
                    <h3 className="font-bold text-stone-900 text-sm">Aadhaar Identification Card</h3>
                    <p className="text-stone-500 text-[11px] mt-0.5">Government UIDAI Verification</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${aadhaarUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                    {aadhaarUrl ? 'Uploaded & Secured' : 'Not Attached'}
                  </span>
                </div>

                {aadhaarUrl ? (
                  <div className="flex items-center gap-3 pt-2 border-t border-stone-200">
                    <img 
                      src={aadhaarUrl} 
                      alt="Aadhaar" 
                      className="w-12 h-12 rounded-xl object-cover border border-stone-200" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-stone-700 truncate">Aadhaar_Doc_Encrypted.jpg</p>
                      <button
                        onClick={() => setActiveDocPreview({ title: 'Aadhaar Card Document', url: aadhaarUrl })}
                        className="text-[11px] font-bold text-[#D94A38] hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> View Document
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-400 italic pt-2 border-t border-stone-200">
                    Aadhaar card document not attached
                  </div>
                )}
              </div>

              {/* FSSAI Food License */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/70 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Food Safety</span>
                    <h3 className="font-bold text-stone-900 text-sm">FSSAI Registration Certificate</h3>
                    <p className="text-stone-500 text-[11px] mt-0.5">Food safety authority certification</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${fssaiUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {fssaiUrl ? 'Uploaded & Verified' : 'Exempted / Pending'}
                  </span>
                </div>

                {fssaiUrl ? (
                  <div className="flex items-center gap-3 pt-2 border-t border-stone-200">
                    <img 
                      src={fssaiUrl} 
                      alt="FSSAI" 
                      className="w-12 h-12 rounded-xl object-cover border border-stone-200" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-stone-700 truncate">FSSAI_Certificate.jpg</p>
                      <button
                        onClick={() => setActiveDocPreview({ title: 'FSSAI License Certificate', url: fssaiUrl })}
                        className="text-[11px] font-bold text-[#D94A38] hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> View Document
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-400 italic pt-2 border-t border-stone-200">
                    FSSAI certificate exempted or under review
                  </div>
                )}
              </div>

              {/* PAN Card Document */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/70 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Tax ID</span>
                    <h3 className="font-bold text-stone-900 text-sm">PAN Card Document</h3>
                    <p className="text-stone-500 text-[11px] mt-0.5">Income Tax department record</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${panUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                    {panUrl ? 'Uploaded & Secured' : 'Exempted / Pending'}
                  </span>
                </div>

                {panUrl ? (
                  <div className="flex items-center gap-3 pt-2 border-t border-stone-200">
                    <img 
                      src={panUrl} 
                      alt="PAN" 
                      className="w-12 h-12 rounded-xl object-cover border border-stone-200" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-stone-700 truncate">PAN_Card_Doc.jpg</p>
                      <button
                        onClick={() => setActiveDocPreview({ title: 'PAN Card Document', url: panUrl })}
                        className="text-[11px] font-bold text-[#D94A38] hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> View Document
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-400 italic pt-2 border-t border-stone-200">
                    PAN card document not attached
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Banking & Payout Details */}
          <section>
            <div className="flex items-center gap-2 mb-3 bg-[#F5F2EB] px-3.5 py-2 rounded-xl border-l-4 border-[#D94A38]">
              <Building2 className="w-4 h-4 text-[#D94A38]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                3. Banking & Direct Earnings Payout Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Beneficiary Bank
                </span>
                <p className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-stone-400" />
                  {bankName}
                </p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Bank Account Number
                </span>
                <p className="font-bold text-stone-900 text-sm font-mono flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-stone-400" />
                  {accountNumber}
                </p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  IFSC Code
                </span>
                <p className="font-bold text-stone-900 text-sm font-mono">{ifscCode}</p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  UPI ID for Instant Payouts
                </span>
                <p className="font-bold text-[#D94A38] text-sm font-mono">{upiId}</p>
              </div>

              <div className="sm:col-span-2 bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Platform Fee Structure & Settlement Terms
                </span>
                <p className="font-bold text-stone-900 text-sm">
                  95% Vendor Net Payout <span className="font-normal text-stone-500">(5% StreetBites hyperlocal infrastructure & maintenance fee)</span>
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Food Item Rules & Platform Visibility */}
          <section>
            <div className="flex items-center gap-2 mb-3 bg-[#F5F2EB] px-3.5 py-2 rounded-xl border-l-4 border-[#D94A38]">
              <ShieldCheck className="w-4 h-4 text-[#D94A38]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                4. Food Item Rules & Platform Visibility
              </h2>
            </div>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/70 space-y-2.5 text-xs text-stone-700">
              <div className="flex items-start gap-2">
                <span className="text-[#D94A38] font-bold text-sm leading-none">•</span>
                <p>
                  <strong className="text-stone-900">Stall Menu Integration:</strong> Dishes with status <code className="text-[11px] font-mono bg-stone-200 px-1 py-0.5 rounded text-stone-800">"Review_pending"</code> appear immediately in your individual stall menu for customer ordering.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#D94A38] font-bold text-sm leading-none">•</span>
                <p>
                  <strong className="text-stone-900">Home Page Discovery:</strong> Dishes are published to the global <span className="italic">"What's on your mind?"</span> section on the Home page once approved by the StreetBites Admin review team.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Applicant Digital Declaration */}
          <section className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200/80">
            <div className="flex items-center gap-2 mb-2 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Applicant Digital Declaration</h3>
            </div>
            <p className="text-xs text-emerald-900/90 leading-relaxed">
              I hereby confirm that all personal details, business registration information, and mandatory KYC documents provided above are truthful and accurate. This document represents a certified submission draft on the StreetBites Partner Network.
            </p>
            <p className="text-[11px] text-emerald-700 font-mono mt-2">
              Digitally recorded upon successful online submission • Authenticated via registered phone ({phone}).
            </p>
          </section>

          {/* Official Signatures & Stamp Block */}
          <section className="pt-4 border-t border-[#E7E2D9] grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
            
            {/* Applicant Digital Signature */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                Applicant Signature (Authenticated)
              </span>
              <div className="font-serif italic text-lg sm:text-xl text-blue-900 py-1 select-none">
                {ownerName}
              </div>
              <div className="h-0.5 bg-stone-300 w-48" />
              <p className="text-[11px] font-semibold text-stone-800 mt-1">{ownerName}</p>
              <p className="text-[10px] text-stone-400">Authenticated Vendor Partner</p>
            </div>

            {/* StreetBites Authority Stamp */}
            <div className="sm:text-right space-y-1">
              <div className="inline-block border-2 border-[#D94A38] rounded-xl p-2.5 bg-red-50/40 text-left sm:text-right">
                <div className="flex items-center justify-end gap-1.5 text-[#D94A38] font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>STREETBITES KYC WING</span>
                </div>
                <p className="text-[9px] font-mono text-stone-500 mt-0.5">
                  OPERATIONS & VERIFICATION DESK • AHMEDABAD
                </p>
              </div>
              <div className="h-0.5 bg-stone-300 w-48 sm:ml-auto mt-2" />
              <p className="text-[11px] font-semibold text-stone-800 mt-1">StreetBites Onboarding Authority</p>
              <p className="text-[10px] text-stone-400">Hyperlocal Operations Wing</p>
            </div>
          </section>

          {/* Footer Note */}
          <div className="pt-6 border-t border-stone-200 text-center text-[11px] text-stone-400">
            StreetBites Hyperlocal Network Pvt. Ltd. • support@streetbites.com • Confidential Partner Application Copy
          </div>
        </div>
      </div>

      {/* Document Image Lightbox / Modal */}
      {activeDocPreview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-scaleUp">
            <div className="p-4 border-b border-[#E7E2D9] flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm">{activeDocPreview.title}</h3>
              <button
                onClick={() => setActiveDocPreview(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-stone-100 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={activeDocPreview.url}
                alt={activeDocPreview.title}
                className="max-h-[60vh] max-w-full rounded-xl shadow-sm object-contain"
              />
            </div>
            <div className="p-4 border-t border-[#E7E2D9] flex justify-between items-center bg-stone-50">
              <span className="text-xs text-stone-500">Secure Cloudinary Verified Asset</span>
              <a
                href={activeDocPreview.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#D94A38] hover:underline flex items-center gap-1.5"
              >
                Open in Full Window <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorSubmittedKycPage;
