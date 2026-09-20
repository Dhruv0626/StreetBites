import React, { useState, useEffect } from 'react';
import { MapPin, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { clusterService, type ClusterData } from '../../services/clusterService';

export const CustomerFooter: React.FC = () => {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<ClusterData[]>([]);

  useEffect(() => {
    let isMounted = true;
    clusterService.getClusters()
      .then((res) => {
        if (isMounted && res.success && res.data && res.data.length > 0) {
          setClusters(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load clusters for footer:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const displayClusters = clusters.length > 0
    ? clusters.slice(0, 5)
    : [
        { id: 'manek_chowk_01', name: 'Manek Chowk Khau Galli' },
        { id: 'law_garden_02', name: 'Law Garden Food Street' },
      ];

  const distinctCities = Array.from(
    new Set(clusters.map((c) => c.city?.trim()).filter(Boolean))
  );
  const displayCities = distinctCities.length > 0 ? distinctCities : ['Ahmedabad'];

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
              Ahmedabad's legendary street food culture, delivered straight to your door with synchronized multi-stall pickup.
            </p>
          </div>

          {/* Clusters Column - Dynamic from Database */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#1C1917]">Popular Khau Gallis</h3>
            <ul className="space-y-3">
              {displayClusters.map((cluster) => (
                <li key={cluster.id || (cluster as any)._id}>
                  <button
                    onClick={() => navigate(`/stalls?khauGalliId=${cluster.id || (cluster as any)._id}`)}
                    className="text-sm text-[#5C5954] hover:text-[#D94A38] transition-colors flex items-center gap-2 cursor-pointer text-left group"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#D94A38] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">{cluster.name}</span>
                  </button>
                </li>
              ))}
              <li className="pt-1">
                <button
                  onClick={() => navigate('/all-khaugallis')}
                  className="text-xs font-bold text-[#D94A38] hover:text-[#B73525] transition-colors flex items-center gap-1 cursor-pointer"
                >
                </button>
              </li>
            </ul>
          </div>

          {/* Explore Column */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#1C1917]">Explore</h3>
            <ul className="space-y-3">
              {[
                { label: 'All Khau Gallis', path: '/all-khaugallis' },
                { label: 'Browse Food Stalls', path: '/all-stalls' },
                { label: 'Live Order Tracking', path: '/orders' },
                { label: 'Partner with Us (Vendor)', path: '/vendor/registration' },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => navigate(item.path)}
                    className="text-sm text-[#5C5954] hover:text-[#D94A38] transition-colors cursor-pointer text-left"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#1C1917]">Legal & Standards</h3>
            <ul className="space-y-3">
              {[
                'Terms & Conditions',
                'Privacy Policy',
                'Food Hygiene Standards',
                'Refund & Cancellation'
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
          <div className="flex items-center gap-2 flex-wrap">
            {displayCities.map((city) => (
              <span
                key={city}
                className="text-xs font-bold text-[#D94A38] bg-[#FCE8E6] px-3 py-1 rounded-full uppercase tracking-wider"
              >
                {city}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default CustomerFooter;
