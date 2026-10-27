import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ShieldCheck, FileText, AlertCircle } from 'lucide-react';

export const TermsConditions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#8E8B85] hover:text-[#1C1917] transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 sm:p-10 mb-8 shadow-xs">
          <div className="flex items-center gap-3 text-[#D94A38] mb-3">
            <FileText className="w-7 h-7" />
            <span className="text-xs font-black uppercase tracking-widest text-[#D94A38]">Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#1C1917] tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-sm text-[#8E8B85] mt-2">
            Last Updated: October 2026 • Effective for all users of StreetBites Platform
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 sm:p-10 shadow-xs space-y-8 text-[#5C5954] text-sm leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#FCE8E6] text-[#D94A38] text-xs flex items-center justify-center font-bold">1</span>
              Introduction & Acceptance of Terms
            </h2>
            <p>
              Welcome to <strong>StreetBites</strong>. By accessing or using our website, mobile interface, or ordering services, you acknowledge that you have read, understood, and agreed to be bound by these Terms and Conditions. If you do not agree, you must discontinue using the platform immediately.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#FCE8E6] text-[#D94A38] text-xs flex items-center justify-center font-bold">2</span>
              User Accounts & Mandatory Authentication
            </h2>
            <p>
              To place orders or add items to your cart on StreetBites, you must register for an account using verified contact credentials. You are responsible for maintaining the confidentiality of your login credentials and for all activities conducted through your account. StreetBites reserves the right to suspend or terminate accounts suspected of fraudulent activity or policy violations.
            </p>
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE4DA] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#D94A38] shrink-0 mt-0.5" />
              <p className="text-xs text-[#5C5954]">
                <strong>Authentication Requirement:</strong> Adding items to your cart and initiating checkout strictly requires an authenticated customer profile to protect order authenticity and multi-stall coordination.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#FCE8E6] text-[#D94A38] text-xs flex items-center justify-center font-bold">3</span>
              Multi-Stall Khau Galli Ordering Model
            </h2>
            <p>
              StreetBites offers a proprietary synchronized pickup system allowing customers to order delicacies from multiple independent street vendors within the same designated Khau Galli cluster.
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs text-[#5C5954]">
              <li>All stalls in a single order must belong to the active Khau Galli cluster.</li>
              <li>Preparation times may vary between stalls; our riders synchronize pickup to deliver items hot and fresh.</li>
              <li>Dishes are prepared freshly by independent local culinary partners subject to individual stall availability.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#FCE8E6] text-[#D94A38] text-xs flex items-center justify-center font-bold">4</span>
              Pricing, Taxes & Delivery Charges
            </h2>
            <p>
              Prices displayed reflect vendor menu pricing plus applicable operational service margins and statutory taxes. Delivery charges are calculated based on travel distance from the Khau Galli cluster to your verified delivery address.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#FCE8E6] text-[#D94A38] text-xs flex items-center justify-center font-bold">5</span>
              Delivery & Order Fulfillment
            </h2>
            <p>
              Estimated delivery times (ETAs) provided at checkout are approximations subject to peak Khau Galli traffic, weather conditions, and stall rush hours. Customers must ensure an authorized person is available at the provided delivery location to accept the package.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#FCE8E6] text-[#D94A38] text-xs flex items-center justify-center font-bold">6</span>
              Limitation of Liability
            </h2>
            <p>
              StreetBites acts as a technology intermediary connecting customers, verified food stall owners, and independent delivery riders. While we enforce strict FSSAI compliance and hygiene benchmarks, the food vendors remain solely responsible for the ingredients, recipe fidelity, and direct preparation of their menu offerings.
            </p>
          </section>

          <section className="pt-6 border-t border-[#F5F0E8] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Compliant with Information Technology Act, 2000 & Consumer Protection E-Commerce Rules</span>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="px-6 py-2.5 rounded-xl bg-[#D94A38] hover:bg-[#B33525] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          </section>

        </div>
      </div>
    </div>
  );
};

export default TermsConditions;
