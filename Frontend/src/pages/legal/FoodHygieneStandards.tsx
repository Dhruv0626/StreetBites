import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Sparkles, Award, ShieldCheck, Thermometer, CheckCircle2, AlertTriangle } from 'lucide-react';

export const FoodHygieneStandards: React.FC = () => {
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
          <div className="flex items-center gap-3 text-emerald-600 mb-3">
            <Sparkles className="w-7 h-7" />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-700">Purity & Food Safety</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#1C1917] tracking-tight">
            Food Hygiene Standards
          </h1>
          <p className="text-sm text-[#8E8B85] mt-2">
            Bringing legendary Ahmedabad street food to your door with uncompromised hygiene and safety protocols.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 sm:p-10 shadow-xs space-y-8 text-[#5C5954] text-sm leading-relaxed">
          
          {/* Key Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#EAE4DA] text-center">
              <Award className="w-8 h-8 text-[#D94A38] mx-auto mb-2" />
              <h3 className="font-black text-[#1C1917] text-sm">FSSAI Certified</h3>
              <p className="text-xs text-[#8E8B85] mt-1">100% verified stall licenses and food compliance registration</p>
            </div>
            <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#EAE4DA] text-center">
              <Thermometer className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h3 className="font-black text-[#1C1917] text-sm">Thermal Packaging</h3>
              <p className="text-xs text-[#8E8B85] mt-1">Multi-stall synchronized hot boxes preserving temperature</p>
            </div>
            <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#EAE4DA] text-center">
              <ShieldCheck className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-black text-[#1C1917] text-sm">Spot Audits</h3>
              <p className="text-xs text-[#8E8B85] mt-1">Regular on-ground quality inspections at every Khau Galli</p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917]">
              1. Mandatory FSSAI Verification for Every Vendor
            </h2>
            <p>
              Before any stall is activated on the StreetBites platform, our compliance team verifies the vendor's valid Food Safety and Standards Authority of India (FSSAI) license or registration. Stalls must display their active certification and maintain cleanliness benchmarks throughout their active operational hours.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917]">
              2. Pure Ingredients & Safe Cooking Mediums
            </h2>
            <p>
              Ahmedabad street cuisine is celebrated for taste and tradition. To preserve quality, partner stalls adhere to our quality charter:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs text-[#5C5954]">
              <li><strong>Oil Quality Monitoring:</strong> Prohibiting multiple re-use cycles for frying oil to prevent trans-fat degradation.</li>
              <li><strong>Filtered Water Only:</strong> Mandating RO / purified water for panipuri waters, ice, chhas, and chutneys.</li>
              <li><strong>Fresh Produce Sourcing:</strong> Daily fresh procurement of dairy (Amul cheese, butter, paneer) and seasonal vegetables.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917]">
              3. Synchronized Multi-Stall Packaging & Delivery Safety
            </h2>
            <p>
              Because StreetBites lets you order from multiple stalls in one delivery run, our proprietary logistics process prevents cross-contamination:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs text-[#5C5954]">
              <li>Each stall packages food in tamper-evident, food-grade eco-containers with individual steam vents.</li>
              <li>Riders utilize partitioned thermal insulation delivery bags separating hot savories from chilled desserts (like Kulfi or Ice Gola).</li>
              <li>Zero direct contact with food by delivery personnel at all times.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917]">
              4. Community Feedback & Spot Checks
            </h2>
            <p>
              Customer reviews play an active role in maintaining standards. Any customer complaint regarding food quality, packaging hygiene, or foreign particles triggers an automated temporary stall hold and physical inspection by the StreetBites Khau Galli Marshall.
            </p>
          </section>

          <section className="pt-6 border-t border-[#F5F0E8] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-stone-400">
              For hygiene questions or vendor audits, write to: <span className="text-[#D94A38] font-bold">hygiene@streetbites.in</span>
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

export default FoodHygieneStandards;
