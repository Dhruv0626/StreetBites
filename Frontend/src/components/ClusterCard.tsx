import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { ClusterItem } from '../types';

interface ClusterCardProps {
  cluster: ClusterItem;
  isMobileFeatured?: boolean;
  onClick?: () => void;
  showLiveTag?: boolean;
}

export const ClusterCard: React.FC<ClusterCardProps> = ({
  cluster,
  isMobileFeatured = false,
  onClick,
  showLiveTag = false,
}) => {
  const clusterName = cluster.name || '';
  const overlayText = (cluster.imageText || cluster.name || '').toUpperCase();

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl border border-[#EAE4DA] overflow-hidden shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between cursor-pointer h-full w-full select-none"
    >
      {/* Top Media / Image Container */}
      <div className="h-44 sm:h-48 relative overflow-hidden flex flex-col justify-between p-4 border-b border-[#EAE4DA]/50 shrink-0">
        {cluster.image && (
          <img
            src={cluster.image}
            alt={clusterName}
            className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-500"
          />
        )}
        {/* Dark overlay if image exists so text is readable */}
        {cluster.image && <div className="absolute inset-0 bg-black/35 z-0 pointer-events-none" />}

        {/* Top Badges */}
        <div className="flex items-center justify-between w-full z-10">
          <div>
            {cluster.badge ? (
              <span className="bg-[#1C1917] text-white text-label text-[10px] px-2.5 py-1 rounded-md shadow-2xs">
                {cluster.badge}
              </span>
            ) : (
              <span />
            )}
          </div>
        </div>

        {/* Bottom Image Subtext Watermark */}
        <div className={`text-label text-[10px] font-bold tracking-wider z-10 truncate whitespace-nowrap overflow-hidden text-ellipsis ${cluster.image ? 'text-white/90' : 'text-[#8E8B85]'}`}>
          {overlayText}
        </div>
      </div>

      {/* Card Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Row: Full Name with Ellipsis & Status */}
          <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[1.75rem]">
            <h3
              className="text-lg font-bold text-[#1C1917] group-hover:text-[#D94A38] transition-colors truncate whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0"
              title={clusterName}
            >
              {clusterName}
            </h3>
            {isMobileFeatured && cluster.accentTag ? (
              <span className="bg-[#FCE8E6] text-[#D94A38] text-xs font-semibold px-3 py-0.5 rounded-full shrink-0">
                {cluster.accentTag}
              </span>
            ) : showLiveTag && cluster.isLive ? (
              <span className="bg-[#1C1917] text-white text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live
              </span>
            ) : null}
          </div>

          {/* Subtext Location */}
          <p className="text-xs text-[#8E8B85] mb-4 font-normal truncate whitespace-nowrap overflow-hidden text-ellipsis">
            {cluster.subtext}
          </p>
        </div>

        {/* Card Footer Divider & Meta */}
        <div className="pt-3 border-t border-[#F5F0E8] flex items-center justify-between text-xs mt-auto">
          <div className="text-[#6B7280] font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
            <span>
              <strong className="text-[#1C1917] font-semibold">{cluster.stallsOpen}</strong>
              /{cluster.totalStalls} stalls open now
            </span>
          </div>

          <div className="text-[#D94A38] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform shrink-0">
            <span>Browse</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterCard;

