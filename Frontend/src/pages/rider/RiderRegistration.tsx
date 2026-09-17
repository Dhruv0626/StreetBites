import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Check,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Trash2,
  FileDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { onboardingService } from '../../services/onboardingService';
import { downloadRiderRegistrationPdf } from '../../utils/pdfGenerator';

interface RiderData {
  Name: string;
  email: string;
  phone: string;
  aadhaarPhoto: string | null;
  licensePhoto: string | null;
  vehicle_model: string;
  year: string;
  vehiclePhoto: string | null;
  vehicleNumberPlateImage: string | null;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

export const RiderRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  // Multi-step: 1: Personal, 2: Documents, 3: Vehicle, 4: Payout
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rider Onboarding Data State (Pre-filled from registered account / OAuth)
  const [formData, setFormData] = useState<RiderData>({
    Name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone_number || '',
    aadhaarPhoto: null,
    licensePhoto: null,
    vehicle_model: '',
    year: '',
    vehiclePhoto: null,
    vehicleNumberPlateImage: null,
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
  });

  // Keep synced if user session loads asynchronously
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        Name: prev.Name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone_number || '',
      }));
    }
  }, [user]);

  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Handle standard input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle photo file uploads with client-side rules (.JPG, .JPEG, .PNG up to 500KB)
  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: keyof RiderData,
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

  // Helper render function for Document Upload Cards with Previews
  const renderUploadCard = (
    label: string,
    sublabel: string,
    value: string | null,
    fieldName: keyof RiderData
  ) => {
    return (
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">
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
                <span className="text-[10px] text-stone-500 block truncate mt-0.5">Uploaded securely to Cloudinary</span>
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
          <label className="border-2 border-dashed border-[#EFEBE4] hover:border-[#D94A38] bg-[#FAF7F2] hover:bg-[#FFF8F6] rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={e => handlePhotoUpload(e, fieldName, label)}
              className="hidden"
            />
            <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-[#FCE8E6] text-stone-400 group-hover:text-[#D94A38] flex items-center justify-center mb-1.5 transition-colors">
              <UploadCloud className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-stone-700 group-hover:text-[#D94A38] transition-colors">
              Upload {label}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5">{sublabel || ".JPG, .JPEG, .PNG up to 1MB"}</span>
          </label>
        )}
      </div>
    );
  };

  // Live checklist checks
  const isPersonalComplete = formData.Name.trim() !== '' && formData.phone.trim() !== '';
  const isDocumentsComplete =
    formData.aadhaarPhoto !== null &&
    formData.licensePhoto !== null;
  const isVehicleComplete =
    formData.vehicle_model.trim() !== '' &&
    formData.vehiclePhoto !== null &&
    formData.vehicleNumberPlateImage !== null;
  const isPayoutComplete = formData.bankName.trim() !== '' && formData.accountNumber.trim() !== '';

  const handleNextStep = async () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsSubmitting(true);
      setErrorMessage(null);
      try {
        const res = await onboardingService.submitRiderOnboarding({
          name: formData.Name,
          email: formData.email,
          phone: formData.phone,
          aadhaarPhoto: formData.aadhaarPhoto,
          licensePhoto: formData.licensePhoto,
          vehicle_model: formData.vehicle_model,
          vehiclePhoto: formData.vehiclePhoto,
          vehicleNumberPlateImage: formData.vehicleNumberPlateImage,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          upiId: formData.upiId,
        });

        if (res.success) {
          triggerRiderPdfDownload();
          setSubmitSuccess(true);
        } else {
          setErrorMessage(res.message || 'Failed to submit registration');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error uploading documents to Cloudinary');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Helper to generate & download official rider draft application PDF
  const triggerRiderPdfDownload = () => {
    try {
      downloadRiderRegistrationPdf({
        name: formData.Name,
        email: formData.email,
        phone: formData.phone,
        vehicleModel: formData.vehicle_model,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        upiId: formData.upiId,
        hasAadhaar: Boolean(formData.aadhaarPhoto),
        hasLicense: Boolean(formData.licensePhoto),
        hasVehiclePhoto: Boolean(formData.vehiclePhoto),
        hasNumberPlatePhoto: Boolean(formData.vehicleNumberPlateImage),
      });
    } catch (err) {
      console.error('Failed to generate rider registration PDF:', err);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const steps = [
    { num: '01', title: 'Personal', complete: isPersonalComplete },
    { num: '02', title: 'Documents', complete: isDocumentsComplete },
    { num: '03', title: 'Vehicle', complete: isVehicleComplete },
    { num: '04', title: 'Payout', complete: isPayoutComplete },
  ];

  const getChecklistIcon = (stepStatus: 'done' | 'active' | 'pending') => {
    if (stepStatus === 'done') {
      return (
        <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-600 shrink-0">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </span>
      );
    } else if (stepStatus === 'active') {
      return (
        <span className="w-5 h-5 rounded-full bg-red-50 border border-[#D94A38] flex items-center justify-center text-[#D94A38] shrink-0 font-bold text-[10px] animate-pulse">
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

  // Form body selection
  const renderStepForm = () => {
    switch (currentStep) {
      case 1: // Personal Details
        return (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">Full Name</label>
              <input
                type="text"
                name="Name"
                value={formData.Name}
                onChange={handleInputChange}
                className="w-full bg-white border border-[#EFEBE4] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38]"
                placeholder="Enter full name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#EFEBE4] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38]"
                  placeholder="10-digit number"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#EFEBE4] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38] disabled:bg-stone-50 disabled:text-stone-400"
                  placeholder="rider@example.com"
                />
              </div>
            </div>
          </div>
        );

      case 2: // Documents Upload
        return (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800">
              <span className="font-bold block mb-0.5 font-sans">Document Verification</span>
              <span className="text-[11px] text-amber-700">Please upload clear photos or scanned copies of your official documents for visual verification.</span>
            </div>

            {renderUploadCard(
              'Aadhaar Card Photo',
              '(.JPG, .JPEG, .PNG up to 1MB)',
              formData.aadhaarPhoto,
              'aadhaarPhoto'
            )}

            {renderUploadCard(
              'Driving License Photo',
              '(.JPG, .JPEG, .PNG up to 1MB)',
              formData.licensePhoto,
              'licensePhoto'
            )}
          </div>
        );

      case 3: // Vehicle Details
        return (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">Vehicle Model</label>
              <input
                type="text"
                name="vehicle_model"
                value={formData.vehicle_model}
                onChange={handleInputChange}
                className="w-full bg-white border border-[#EFEBE4] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38]"
                placeholder="e.g. Honda Activa 6G / Hero Splendor / Electric Scooter"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {renderUploadCard(
                'Vehicle Photo',
                '(.JPG, .JPEG, .PNG up to 1MB) ',
                formData.vehiclePhoto,
                'vehiclePhoto'
              )}

              {renderUploadCard(
                'Number Plate Photo',
                '(.JPG, .JPEG, .PNG up to 1MB) ',
                formData.vehicleNumberPlateImage,
                'vehicleNumberPlateImage'
              )}
            </div>
          </div>
        );

      case 4: // Payout Setup
        return (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">Bank Name</label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                className="w-full bg-white border border-[#EFEBE4] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38]"
                placeholder="e.g. State Bank of India / HDFC Bank"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">Bank Account Number</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#EFEBE4] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38]"
                  placeholder="0000 1111 2222 3333"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">IFSC Code</label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#EFEBE4] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38]"
                  placeholder="e.g. SBIN0001234"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">UPI ID (Instant Daily Payouts)</label>
              <input
                type="text"
                name="upiId"
                value={formData.upiId}
                onChange={handleInputChange}
                className="w-full bg-white border border-[#EFEBE4] rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-[#D94A38]"
                placeholder="yourname@okaxis / yourname@paytm"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-800 flex flex-col font-sans select-none relative">
      <div className="w-full min-h-screen bg-[#FAF7F2] text-stone-800 flex flex-col md:flex-row font-sans">

        {/* MAIN DISPLAY WORKSPACE */}
        <div className="flex-1 flex flex-col md:overflow-y-auto h-screen">

          {/* Header */}
          <header className="bg-white border-b border-[#EFEBE4] px-6 py-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span className="hover:text-stone-800 cursor-pointer font-sans" onClick={() => navigate('/home')}>Rider</span>
              <span>›</span>
              <span className="font-semibold text-stone-800 font-sans">Become a StreetBites rider</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="bg-stone-100 border border-stone-200 px-3 py-1 rounded-full text-[10px] text-stone-500 font-bold uppercase tracking-wider font-sans">
                STEP {currentStep} · 4
              </span>
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="text-stone-500 text-xs hover:text-stone-800 cursor-pointer font-sans"
              >
                Exit
              </button>
            </div>
          </header>

          {/* Main Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">

            {/* Onboarding step card */}
            <div className="lg:col-span-2 space-y-6">

              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block font-sans">Delivery Partner · Onboarding</span>
                  <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-stone-900 mt-1">
                    Ride with <span className="text-[#D94A38]">StreetBites.</span>
                  </h1>
                  <p className="text-xs text-stone-500 leading-relaxed mt-2 font-sans">
                    ₹25 base fare (first 2 km) · ₹8 per km after · ₹5 bonus per extra stall. 100% tips go to you.
                  </p>
                </div>
              </div>

              {/* Error prompt */}
              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Progress Steps Header */}
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
                        ? 'bg-stone-100 text-stone-800 font-bold'
                        : isDone
                          ? 'text-emerald-600 hover:bg-stone-50'
                          : 'text-stone-400 hover:bg-stone-50'
                        }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive
                        ? 'bg-[#D94A38] text-white'
                        : isDone
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-stone-100 text-stone-400'
                        }`}>
                        {st.num}
                      </span>
                      <span className="text-xs tracking-wider uppercase font-bold hidden md:inline font-sans">{st.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Form Content card */}
              <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 md:p-8 shadow-xs">
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-[#EFEBE4]">
                  <h2 className="text-base font-bold text-stone-800">
                    {steps[currentStep - 1]?.title} Details
                  </h2>
                  <span className="bg-[#FAF7F2] border border-[#EFEBE4] px-3 py-1 rounded-full text-[10px] text-stone-500 font-bold uppercase tracking-wider font-sans">
                    Step {currentStep} · {steps[currentStep - 1]?.title.toUpperCase()}
                  </span>
                </div>

                {renderStepForm()}

                {/* Bottom Navigation Buttons */}
                <div className="flex justify-between pt-6 mt-8 border-t border-[#EFEBE4]">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={currentStep === 1 || isSubmitting}
                    className="px-6 py-3 border border-[#EFEBE4] text-stone-500 font-bold text-xs rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-50 cursor-pointer font-sans"
                  >
                    Back to {currentStep > 1 ? steps[currentStep - 2]?.title || 'Start' : 'Start'}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer font-sans disabled:opacity-75"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading to Cloudinary & Saving...</span>
                      </>
                    ) : (
                      <span>{currentStep === 4 ? 'Complete Registration & Start Riding' : `Continue to ${steps[currentStep]?.title || 'Next'} →`}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right sidebar details */}
            <div className="space-y-6">

              {/* Panel 1: How you'll earn */}
              <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-xs font-sans text-stone-600">
                <h3 className="text-sm font-bold text-stone-800 mb-4">How you'll earn</h3>

                <div className="space-y-2 text-xs font-medium font-sans">
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-sans">Base fare (first 2 km)</span>
                    <strong className="text-stone-800">₹25.00</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-sans">Distance (per km after 2 km)</span>
                    <strong className="text-stone-800">₹8.00</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-sans">Extra stall pickup bonus</span>
                    <strong className="text-[#D94A38]">+ ₹5.00</strong>
                  </div>

                  <div className="bg-[#FAF7F2] border border-[#EFEBE4] rounded-xl p-3.5 mt-4 space-y-1 font-sans">
                    <span className="text-[9px] text-stone-500 uppercase tracking-wider block font-bold leading-none font-sans">Payout Simulation</span>
                    <p className="text-[11px] text-stone-600 font-bold leading-snug">Sample · 3 stall batch, 3.5 km trip:</p>
                    <code className="text-[10px] text-[#D94A38] block pt-1">
                      ₹25 + (1.5 km × ₹8) + (2 × ₹5) = ₹47.00 / trip
                    </code>
                  </div>
                </div>
              </div>

              {/* Panel 2: Verification progress */}
              <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-xs font-sans text-stone-600">
                <h3 className="text-sm font-bold text-stone-800 mb-4">Verification progress</h3>

                <div className="space-y-3.5 text-xs font-medium font-sans">
                  <div className="flex items-center gap-3">
                    {getChecklistIcon(isDocumentsComplete ? 'done' : currentStep === 2 ? 'active' : 'pending')}
                    <span className={isDocumentsComplete ? 'line-through text-stone-400 font-sans' : 'font-sans'}>
                      Driving licence & Aadhaar
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getChecklistIcon(isVehicleComplete ? 'done' : currentStep === 3 ? 'active' : 'pending')}
                    <span className={isVehicleComplete ? 'line-through text-stone-400 font-sans' : 'font-sans'}>
                      Vehicle & number plate photos
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getChecklistIcon(isPayoutComplete ? 'done' : currentStep === 4 ? 'active' : 'pending')}
                    <span className={isPayoutComplete ? 'line-through text-stone-400 font-sans' : 'font-sans'}>
                      Bank / UPI for payouts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FINAL SUBMISSION SUCCESS MODAL */}
      {submitSuccess && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn text-stone-800">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-[#EFEBE4] text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl border border-emerald-200">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-800">Rider Onboarded Successfully!</h3>
              <p className="text-xs text-stone-500 mt-1.5 font-sans leading-relaxed">
                Welcome to StreetBites, {formData.Name || 'Partner'}. Your documents are saved and uploaded to Cloudinary.
              </p>
            </div>

            <div className="bg-[#FAF7F2] p-4 rounded-2xl text-[11px] text-stone-500 border border-[#EFEBE4] text-left space-y-1.5 font-sans">
              <div className="flex justify-between">
                <span>Rider Dispatch ID:</span>
                <strong className="text-stone-800">RIDER-{Math.floor(100000 + Math.random() * 900000)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Verification State:</span>
                <strong className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-bold uppercase tracking-wider text-[9px]">Under Review</strong>
              </div>
              <div className="flex justify-between">
                <span>Vehicle:</span>
                <strong className="text-stone-800">{formData.vehicle_model || 'Motorcycle'}</strong>
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
                onClick={triggerRiderPdfDownload}
                className="px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-100 rounded-xl text-[11px] font-bold text-stone-700 transition-colors shadow-2xs shrink-0 cursor-pointer"
              >
                Download Again
              </button>
            </div>

            <button
              onClick={async () => {
                setSubmitSuccess(false);
                await refreshProfile();
                navigate('/rider/Dashboard');
              }}
              className="w-full py-3 bg-[#D94A38] hover:bg-[#C43D2E] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Go to Rider Dashboard &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderRegistration;
