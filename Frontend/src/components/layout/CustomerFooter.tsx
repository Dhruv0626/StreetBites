import React from 'react';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router';

export const CustomerFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-white border-t border-[#EAE4DA] pt-16 pb-8 md:pb-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">

          {/* Brand Column */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-2xl font-black tracking-tight cursor-pointer" onClick={() => navigate('/home')}>
              <span className="text-[#1C1917]">Street</span><span className="text-[#D94A38]">Bites.</span>
            </h2>
            <p className="text-sm text-[#8E8B85] leading-relaxed">
              Ahmedabad's legendary street food culture, delivered straight to your door. 
            </p>
            {/* <div className="flex gap-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center text-[#4B5563] hover:text-[#D94A38] hover:border-[#D94A38] transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-[#FAF7F2] border border-[#EAE4DA] flex items-center justify-center text-[#4B5563] hover:text-[#3B82F6] hover:border-[#3B82F6] transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>*/}
          </div>

          {/* Clusters Column */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#1C1917]">Popular Clusters</h3>
            <ul className="space-y-3">
              {[
                'Manek Chowk',
                'Law Garden',
              ].map((cluster) => (
                <li key={cluster}>
                  <span className="text-sm hover:text-[#D94A38] transition-colors flex items-center gap-2 cursor-pointer">
                    <MapPin className="w-3.5 h-3.5 text-[#D94A38]" />
                    {cluster}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#1C1917]">Company</h3>
            <ul className="space-y-3">
              {[
                'About Us',
                'Careers',
                'Partner with us',
                'Rider Sign Up'
              ].map((item) => (
                <li key={item}>
                  <span className="text-sm text-[#5C5954] hover:text-[#D94A38] transition-colors cursor-pointer">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#1C1917]">Legal</h3>
            <ul className="space-y-3">
              {[
                'Terms & Conditions',
                'Privacy Policy',
                'Refund Policy',
                'Cookie Settings'
              ].map((item) => (
                <li key={item}>
                  <span className="text-sm text-[#5C5954] hover:text-[#D94A38] transition-colors cursor-pointer">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-[#F5F0E8] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-medium text-[#8E8B85]">
            © {new Date().getFullYear()} StreetBites Pvt. Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs font-bold text-[#D94A38] bg-[#FCE8E6] px-3 py-1 rounded-full uppercase tracking-wider">
              Ahmedabad
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default CustomerFooter;
