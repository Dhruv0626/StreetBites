import React from 'react';
import { Sparkles, Utensils, Bike, ArrowRight, Store, } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { ClusterItem } from '../types';
import heroFoodSpreadImg from '../assets/images/hero_khaugalli_3d.jpg';

interface HeroBannerProps {
  clusters?: ClusterItem[];
  stalls?: any[];
  foodCategories?: any[];
  isLoading?: boolean;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  clusters = [],
  isLoading = false,
}) => {
  const navigate = useNavigate();

  // Real-time dynamic calculations from live database data
  const totalMarkets = clusters.length;


  const handleExploreClick = () => {
    navigate('/all-khaugallis');
  };

  return (
    <section className="mb-8">
      {/* Premium Ambient Hero Card Container */}
      <div className="relative overflow-hidden rounded-3xl sm:rounded-[2.25rem] bg-gradient-to-br from-[#FFFDF9] via-[#FAF6ED] to-[#F3EBE0] border border-[#EAE3D6] p-6 sm:p-8 lg:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        {/* Subtle Decorative Ambient Warm Glow */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#D94A38]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left Column: Typography & CTAs */}
          <div className="lg:col-span-7 flex flex-col justify-center">

            {/* Main Balanced Heading */}
            <h1 className="text-2xl sm:text-3xl lg:text-[2.65rem] font-bold text-[#1C1917] tracking-tight leading-[1.16] mb-3.5">
              Tonight’s{' '}
              <span className="bg-gradient-to-r from-[#D94A38] to-[#E85D4B] bg-clip-text text-transparent">
                Khau Gallis
              </span>
              ,<br />
              on a single receipt.
            </h1>

            {/* Crisp & Appetizing Subtitle */}
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-xl mb-6">
              Combine dishes from multiple street stalls in the same Khau Galli into one unified order with <span className="font-semibold text-stone-800">1 flat delivery fee</span> and <span className="font-semibold text-stone-800">1 dedicated rider</span>.
            </p>

            {/* CTA & Trust Pillars */}
            <div className="flex flex-wrap items-center gap-3.5 mb-6">
              <button
                onClick={handleExploreClick}
                className="inline-flex items-center gap-2 bg-[#D94A38] hover:bg-[#C83D2C] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group"
              >
                <Store className="w-4 h-4" />
                <span>Explore Khau Gallis</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Enhanced Feature Highlights Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-1">
              {/* Feature 1: Multi-Stall */}
              <div className="flex items-center gap-2.5 bg-white/85 backdrop-blur-md border border-[#EAE3D6] p-2.5 rounded-2xl shadow-2xs hover:border-[#D94A38]/30 transition-all group/feat">
                <div className="w-8 h-8 rounded-xl bg-[#D94A38]/10 text-[#D94A38] flex items-center justify-center shrink-0 group-hover/feat:scale-105 transition-transform">
                  <Utensils className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-900 leading-tight">Multi-Stall Cart</p>
                  <p className="text-[11px] text-stone-500 leading-tight truncate">Combine any stalls</p>
                </div>
              </div>

              {/* Feature 2: Unified Rider */}
              <div className="flex items-center gap-2.5 bg-white/85 backdrop-blur-md border border-[#EAE3D6] p-2.5 rounded-2xl shadow-2xs hover:border-[#D94A38]/30 transition-all group/feat">
                <div className="w-8 h-8 rounded-xl bg-[#D94A38]/10 text-[#D94A38] flex items-center justify-center shrink-0 group-hover/feat:scale-105 transition-transform">
                  <Bike className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-900 leading-tight">1 Rider Pickups</p>
                  <p className="text-[11px] text-stone-500 leading-tight truncate">All stalls at once</p>
                </div>
              </div>

              {/* Feature 3: Flat Delivery */}
              <div className="flex items-center gap-2.5 bg-white/85 backdrop-blur-md border border-[#EAE3D6] p-2.5 rounded-2xl shadow-2xs hover:border-[#D94A38]/30 transition-all group/feat">
                <div className="w-8 h-8 rounded-xl bg-[#D94A38]/10 text-[#D94A38] flex items-center justify-center shrink-0 group-hover/feat:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-900 leading-tight">1 Delivery Fee</p>
                  <p className="text-[11px] text-stone-500 leading-tight truncate">Zero multi-vendor markup</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Market Graphic Showcase (Desktop/Tablet) */}
          <div className="hidden lg:block lg:col-span-5 relative group">
            <div className="w-full h-80 xl:h-88 rounded-3xl border border-[#EAE3D6] relative overflow-hidden shadow-xs bg-[#FAF5EC] flex items-center justify-center">
              {/* 3D Market Diorama Image */}
              <img
                src={heroFoodSpreadImg}
                alt="StreetBites Khau Galli 3D Food Market"
                className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-500 ease-out"
              />

              {/* Soft Light Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/25 via-transparent to-stone-900/10 pointer-events-none" />

              {/* Bottom Floating Interactive Card */}

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;

