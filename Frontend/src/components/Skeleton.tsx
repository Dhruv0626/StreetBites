import React from 'react';

// Single universal Skeleton component using the .skeleton CSS class
export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  ...props
}) => {
  return (
    <div
      className={`skeleton rounded-2xl ${className}`}
      {...props}
    />
  );
};

// ─── 1. KHAU GALLI CLUSTER CARD SKELETON ───
export const ClusterCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl border border-[#EAE4DA] overflow-hidden shadow-2xs p-3.5 flex flex-col gap-3 h-full">
    <div className="skeleton w-full h-40 sm:h-44 rounded-2xl" />
    <div className="flex flex-col gap-2 px-1 pb-1">
      <div className="flex justify-between items-center">
        <div className="skeleton w-3/5 h-5 rounded-md" />
        <div className="skeleton w-12 h-4 rounded-md" />
      </div>
      <div className="skeleton w-2/5 h-3.5 rounded-md" />
      <div className="flex items-center justify-between pt-2 border-t border-[#F5F0E8] mt-1">
        <div className="skeleton w-20 h-4 rounded-md" />
        <div className="skeleton w-16 h-4 rounded-md" />
      </div>
    </div>
  </div>
);

// ─── 2. STALL CARD SKELETON (4-Col Grids) ───
export const StallCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl overflow-hidden shadow-2xs border border-[#EAE4DA] p-4 flex flex-col gap-3">
    <div className="skeleton w-full h-44 rounded-2xl" />
    <div className="flex flex-col gap-2 pt-1">
      <div className="flex justify-between items-center">
        <div className="skeleton w-1/2 h-5 rounded-md" />
        <div className="skeleton w-12 h-4 rounded-md" />
      </div>
      <div className="flex items-center gap-2">
        <div className="skeleton w-16 h-3.5 rounded-md" />
        <div className="skeleton w-20 h-3.5 rounded-md" />
      </div>
      <div className="skeleton w-full h-8 rounded-xl mt-1" />
    </div>
  </div>
);

// ─── 3. HOME PAGE SKELETON ───
export const HomeSkeleton: React.FC = () => (
  <div className="bg-[#FAF7F2] min-h-screen">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12 animate-fadeIn">
      {/* Hero Banner */}
      <div className="w-full h-56 sm:h-72 rounded-3xl bg-white border border-[#EAE4DA] p-8 flex flex-col justify-center gap-4">
        <div className="skeleton w-1/3 h-9 rounded-xl" />
        <div className="skeleton w-1/2 h-5 rounded-lg" />
        <div className="flex gap-3 mt-2">
          <div className="skeleton w-32 h-11 rounded-xl" />
          <div className="skeleton w-32 h-11 rounded-xl" />
        </div>
      </div>

      {/* Category Bubbles Row */}
      <div className="space-y-4">
        <div className="skeleton w-48 h-6 rounded-md" />
        <div className="flex gap-5 overflow-hidden pb-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2.5 shrink-0">
              <div className="skeleton w-20 h-20 rounded-full" />
              <div className="skeleton w-14 h-3.5 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Trending Khau Gallis Row */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="skeleton w-52 h-6 rounded-md" />
          <div className="skeleton w-16 h-4 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ClusterCardSkeleton />
          <ClusterCardSkeleton />
          <ClusterCardSkeleton />
        </div>
      </div>

      {/* Top Stalls Grid */}
      <div className="space-y-4 pb-12">
        <div className="flex justify-between items-center">
          <div className="skeleton w-48 h-6 rounded-md" />
          <div className="skeleton w-16 h-4 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StallCardSkeleton />
          <StallCardSkeleton />
          <StallCardSkeleton />
          <StallCardSkeleton />
        </div>
      </div>
    </div>
  </div>
);

// ─── 4. STALL DETAIL & STALLS NEAR ME SKELETON ───
export const StallDetailSkeleton: React.FC = () => (
  <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 space-y-8 animate-fadeIn">
    {/* Breadcrumbs & Back */}
    <div className="flex items-center gap-3">
      <div className="skeleton w-8 h-8 rounded-full" />
      <div className="skeleton w-48 h-4 rounded-md" />
    </div>

    {/* Hero Specs Section */}
    <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex gap-2.5 mb-3">
            <div className="skeleton w-16 h-5 rounded-md" />
            <div className="skeleton w-20 h-5 rounded-md" />
            <div className="skeleton w-24 h-5 rounded-md" />
          </div>
          <div className="skeleton w-2/3 h-9 rounded-xl mb-3" />
          <div className="skeleton w-full h-12 rounded-xl" />
        </div>
        <div className="flex gap-8 pt-4 border-t border-[#F5F0E8]">
          <div className="space-y-1"><div className="skeleton w-16 h-3 rounded" /><div className="skeleton w-20 h-5 rounded" /></div>
          <div className="space-y-1"><div className="skeleton w-16 h-3 rounded" /><div className="skeleton w-24 h-5 rounded" /></div>
          <div className="space-y-1"><div className="skeleton w-16 h-3 rounded" /><div className="skeleton w-20 h-5 rounded" /></div>
        </div>
      </div>
      <div className="h-44 md:h-full min-h-[160px] rounded-2xl overflow-hidden">
        <div className="skeleton w-full h-full" />
      </div>
    </div>

    {/* 3-Column Layout (Categories - Dishes - Cart) */}
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pb-12">
      {/* Left Categories List */}
      <div className="hidden md:block md:col-span-3 bg-white rounded-2xl border border-[#EAE4DA] p-4 space-y-2.5">
        <div className="skeleton w-28 h-4 rounded-md mb-3" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton w-full h-9 rounded-xl" />
        ))}
      </div>

      {/* Middle Dishes List */}
      <div className="md:col-span-6 bg-white rounded-2xl border border-[#EAE4DA] p-6 space-y-6">
        <div className="flex justify-between items-center pb-3 border-b border-[#EAE4DA]">
          <div className="skeleton w-32 h-6 rounded-md" />
          <div className="skeleton w-16 h-4 rounded-md" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-6 pb-6 border-b border-[#F5F0E8] last:border-0 last:pb-0">
            <div className="flex-1 space-y-2.5">
              <div className="skeleton w-20 h-4 rounded-md" />
              <div className="skeleton w-3/4 h-5 rounded-md" />
              <div className="skeleton w-16 h-4 rounded-md" />
              <div className="skeleton w-full h-8 rounded-md" />
            </div>
            <div className="w-28 flex flex-col items-center gap-2 shrink-0">
              <div className="skeleton w-full h-24 rounded-xl" />
              <div className="skeleton w-full h-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Right Cart Summary */}
      <div className="hidden md:block md:col-span-3 bg-white rounded-2xl border border-[#EAE4DA] p-4 space-y-4">
        <div className="skeleton w-28 h-5 rounded-md" />
        <div className="skeleton w-full h-24 rounded-xl" />
        <div className="skeleton w-full h-10 rounded-xl" />
      </div>
    </div>
  </div>
);

// ─── 5. ALL CLUSTERS PAGE SKELETON ───
export const AllClustersSkeleton: React.FC = () => (
  <div className="w-full max-w-7xl mx-auto md:mt-4 px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 space-y-8 animate-fadeIn pb-20">
    <div className="hidden md:flex justify-between items-center mb-6">
      <div className="space-y-2">
        <div className="skeleton w-36 h-5 rounded-full" />
        <div className="skeleton w-64 h-9 rounded-xl" />
        <div className="skeleton w-96 h-4 rounded-md" />
      </div>
      <div className="skeleton w-48 h-10 rounded-2xl" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <ClusterCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// ─── 6. ALL STALLS PAGE SKELETON ───
export const AllStallsSkeleton: React.FC = () => (
  <div className="w-full max-w-7xl mx-auto md:mt-4 px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 space-y-8 animate-fadeIn pb-20">
    <div className="space-y-2 mb-6">
      <div className="skeleton w-60 h-9 rounded-xl" />
      <div className="skeleton w-80 h-4 rounded-md" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <StallCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// ─── 7. SEARCH PAGE SKELETON ───
export const SearchSkeleton: React.FC = () => (
  <div className="bg-[#FAF7F2] min-h-screen pb-20 animate-fadeIn">
    <div className="bg-white px-4 py-3 shadow-sm flex gap-3 items-center">
      <div className="skeleton w-9 h-9 rounded-full" />
      <div className="skeleton flex-1 h-10 rounded-full" />
    </div>
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <div className="space-y-3">
        <div className="skeleton w-28 h-4 rounded-md" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton w-24 h-8 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StallCardSkeleton />
        <StallCardSkeleton />
        <StallCardSkeleton />
      </div>
    </div>
  </div>
);

// ─── 8. CART & CHECKOUT SKELETON ───
export const CartSkeleton: React.FC = () => (
  <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fadeIn pb-24">
    <div className="skeleton w-40 h-8 rounded-xl" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EAE4DA] p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center pb-4 border-b border-[#F5F0E8] last:border-0">
            <div className="space-y-1.5 flex-1">
              <div className="skeleton w-48 h-5 rounded-md" />
              <div className="skeleton w-24 h-4 rounded-md" />
            </div>
            <div className="skeleton w-24 h-8 rounded-xl" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 space-y-4">
        <div className="skeleton w-32 h-5 rounded-md" />
        <div className="skeleton w-full h-28 rounded-2xl" />
        <div className="skeleton w-full h-12 rounded-xl" />
      </div>
    </div>
  </div>
);

// ─── 9. ORDERS & HISTORY SKELETON ───
export const OrdersSkeleton: React.FC = () => (
  <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fadeIn pb-24">
    <div className="flex justify-between items-center">
      <div className="skeleton w-40 h-8 rounded-xl" />
      <div className="skeleton w-32 h-8 rounded-full" />
    </div>
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white rounded-3xl border border-[#EAE4DA] p-6 space-y-4 shadow-2xs">
        <div className="flex justify-between items-center pb-3 border-b border-[#F5F0E8]">
          <div className="skeleton w-48 h-5 rounded-md" />
          <div className="skeleton w-20 h-6 rounded-full" />
        </div>
        <div className="skeleton w-full h-12 rounded-xl" />
        <div className="flex justify-between items-center pt-2">
          <div className="skeleton w-24 h-4 rounded-md" />
          <div className="skeleton w-28 h-8 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

// ─── 10. PROFILE SKELETON ───
export const ProfileSkeleton: React.FC = () => (
  <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fadeIn pb-24">
    <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 flex items-center gap-5 shadow-2xs">
      <div className="skeleton w-20 h-20 rounded-full shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="skeleton w-44 h-6 rounded-md" />
        <div className="skeleton w-32 h-4 rounded-md" />
      </div>
    </div>
    <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 space-y-4 shadow-2xs">
      <div className="skeleton w-36 h-5 rounded-md" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="skeleton w-full h-11 rounded-xl" />
        <div className="skeleton w-full h-11 rounded-xl" />
        <div className="skeleton w-full h-11 rounded-xl" />
        <div className="skeleton w-full h-11 rounded-xl" />
      </div>
    </div>
  </div>
);

// ─── 11. ADMIN DASHBOARD SKELETON ───
export const AdminPageSkeleton: React.FC = () => (
  <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8">
    <div className="space-y-1.5">
      <div className="skeleton w-48 h-7 rounded-xl" />
      <div className="skeleton w-72 h-4 rounded-md" />
    </div>
    {/* KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white border border-[#EFEBE4] rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="skeleton w-12 h-12 rounded-xl shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="skeleton w-20 h-3 rounded" />
            <div className="skeleton w-14 h-6 rounded-md" />
          </div>
        </div>
      ))}
    </div>
    {/* Main Data Table Card */}
    <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm space-y-4 min-h-[360px]">
      <div className="flex justify-between items-center pb-4 border-b border-[#F5F0E8]">
        <div className="skeleton w-40 h-6 rounded-md" />
        <div className="skeleton w-56 h-9 rounded-xl" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex justify-between items-center py-2.5 border-b border-[#F5F0E8] last:border-0">
          <div className="skeleton w-44 h-4 rounded-md" />
          <div className="skeleton w-24 h-4 rounded-md" />
          <div className="skeleton w-16 h-6 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

// ─── 12. VENDOR DASHBOARD SKELETON ───
export const VendorPageSkeleton: React.FC = () => (
  <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn pb-8">
    <div className="flex justify-between items-center">
      <div className="space-y-1.5">
        <div className="skeleton w-44 h-7 rounded-xl" />
        <div className="skeleton w-60 h-4 rounded-md" />
      </div>
      <div className="skeleton w-32 h-10 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm space-y-3">
          <div className="skeleton w-full h-32 rounded-2xl" />
          <div className="skeleton w-3/4 h-5 rounded-md" />
          <div className="skeleton w-1/2 h-4 rounded-md" />
        </div>
      ))}
    </div>
  </div>
);

// ─── 13. RIDER DASHBOARD SKELETON ───
export const RiderPageSkeleton: React.FC = () => (
  <div className="space-y-6 max-w-5xl mx-auto w-full animate-fadeIn pb-8">
    <div className="flex justify-between items-center">
      <div className="skeleton w-40 h-7 rounded-xl" />
      <div className="skeleton w-28 h-9 rounded-full" />
    </div>
    <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm space-y-4">
      <div className="skeleton w-full h-64 rounded-2xl" />
      <div className="skeleton w-2/3 h-5 rounded-md" />
      <div className="skeleton w-full h-12 rounded-xl" />
    </div>
  </div>
);

// Universal Fallback
export const PageSkeleton = HomeSkeleton;

export default Skeleton;
