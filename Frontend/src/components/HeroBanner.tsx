import React from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router';

export const HeroBanner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="mb-8">
      {/* Desktop Hero Layout */}
      <div className="hidden md:grid lg:grid-cols-12 gap-8 items-stretch pt-2 pb-6">
        {/* Left Column: Text & Stats */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="text-label text-xs text-[#8E8B85] mb-3">
              Tonight · 19 markets open
            </div>
            <h1 className=" text-3xl lg:text-4xl xl:text-[3rem] leading-[1.12] text-[#1C1917] mb-4">
              Tonight’s{' '}
              <span className="text-accent ">
                Khau Gallis
              </span>
              ,<br />
              on a single receipt.
            </h1>
            <p className="text-[#6B7280] text-sm leading-relaxed max-w-xl mb-8">
              Combine dabeli from Stall 1, kulfi from Stall 3, and pav bhaji from Stall 4 — same market cluster, one delivery fee. StreetBites forks each order to the right vendor while dispatching one rider through every pickup.
            </p>
          </div>
        </div>

        {/* Right Column: Editorial Hero Graphic Card */}
        <div className="hidden lg:block lg:col-span-5 relative">
          <div className="w-full h-full min-h-[300px] rounded-3xl border border-[#EAE4DA] relative overflow-hidden flex flex-col justify-end p-5 shadow-2xs">
          </div>
        </div>
      </div>

      {/* Mobile Hero Layout */}
      <div className="md:hidden pt-2 pb-4">
        <h1 className="text-3xl font-semibold leading-tight text-[#1C1917] mb-2">
          Tonight’s
          <span className="block text-accent">
            Khau Gallis
          </span>
        </h1>
        <p className="text-[#6B7280] text-sm leading-relaxed mb-5">
          One cart. Many stalls. One delivery fee across every vendor in the same market.
        </p>

        {/* Mobile Search Input */}
        <div
          onClick={() => navigate('/search')}
          className="w-full relative flex items-center bg-[#F4EFE6] rounded-full px-4 py-3 border border-transparent focus-within:border-[#DCD6CC] transition-all cursor-pointer mb-4"
        >
          <Search className="w-4 h-4 text-[#9CA3AF] mr-2" />
          <input
            type="text"
            readOnly
            placeholder="Search stalls, dishes, categories..."
            className="bg-transparent outline-none w-full text-sm text-[#1C1917] placeholder-[#9CA3AF] cursor-pointer"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
