import React, { useState } from 'react';
import TomTomMap from '../../components/map/TomTomMap';
import {type MapMarker } from '../../types/map';

const RiderRoute: React.FC = () => {
  const [activeStopIndex, setActiveStopIndex] = useState(1);

  const checkpoints = [
    { type: 'pickup', id: 'A', title: 'S1 - Bhavesh Dabeli', desc: 'North Gate · Manek Chowk', dist: '0.0 km', amount: '₹40 pickup', position: [72.5873, 23.0242] as [number, number] },
    { type: 'pickup', id: 'B', title: 'S3 - Asharfi Kulfi', desc: 'Central lane · Manek Chowk', dist: '0.4 km', amount: '+₹15 bonus', position: [72.5878, 23.0245] as [number, number] },
    { type: 'pickup', id: 'C', title: 'S4 - Bhajipav Bhandar', desc: 'South Gate · Manek Chowk', dist: '0.2 km', amount: 'Included', position: [72.5870, 23.0238] as [number, number] },
    { type: 'drop', id: 'D', title: 'Drop · Gujarat University', desc: 'Navrangpura · 380009', dist: '3.4 km', amount: 'Collect ₹430 COD', position: [72.5450, 23.0360] as [number, number] },
  ];

  // Map markers for rider checkpoints
  const routeMarkers: MapMarker[] = checkpoints.map((cp) => ({
    id: cp.id.toLowerCase(),
    position: cp.position,
    title: cp.title,
    description: cp.desc,
    type: cp.type === 'drop' ? 'customer' : 'stall',
    popupHtml: `
      <div style="font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; padding: 4px; max-width: 200px;">
        <div style="font-weight: 800; font-size: 13px; color: #1c1917; margin-bottom: 2px;">
          ${cp.id}. ${cp.title}
        </div>
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">${cp.desc}</div>
        <div style="font-size: 11px; font-weight: 700; color: #D94A38;">${cp.amount}</div>
      </div>
    `,
  }));

  const activeCheckpoint = checkpoints[Math.min(activeStopIndex, checkpoints.length - 1)];

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">

      {/* Top Title & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest block">Order · MO-77213 · 3 Stalls · 1 Drop</span>
          <h1 className="text-3xl font-medium text-stone-900 mt-2">
            Route <span className="text-[#D94A38] font-bold">{Math.min(activeStopIndex, checkpoints.length)} of {checkpoints.length} stops</span> complete.
          </h1>
        </div>
        <div className="grid grid-cols-3 gap-4 md:flex md:gap-8 text-left md:text-right w-full md:w-auto">
          {[
            { label: 'COD Debt', value: '₹430', color: 'text-stone-900' },
            { label: 'Today Earned', value: '₹1,215', color: 'text-stone-900' },
            { label: 'Current Delivery', value: '₹77.20', color: 'text-[#D94A38]' },
          ].map(s => (
            <div key={s.label} className="bg-white md:bg-transparent p-4 md:p-0 rounded-xl border border-[#EFEBE4] md:border-none shadow-sm md:shadow-none">
              <span className="text-xs text-stone-500 font-bold uppercase tracking-widest block">{s.label}</span>
              <span className={`text-2xl font-medium ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Interactive TomTom Map Navigation Area */}
        <div className="lg:col-span-3 bg-white border border-[#EFEBE4] rounded-3xl h-[380px] md:h-[560px] overflow-hidden relative shadow-sm">
          <TomTomMap
            center={activeCheckpoint.position}
            zoom={14}
            className="w-full h-full rounded-3xl overflow-hidden relative"
          />
          <div className="absolute bottom-6 right-6 bg-[#D94A38] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg z-10">
            ETA 18 min · 3.4 km
          </div>
        </div>

        {/* Right Col */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Checkpoints */}
          <div className="tour-checkpoints bg-white border border-[#EFEBE4] rounded-3xl p-6 flex-1 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-stone-900">Checkpoints</h3>
              <span className="text-xs text-stone-500 uppercase font-bold text-right">4 STOPS<br />3.4 KM</span>
            </div>
            <div className="space-y-4">
              {checkpoints.map((cp, index) => {
                const isDone = index < activeStopIndex;
                const isActive = index === activeStopIndex;
                const isPending = index > activeStopIndex;

                if (isDone) {
                  return (
                    <div key={cp.id} className="bg-[#FAF7F2] border border-[#EFEBE4] rounded-2xl p-4 flex gap-4 opacity-60 transition-all">
                      <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center font-bold text-sm shrink-0">{cp.id}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                          <div>
                            <h4 className="text-stone-900 font-bold text-sm">{cp.title}</h4>
                            <span className="text-xs text-stone-500">{cp.desc}</span>
                          </div>
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                            {cp.type === 'drop' ? 'Delivered' : 'Collected'}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-between text-sm font-medium">
                          <span className="text-stone-500">{cp.dist}</span>
                          <span className="text-[#D94A38]">{cp.amount}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isActive) {
                  return (
                    <div key={cp.id} className="bg-white border-2 border-[#D94A38] rounded-2xl p-4 flex gap-4 shadow-sm transition-all">
                      <div className="w-8 h-8 rounded-full bg-[#D94A38] text-white flex items-center justify-center font-bold text-sm shrink-0">{cp.id}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                          <div>
                            <h4 className="text-stone-900 font-bold text-sm">{cp.title}</h4>
                            <span className="text-xs text-stone-500">{cp.desc}</span>
                          </div>
                          <span className="bg-[#FCE8E6] text-[#D94A38] text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                            {cp.type === 'drop' ? 'Next Drop' : 'Next Pickup'}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-between text-sm font-medium">
                          <span className="text-stone-500">{cp.dist}</span>
                          <span className="text-[#D94A38]">{cp.amount}</span>
                        </div>
                        <button
                          onClick={() => setActiveStopIndex(prev => prev + 1)}
                          className="mt-3 w-full bg-[#D94A38] hover:bg-[#c33f2e] text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                        >
                          Mark {cp.type === 'drop' ? 'Delivered' : 'Collected'} & Continue
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={cp.id} className="bg-white border border-[#EFEBE4] rounded-2xl p-4 flex gap-4 opacity-75">
                    <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center font-bold text-sm shrink-0">{cp.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                        <div>
                          <h4 className="text-stone-900 font-bold text-sm">{cp.title}</h4>
                          <span className="text-xs text-stone-500">{cp.desc}</span>
                        </div>
                        <span className="bg-stone-100 text-stone-600 text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                          Pending
                        </span>
                      </div>
                      <div className="mt-3 flex justify-between text-sm font-medium">
                        <span className="text-stone-500">{cp.dist}</span>
                        <span className="text-[#D94A38]">{cp.amount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default RiderRoute;
