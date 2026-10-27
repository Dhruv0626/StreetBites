import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Lock, Shield, Eye, Database, Bell } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
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
            <Lock className="w-7 h-7" />
            <span className="text-xs font-black uppercase tracking-widest text-[#D94A38]">Data & Privacy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#1C1917] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#8E8B85] mt-2">
            Last Updated: October 2026 • We respect your privacy and protect your personal information
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 sm:p-10 shadow-xs space-y-8 text-[#5C5954] text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#D94A38]" />
              1. Information We Collect
            </h2>
            <p>
              When you use StreetBites, we collect information essential to fulfilling your orders, verifying customer identity, and optimizing food delivery routes:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE4DA]">
                <h3 className="font-black text-[#1C1917] text-xs uppercase tracking-wider mb-1">Personal Identifiers</h3>
                <p className="text-xs text-[#8E8B85]">Name, email address, mobile phone number, and delivery address coordinates.</p>
              </div>
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE4DA]">
                <h3 className="font-black text-[#1C1917] text-xs uppercase tracking-wider mb-1">Location Data</h3>
                <p className="text-xs text-[#8E8B85]">Real-time GPS coordinates while using delivery services to calculate accurate Khau Galli proximity.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <Database className="w-5 h-5 text-[#D94A38]" />
              2. How We Use Your Data
            </h2>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs text-[#5C5954]">
              <li>To synchronize multi-stall order preparation and coordinate pickup with assigned delivery riders.</li>
              <li>To provide live order tracking notifications via SMS, push notifications, and in-app alerts.</li>
              <li>To prevent unauthorized cart modifications and fraud by enforcing customer authentication.</li>
              <li>To improve our Khau Galli culinary recommendations and optimize app performance.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#D94A38]" />
              3. Data Security & Encryption
            </h2>
            <p>
              We employ industry-standard 256-bit SSL encryption, tokenized authentication sessions (JWT), and secure MongoDB databases with strict role-based access controls. We never store raw credit card or UPI PIN details on our servers; payments are processed through PCI-DSS certified payment gateways.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#D94A38]" />
              4. Sharing with Third Parties
            </h2>
            <p>
              We only share limited customer details with necessary fulfillment partners:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs text-[#5C5954]">
              <li><strong>Delivery Riders:</strong> Customer name, delivery address, and masked contact number strictly during active delivery.</li>
              <li><strong>Khau Galli Vendors:</strong> Order items and special culinary instructions (customer phone number and personal identity remain private).</li>
              <li><strong>Government / Law Enforcement:</strong> Strictly when mandated under applicable Indian legal statutes or judicial orders.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#D94A38]" />
              5. User Rights & Data Deletion
            </h2>
            <p>
              You have the right to access, rectify, or request the deletion of your personal profile data. You may update your profile directly within the StreetBites account settings or contact our Data Privacy Officer at <span className="text-[#D94A38] font-bold">privacy@streetbites.in</span>.
            </p>
          </section>

          <section className="pt-6 border-t border-[#F5F0E8] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-stone-400">
              StreetBites Pvt. Ltd. • Registered Office: Ahmedabad, Gujarat, India.
            </p>
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

export default PrivacyPolicy;
