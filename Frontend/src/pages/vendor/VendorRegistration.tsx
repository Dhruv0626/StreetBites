import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronLeft,
  MoreHorizontal,
  Check,
  UploadCloud,
  CheckCircle2,
  MapPin,
  Info,
  Lock,
  AlertCircle,
  Loader2,
  Trash2,
  FileText,
  Upload,
  FileDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { onboardingService } from '../../services/onboardingService';
import { clusterService, type ClusterData } from '../../services/clusterService';
import { downloadVendorRegistrationPdf } from '../../utils/pdfGenerator';

interface VendorData {
  ownerName: string;
  email: string;
  phone: string;
  aadhaarPhoto: string | null;
  stallName: string;
  stall_category: string;
  establishedYear: string;
  description: string;
  openTill: string;
  stallPhoto: string | null;
  fssaiPhoto: string | null;
  panPhoto: string | null;
  cluster: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

export const VendorRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  // Multi-step: 1: Owner, 2: Stall & KYC, 3: Cluster, 4: Payout, 5: Review
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [isLoadingClusters, setIsLoadingClusters] = useState<boolean>(true);

  // Vendor Data State (Pre-filled from registered account / OAuth)
  const [formData, setFormData] = useState<VendorData>({
    ownerName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone_number || '',
    aadhaarPhoto: null,
    stallName: '',
    stall_category: 'Fast Food & Dosa',
    establishedYear: '',
    description: '',
    openTill: '',
    stallPhoto: null,
    fssaiPhoto: null,
    panPhoto: null,
    cluster: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
  });

  // Fetch Clusters dynamically from MongoDB Database
  useEffect(() => {
    const fetchClustersFromDB = async () => {
      setIsLoadingClusters(true);
      try {
        const res = await clusterService.getClusters();
        if (res.success && res.data && res.data.length > 0) {
          setClusters(res.data);
          setFormData(prev => ({
            ...prev,
            cluster: prev.cluster && res.data!.some(c => c.name === prev.cluster)
              ? prev.cluster
              : res.data![0].name,
          }));
        }
      } catch (err) {
        console.error('Failed to load clusters from database:', err);
      } finally {
        setIsLoadingClusters(false);
      }
    };

    fetchClustersFromDB();
  }, []);

  // Keep synced if user session loads asynchronously
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        ownerName: prev.ownerName || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone_number || '',
      }));
    }
  }, [user]);

  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Handle simple input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle photo file uploads with client-side rules (.JPG, .JPEG, .PNG up to 500KB)
  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: keyof VendorData,
    fieldLabel: string = "Document"
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setErrorMessage(null);

      // Validate allowed extensions & mime types (.JPG, .JPEG, .PNG)
      const allowedExtensions = ["jpg", "jpeg", "png"];
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];
      const isExtValid = allowedExtensions.includes(ext);
      const isMimeValid = allowedMimes.includes(file.type.toLowerCase()) || file.type === "";

      if (!isExtValid || !isMimeValid) {
        setErrorMessage(
          `${fieldLabel}: Invalid file format (.${ext.toUpperCase() || 'UNKNOWN'}). Only .JPG, .JPEG, and .PNG document images are allowed.`
        );
        e.target.value = "";
        return;
      }

      // Validate 1MB max file size (1024 * 1024 bytes)
      const MAX_SIZE_BYTES = 1024 * 1024;
      if (file.size > MAX_SIZE_BYTES) {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        setErrorMessage(
          `${fieldLabel}: File size (${sizeInMB} MB) exceeds the 1MB limit. Please choose or compress an image under 1MB.`
        );
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          [fieldName]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Check details completion for checklist updates
  const isOwnerStepComplete = formData.ownerName.trim() !== '' && formData.phone.trim() !== '' && formData.aadhaarPhoto !== null;
  const isStallStepComplete = formData.stallName.trim() !== '' && formData.stall_category.trim() !== '' && formData.stallPhoto !== null;
  const isClusterStepComplete = formData.cluster !== '';
  const isPayoutStepComplete = formData.bankName.trim() !== '' && formData.accountNumber.trim() !== '' && formData.ifscCode.trim() !== '';

  // Step Validation & Navigation
  const handleNextStep = async () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsSubmitting(true);
      setErrorMessage(null);
      try {
        const res = await onboardingService.submitVendorOnboarding({
          ownerName: formData.ownerName,
          email: formData.email,
          phone: formData.phone,
          aadhaarPhoto: formData.aadhaarPhoto,
          stallName: formData.stallName,
          stall_category: formData.stall_category,
          establishedYear: formData.establishedYear,
          description: formData.description,
          openTill: formData.openTill,
          stallPhoto: formData.stallPhoto,
          fssaiPhoto: formData.fssaiPhoto,
          panPhoto: formData.panPhoto,
          cluster: formData.cluster,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          upiId: formData.upiId,
        });

        if (res.success) {
          triggerVendorPdfDownload();
          setSubmitSuccess(true);
        } else {
          setErrorMessage(res.message || 'Failed to submit vendor application');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error uploading KYC documents to Cloudinary');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Helper to generate & download official vendor draft application PDF
  const triggerVendorPdfDownload = () => {
    try {
      const selectedClusterName =
        clusters.find(c => c.id === formData.cluster)?.name || formData.cluster || 'Ahmedabad Khau Galli';
      downloadVendorRegistrationPdf({
        ownerName: formData.ownerName,
        email: formData.email,
        phone: formData.phone,
        stallName: formData.stallName,
        stall_category: formData.stall_category,
        establishedYear: formData.establishedYear,
        description: formData.description,
        openTill: formData.openTill,
        cluster: selectedClusterName,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        upiId: formData.upiId,
        hasAadhaar: Boolean(formData.aadhaarPhoto),
        hasFssai: Boolean(formData.fssaiPhoto),
        hasPan: Boolean(formData.panPhoto),
        hasStallPhoto: Boolean(formData.stallPhoto),
      });
    } catch (err) {
      console.error('Failed to generate vendor registration PDF:', err);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Helper render function for Document Upload Cards with Previews
  const renderUploadCard = (
    label: string,
    sublabel: string,
    value: string | null,
    fieldName: keyof VendorData
  ) => {
    return (
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">
          {label}
        </label>
        {value ? (
          <div className="relative rounded-2xl overflow-hidden border border-emerald-200 bg-emerald-50/40 p-3 flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-stone-200 shrink-0 bg-stone-100">
                <img src={value} alt={label} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-emerald-800 text-xs font-bold truncate">
                  <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600 shrink-0" />
                  <span>Document Ready</span>
                </div>
                <span className="text-[10px] text-stone-500 block truncate mt-0.5">Securely processed for Cloudinary</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="cursor-pointer bg-white text-stone-800 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-stone-50 transition-colors shadow-2xs border border-stone-200 flex items-center gap-1">
                <Upload className="w-3 h-3 text-[#D94A38]" /> Change
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={e => handlePhotoUpload(e, fieldName, label)}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, [fieldName]: null }))}
                className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <label className="border-2 border-dashed border-[#E7E2D9] hover:border-[#D94A38] rounded-2xl p-4 bg-[#FCFBF9] hover:bg-[#FFF8F6] transition-colors relative flex flex-col items-center justify-center text-center cursor-pointer group">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={e => handlePhotoUpload(e, fieldName, label)}
              className="hidden"
            />
            <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-[#FCE8E6] text-stone-400 group-hover:text-[#D94A38] flex items-center justify-center mb-1.5 transition-colors">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 justify-center">
              <span className="text-xs font-bold text-stone-700 group-hover:text-[#D94A38] font-sans transition-colors">
                Upload {label}
              </span>
            </div>
            <span className="text-[10px] text-stone-400 mt-0.5 block">{sublabel || ".JPG, .JPEG, .PNG up to 1MB"}</span>
          </label>
        )}
      </div>
    );
  };

  // Render form contents dynamically depending on current step
  const renderStepForm = () => {
    switch (currentStep) {
      case 1: // Owner Details & Aadhaar KYC
        return (
          <div className="space-y-5 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">Owner Full Name</label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] focus:ring-2 focus:ring-[#D94A38]/10 transition-all font-sans font-medium"
                  placeholder="Enter owner name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] focus:ring-2 focus:ring-[#D94A38]/10 transition-all font-sans disabled:bg-stone-50 disabled:text-stone-500 font-medium"
                  placeholder="vendor@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] focus:ring-2 focus:ring-[#D94A38]/10 transition-all font-sans font-medium"
                placeholder="10-digit phone number"
              />
            </div>

            {/* Owner Aadhaar Card Upload */}
            {renderUploadCard(
              'Owner Aadhaar Card (Front/Back)',
              '(.JPG, .JPEG, .PNG up to 1MB)',
              formData.aadhaarPhoto,
              'aadhaarPhoto'
            )}
          </div>
        );

      case 2: // Stall Details & KYC Compliance (FSSAI + PAN + Stall Photo)
        return (
          <div className="space-y-5 animate-fadeIn font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Stall Name</label>
                <input
                  type="text"
                  name="stallName"
                  value={formData.stallName}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] focus:ring-2 focus:ring-[#D94A38]/10 transition-all font-sans font-medium"
                  placeholder="e.g. Manek Chowk Famous Pav Bhaji"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">Shown to customers on StreetBites.</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Established Since</label>
                <input
                  type="text"
                  name="establishedYear"
                  value={formData.establishedYear}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] focus:ring-2 focus:ring-[#D94A38]/10 transition-all font-sans font-medium"
                  placeholder="e.g. 1985"
                />
              </div>
            </div>

            {/* Stall Category Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1 font-sans">
                Stall Category <span className="text-[#D94A38]">*</span>
              </label>
              <div className="relative">
                <select
                  name="stall_category"
                  value={formData.stall_category}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] appearance-none font-sans font-medium cursor-pointer"
                >
                  <option value="Fast Food & Dosa">Fast Food & Dosa</option>
                  <option value="Street Food & Sandwiches">Street Food & Sandwiches</option>
                  <option value="Chaat & Pani Puri">Chaat & Pani Puri</option>
                  <option value="Desserts & Sweets">Desserts & Sweets</option>
                  <option value="Beverages & Juices">Beverages & Juices</option>
                  <option value="Chinese & Momos">Chinese & Momos</option>
                  <option value="Pizza & Burgers">Pizza & Burgers</option>
                  <option value="South Indian">South Indian</option>
                  <option value="North Indian & Rolls">North Indian & Rolls</option>
                  <option value="Tea & Snacks">Tea & Snacks</option>
                  <option value="Bakery & Desserts">Bakery & Desserts</option>
                  <option value="Traditional Gujarati">Traditional Gujarati</option>
                  <option value="Punjabi & Thali">Punjabi & Thali</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-xs">
                  ▼
                </div>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block font-sans">Primary food category for customer search & recommendations.</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Short Tagline / Description</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] focus:ring-2 focus:ring-[#D94A38]/10 transition-all font-sans font-medium"
                placeholder="Traditional butter-loaded Gujarati fast food & night specialities"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1 font-sans">Open Till</label>
              <input
                type="text"
                name="openTill"
                value={formData.openTill}
                onChange={handleInputChange}
                className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] font-sans font-medium"
                placeholder="02:00 AM"
              />
            </div>

            {/* Stall Front Photo */}
            {renderUploadCard(
              'Stall Front Photo',
              'Landscape shot of your stall gate / banner (.JPG, .JPEG, .PNG up to 1MB)',
              formData.stallPhoto,
              'stallPhoto'
            )}

            {/* FSSAI Certificate Document */}
            {renderUploadCard(
              'FSSAI Certificate Document',
              'Upload FSSAI food registration image (.JPG, .JPEG, .PNG up to 1MB)',
              formData.fssaiPhoto,
              'fssaiPhoto'
            )}

            {/* PAN Card Document */}
            {renderUploadCard(
              'PAN Card Document',
              'Upload PAN card photo for merchant payouts (.JPG, .JPEG, .PNG up to 1MB)',
              formData.panPhoto,
              'panPhoto'
            )}
          </div>
        );

      case 3: // Cluster Selection (Ahmedabad Only)
        return (
          <div className="space-y-5 animate-fadeIn font-sans">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">Select Primary Ahmedabad Khau Galli (Cluster)</label>
              <div className="relative">
                <select
                  name="cluster"
                  value={formData.cluster}
                  onChange={handleInputChange}
                  disabled={isLoadingClusters}
                  className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3.5 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] appearance-none font-sans font-medium disabled:bg-stone-50"
                >
                  {isLoadingClusters ? (
                    <option value="">Loading clusters from database...</option>
                  ) : clusters.length > 0 ? (
                    clusters.map(c => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name} {c.city ? `(${c.city})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="Manek Chowk Night Food Market">Manek Chowk Night Food Market</option>
                  )}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-xs">
                  ▼
                </div>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block font-sans">
                {isLoadingClusters ? 'Fetching active geofenced clusters from database...' : 'Your stall must be physically located within this geofenced Ahmedabad cluster.'}
              </span>
            </div>

            <div className="bg-[#FAF7F2] border border-[#E7E2D9] rounded-2xl p-4 flex gap-3.5 items-start">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-[#D94A38]" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-stone-800 uppercase tracking-wide">Automatic Cluster Geofencing & Multi-Stall Routing</h5>
                <p className="text-[11px] text-stone-500 leading-relaxed mt-0.5 font-sans">
                  Based on your cluster selection, you are designated to <strong className="text-stone-700">{formData.cluster}</strong>. Orders from this cluster will route to your dashboard automatically.
                </p>
              </div>
            </div>
          </div>
        );

      case 4: // Payout
        return (
          <div className="space-y-5 animate-fadeIn font-sans">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">Bank Name</label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] font-sans font-medium"
                placeholder="e.g. State Bank of India / HDFC Bank"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">Account Number</label>
                <input
                  type="password"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38]in  font-sans font-medium"
                  placeholder="Enter bank account number"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">IFSC Code</label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] font-sans font-medium"
                  placeholder="e.g. SBIN0001234"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">UPI ID for Instant Payouts (Optional)</label>
              <input
                type="text"
                name="upiId"
                value={formData.upiId}
                onChange={handleInputChange}
                className="w-full bg-white border border-[#E7E2D9] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] font-sans font-medium"
                placeholder="e.g. vendorname@okaxis"
              />
              <span className="text-[11px] text-stone-400 mt-1 block font-sans">Daily automated payout settlement directly to your account.</span>
            </div>

            {/* Transparent 95% / 5% Revenue Split Card */}
            <div className="bg-[#FAF7F2] border border-[#EAE4DA] rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">Revenue & Payout Split</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">Daily Settlement</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-[#EAE4DA]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Vendor Food Share</span>
                    <span className="text-base font-extrabold text-stone-900">95% of Base Price</span>
                    <span className="text-[10px] text-stone-500 block mt-0.5">Flat 5% platform service fee</span>
                  </div>
                  <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200">
                    Direct Bank Transfer
                  </span>
                </div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-[#EAE4DA] flex items-center justify-between text-[11px]">
                <span className="text-stone-600 font-medium">Example: ₹100 Listed Dish</span>
                <strong className="text-emerald-700 font-bold">You Receive: ₹95.00 (95%)</strong>
              </div>
            </div>
          </div>
        );

      case 5: // Review & Submit with KYC Document Badges
        return (
          <div className="space-y-5 animate-fadeIn text-stone-700 font-sans text-xs">
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-4">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#D94A38] mb-2">01. Owner Details & Aadhaar</h4>
                <div className="grid grid-cols-2 gap-2 text-stone-600">
                  <div><span className="font-semibold text-stone-800">Owner Name:</span> {formData.ownerName || "-"}</div>
                  <div><span className="font-semibold text-stone-800">Phone:</span> {formData.phone || "-"}</div>
                  <div><span className="font-semibold text-stone-800">Email:</span> {formData.email || "-"}</div>
                  <div><span className="font-semibold text-stone-800">Aadhaar Photo:</span> {formData.aadhaarPhoto ? '✓ Uploaded ' : 'Not attached'}</div>
                </div>
              </div>

              <div className="border-t border-stone-200 pt-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#D94A38] mb-2">02. Stall & Compliance Documents</h4>
                <div className="grid grid-cols-2 gap-2 text-stone-600">
                  <div><span className="font-semibold text-stone-800">Stall Name:</span> {formData.stallName || "-"}</div>
                  <div><span className="font-semibold text-stone-800">Category:</span> {formData.stall_category || "-"}</div>
                  <div><span className="font-semibold text-stone-800">Stall Photo:</span> {formData.stallPhoto ? '✓ Uploaded' : 'Not attached'}</div>
                  <div><span className="font-semibold text-stone-800">FSSAI Doc:</span> {formData.fssaiPhoto ? '✓ Uploaded' : 'Not attached'}</div>
                  <div><span className="font-semibold text-stone-800">PAN Doc:</span> {formData.panPhoto ? '✓ Uploaded ' : 'Not attached'}</div>
                </div>
              </div>

              <div className="border-t border-stone-200 pt-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#D94A38] mb-2">03. Ahmedabad Cluster Zone</h4>
                <div className="grid grid-cols-2 gap-2 text-stone-600">
                  <div><span className="font-semibold text-stone-800">Khau Galli:</span> {formData.cluster || "-"}</div>
                </div>
              </div>

              <div className="border-t border-stone-200 pt-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#D94A38] mb-2">04. Payout Account</h4>
                <div className="grid grid-cols-2 gap-2 text-stone-600">
                  <div><span className="font-semibold text-stone-800">Bank Name:</span> {formData.bankName || "-"}</div>
                  <div><span className="font-semibold text-stone-800">IFSC Code:</span> {formData.ifscCode || "-"}</div>
                  <div><span className="font-semibold text-stone-800">UPI ID:</span> {formData.upiId || 'Not provided'}</div>
                </div>
              </div>

              {/* Uploaded Documents Gallery in Review */}
              <div className="border-t border-stone-200 pt-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#D94A38] mb-2">05. Uploaded Documents Ready for Cloudinary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { title: 'Aadhaar Card', url: formData.aadhaarPhoto },
                    { title: 'Stall Photo', url: formData.stallPhoto },
                    { title: 'FSSAI License', url: formData.fssaiPhoto },
                    { title: 'PAN Card', url: formData.panPhoto },
                  ].map(doc => (
                    <div key={doc.title} className="p-2 rounded-xl border border-stone-200 bg-white flex flex-col items-center text-center">
                      <div className="w-full h-16 rounded-lg bg-stone-100 overflow-hidden mb-1 flex items-center justify-center">
                        {doc.url ? (
                          <img src={doc.url} alt={doc.title} className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="w-6 h-6 text-stone-300" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-stone-800 truncate w-full">{doc.title}</span>
                      <span className={`text-[9px] font-semibold ${doc.url ? 'text-emerald-600' : 'text-stone-400'}`}>
                        {doc.url ? '✓ Ready' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#FAF7F2] border border-[#E7E2D9] rounded-2xl p-4 flex gap-3.5 items-start">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 font-sans" />
              <div>
                <h5 className="text-xs font-bold text-stone-800 uppercase tracking-wide">Awaiting Operations Verification</h5>
                <p className="text-[11px] text-stone-500 leading-relaxed mt-0.5">
                  By clicking Submit, your KYC documents will be uploaded and forwarded to the operations review team. Your stall will become online once approved.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Dynamically calculate which steps are ticked in the verification checklist
  const getChecklistIcon = (stepStatus: 'done' | 'active' | 'pending') => {
    if (stepStatus === 'done') {
      return (
        <span className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </span>
      );
    } else if (stepStatus === 'active') {
      return (
        <span className="w-5 h-5 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-[#D94A38] shrink-0 font-bold text-[10px] animate-pulse">
          ●
        </span>
      );
    } else {
      return (
        <span className="w-5 h-5 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0 font-medium text-[10px]">
          ○
        </span>
      );
    }
  };

  // Define steps configuration
  const steps = [
    { num: '01', title: 'Owner', complete: isOwnerStepComplete },
    { num: '02', title: 'Stall', complete: isStallStepComplete },
    { num: '03', title: 'Cluster', complete: isClusterStepComplete },
    { num: '04', title: 'Payout', complete: isPayoutStepComplete },
    { num: '05', title: 'Review', complete: false }
  ];

  // Mobile View Renderer
  const renderMobileView = () => {
    return (
      <div className="w-full min-h-screen bg-[#FAF7F2] text-stone-800 flex flex-col font-sans select-none pb-24">

        {/* Mobile Header */}
        <header className="px-4 py-3 bg-[#FAF7F2] flex items-center justify-between border-b border-[#EFEBE4] shrink-0 sticky top-0 z-20">
          <button
            onClick={handlePrevStep}
            className="w-8 h-8 rounded-full border border-stone-200 bg-white flex items-center justify-center text-stone-700 hover:bg-stone-50 transition-colors"
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest font-sans">
              VENDOR · STEP {currentStep} · 5
            </div>
          </div>

          <button className="w-8 h-8 rounded-full border border-stone-200 bg-white flex items-center justify-center text-stone-700">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </header>

        {/* Mobile Main Canvas */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <span className="text-[10px] text-[#D94A38] uppercase font-bold tracking-widest block font-sans">Vendor Onboarding</span>
            <h2 className="text-2xl font-bold leading-tight text-stone-800 mt-1">
              Bring your <span className="text-[#D94A38] ">stall</span> online.
            </h2>
            <p className="text-[11px] text-stone-500 leading-relaxed mt-1 font-sans">
              Online status stays false till the verification done.
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-[#EFEBE4]">
            <div className="flex justify-between items-center text-[10px] font-bold text-stone-600 font-sans">
              <span>Progress</span>
              <span>{currentStep} / 5 · {currentStep * 20}%</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D94A38] transition-all duration-300"
                style={{ width: `${currentStep * 20}%` }}
              ></div>
            </div>

            {/* Horizontal scroll steps */}
            <div className="flex gap-2 justify-between pt-2 border-t border-stone-100 overflow-x-auto no-scrollbar">
              {steps.map((st, i) => (
                <span
                  key={st.num}
                  onClick={() => setCurrentStep(i + 1)}
                  className={`text-[9px] font-bold uppercase cursor-pointer ${currentStep === i + 1
                    ? 'text-[#D94A38] underline decoration-2'
                    : st.complete
                      ? 'text-emerald-600'
                      : 'text-stone-400'
                    }`}
                >
                  {st.title}
                </span>
              ))}
            </div>
          </div>

          {/* Form Content Area */}
          <div className="bg-white rounded-3xl p-4 border border-[#EFEBE4] shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-3 pb-2 border-b border-stone-100 flex justify-between items-center font-sans">
              <span>{steps[currentStep - 1].title} Details</span>
              <span className="text-[9px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-bold font-sans">STEP {currentStep}</span>
            </h3>
            {renderStepForm()}
          </div>
        </main>

        {/* Mobile Bottom Fixed Control Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#EFEBE4] grid grid-cols-2 gap-3 z-30 shadow-md">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className="w-full py-3.5 border border-[#E7E2D9] text-stone-600 text-xs font-bold rounded-full hover:bg-stone-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleNextStep}
            className="w-full py-3.5 bg-[#D94A38] hover:bg-[#C43D2E] text-white text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            {currentStep === 5 ? 'Submit' : 'Continue →'}
          </button>
        </div>
      </div>
    );
  };

  // Desktop View Renderer
  const renderDesktopView = () => {
    return (
      <div className="w-full min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col md:flex-row font-sans">

        {/* MAIN BODY AREA */}
        <div className="flex-1 flex flex-col md:overflow-y-auto h-screen">

          {/* Main Top Header */}
          <header className="bg-white border-b border-[#EFEBE4] px-6 py-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span className="hover:text-stone-800 cursor-pointer font-sans font-medium" onClick={() => navigate('/home')}>Vendor</span>
              <span>›</span>
              <span className="font-bold text-stone-800 font-sans">Register your stall</span>
            </div>

            <div className="flex items-center gap-3 font-sans">
              <span className="bg-[#FAF7F2] border border-[#E7E2D9] px-3 py-1 rounded-full text-[10px] text-stone-500 font-bold uppercase tracking-wider font-sans">
                STEP {currentStep} · 5
              </span>
              <button className="text-stone-500 text-xs hover:text-stone-800 hidden md:block cursor-pointer font-sans font-medium">
                Save & continue later — we keep your draft.
              </button>
            </div>
          </header>

          {/* Content Body Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">

            {/* Center Main Onboarding Form (2 cols wide on large) */}
            <div className="lg:col-span-2 space-y-6">

              {/* Heading Hero section */}
              <div>
                <span className="text-[11px] text-stone-400 font-bold uppercase tracking-wider block font-sans">Vendor Onboarding</span>
                <h1 className="text-4xl font-semibold leading-tight text-stone-900 mt-1">
                  Bring your <span className="text-[#D94A38]">stall online.</span>
                </h1>
                <p className="text-sm text-stone-600 leading-relaxed mt-2 max-w-xl">
                  We verify every vendor before switching <code className="bg-stone-100 text-stone-800 px-1 py-0.5 rounded font-mono text-xs">online</code> your stall.
                </p>
              </div>

              {/* Horizontal steps navigation header */}
              <div className="bg-white border border-[#EFEBE4] rounded-2xl p-2 flex justify-between shadow-xs">
                {steps.map((st, i) => {
                  const stepNum = i + 1;
                  const isActive = currentStep === stepNum;
                  const isDone = st.complete;
                  return (
                    <button
                      key={st.num}
                      onClick={() => setCurrentStep(stepNum)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-1 rounded-xl transition-all cursor-pointer ${isActive
                        ? 'bg-[#FCE8E6] text-[#D94A38] font-bold shadow-2xs'
                        : isDone
                          ? 'text-emerald-700 hover:bg-stone-50'
                          : 'text-stone-400 hover:bg-stone-50'
                        }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive
                        ? 'bg-[#D94A38] text-white'
                        : isDone
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-stone-100 text-stone-400'
                        }`}>
                        {st.num}
                      </span>
                      <span className="text-xs tracking-wider uppercase font-bold hidden md:inline font-sans">{st.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Step Form Card */}
              <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 md:p-8 shadow-xs">
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-stone-100">
                  <h2 className="text-lg font-bold text-stone-800">
                    {steps[currentStep - 1].title} details
                  </h2>
                  <span className="bg-[#FAF7F2] border border-[#E7E2D9] px-3 py-1 rounded-full text-[10px] text-stone-400 font-bold uppercase tracking-wider font-sans">
                    Step {currentStep} · {steps[currentStep - 1].title.toUpperCase()}
                  </span>
                </div>

                {renderStepForm()}

                {/* Error message */}
                {errorMessage && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-3 my-4">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Form navigation buttons */}
                <div className="flex justify-between pt-6 mt-8 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={currentStep === 1 || isSubmitting}
                    className="px-6 py-3 border border-[#E7E2D9] text-stone-600 font-bold text-xs rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-sans"
                  >
                    Back to {currentStep > 1 ? steps[currentStep - 2]?.title || 'Start' : 'Start'}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-[#D94A38]/10 cursor-pointer font-sans disabled:opacity-75"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading & Saving...</span>
                      </>
                    ) : (
                      <span>{currentStep === 5 ? 'Submit Application' : `Continue to ${steps[currentStep]?.title || 'Next'} →`}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Sidebar Panels */}
            <div className="lg:mt-[214px] space-y-6">

              {/* Panel 1: Verification checklist */}
              <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-xs font-sans">
                <h3 className="text-sm font-bold text-stone-800 mb-4">Verification checklist</h3>

                <div className="space-y-3 text-xs text-stone-600 font-medium">
                  <div className="flex items-center gap-3">
                    {getChecklistIcon(isOwnerStepComplete && formData.aadhaarPhoto ? 'done' : currentStep === 1 ? 'active' : 'pending')}
                    <span className={isOwnerStepComplete && formData.aadhaarPhoto ? 'line-through text-stone-400 font-sans' : 'font-sans'}>Owner identity & Aadhaar card</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getChecklistIcon(isStallStepComplete ? 'done' : currentStep === 2 ? 'active' : 'pending')}
                    <span className={isStallStepComplete ? 'line-through text-stone-400 font-sans' : 'font-sans'}>Stall storefront photo & details</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getChecklistIcon(formData.fssaiPhoto && formData.panPhoto ? 'done' : currentStep === 2 ? 'active' : 'pending')}
                    <span className={formData.fssaiPhoto && formData.panPhoto ? 'line-through text-stone-400 font-sans' : 'font-sans'}>FSSAI & PAN documents (Cloudinary)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getChecklistIcon(isClusterStepComplete ? 'done' : currentStep === 3 ? 'active' : 'pending')}
                    <span className={isClusterStepComplete ? 'line-through text-stone-400 font-sans' : 'font-sans'}>Ahmedabad cluster zone assignment</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getChecklistIcon(isPayoutStepComplete ? 'done' : currentStep === 4 ? 'active' : 'pending')}
                    <span className={isPayoutStepComplete ? 'line-through text-stone-400 font-sans' : 'font-sans'}>Bank / UPI account for payouts</span>
                  </div>
                </div>
              </div>

              {/* Panel 3: Strict menu isolation */}
              <div className="bg-[#EBF7EE] border border-[#D1F0D7] rounded-3xl p-5 flex gap-3.5 items-start font-sans">
                <div className="w-8 h-8 rounded-full bg-[#D1F0D7] text-[#2E7D32] flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1B5E20] uppercase tracking-wide">Strict menu isolation</h4>
                  <p className="text-[11px] text-[#2E7D32] leading-relaxed mt-1">
                    Your menu is mapped strictly by <code className="bg-[#D1F0D7] px-1 py-0.5 rounded font-mono font-semibold text-[10px]">vendorId</code>. Even in a shared cluster, items never leak into another stall's page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-800 flex flex-col font-sans select-none relative">
      {/* Mobile Layout (visible only on mobile) */}
      <div className="block md:hidden w-full">
        {renderMobileView()}
      </div>

      {/* Desktop Layout (visible on desktop and tablet screens) */}
      <div className="hidden md:block w-full">
        {renderDesktopView()}
      </div>

      {/* FINAL SUBMISSION SUCCESS MODAL */}
      {submitSuccess && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-[#EFEBE4] text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-stone-800">Application Submitted!</h3>
              <p className="text-xs text-stone-500 mt-1.5 font-sans leading-relaxed">
                Thank you for applying to StreetBites. Our operations team is reviewing your documents (Aadhaar & License). We will notify you via SMS within 2 hours.
              </p>
            </div>

            <div className="bg-stone-50 p-4 rounded-2xl text-[11px] text-stone-600 border border-stone-100 text-left space-y-1.5 font-sans">
              <div className="flex justify-between">
                <span>Vendor ID:</span>
                <strong className="text-stone-800">VEND-{Math.floor(100000 + Math.random() * 900000)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Stall Status:</span>
                <strong className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 font-bold uppercase tracking-wider text-[9px]">Awaiting Review</strong>
              </div>
              <div className="flex justify-between">
                <span>Is Live:</span>
                <strong className="text-stone-500 font-mono">false</strong>
              </div>
            </div>

            {/* Download Draft PDF Copy */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileDown className="w-5 h-5 text-[#D94A38] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-stone-800 truncate">Draft Application Copy</div>
                  <div className="text-[10px] text-stone-400 truncate">PDF downloaded to your device</div>
                </div>
              </div>
              <button
                type="button"
                onClick={triggerVendorPdfDownload}
                className="px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-100 rounded-xl text-[11px] font-bold text-stone-700 transition-colors shadow-2xs shrink-0 cursor-pointer"
              >
                Download Again
              </button>
            </div>

            <button
              onClick={async () => {
                setSubmitSuccess(false);
                await refreshProfile();
                navigate('/vendor/Dashboard');
              }}
              className="w-full py-3 bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Go to Vendor Dashboard &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
