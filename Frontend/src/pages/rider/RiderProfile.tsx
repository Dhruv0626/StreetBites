import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Shield, Bell, Bike, Map, Smartphone, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RiderProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [autoAccept, setAutoAccept] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [radius, setRadius] = useState(5);
  const [vehicle, setVehicle] = useState('bike');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/signin');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/signin');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Profile</h1>
        <p className="text-sm text-stone-500 mt-1">Manage your account and dispatch settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-stone-100 border-4 border-white shadow-md flex items-center justify-center text-stone-400 mb-4">
              <User className="w-10 h-10" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">{user?.name || 'StreetBites Rider'}</h2>
            <p className="text-sm text-stone-500 mb-6">{user?.phone_number || user?.email || '+91 98765 43210'}</p>
            <div className="w-full space-y-2">
              <button 
                onClick={() => navigate('/rider/registration')}
                className="w-full bg-[#F4F1EA] hover:bg-[#EFEBE4] text-stone-700 text-sm font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Edit Onboarding Details
              </button>
              <button 
                onClick={handleLogout}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-stone-900">Documents</h3>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between items-center">
                <span className="text-stone-600">Driving License</span>
                <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded">Verified</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-stone-600">Aadhar Card</span>
                <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded">Verified</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-stone-600">Vehicle RC</span>
                <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded">Verified</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-900 mb-6">Dispatch Settings</h3>
            
            <div className="space-y-6">
              {/* Toggles */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-stone-500" />
                    <h4 className="font-bold text-stone-900 text-sm">Auto-Accept Orders</h4>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">Automatically accept orders assigned to you.</p>
                </div>
                <div 
                  onClick={() => setAutoAccept(!autoAccept)}
                  className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${autoAccept ? 'bg-[#D94A38]' : 'bg-stone-200'}`}
                >
                  <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${autoAccept ? 'translate-x-5' : 'translate-x-0'} shadow-sm`} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-stone-500" />
                    <h4 className="font-bold text-stone-900 text-sm">Push Notifications</h4>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">Get alerts for new orders and bonuses.</p>
                </div>
                <div 
                  onClick={() => setPushNotifs(!pushNotifs)}
                  className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${pushNotifs ? 'bg-[#D94A38]' : 'bg-stone-200'}`}
                >
                  <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${pushNotifs ? 'translate-x-5' : 'translate-x-0'} shadow-sm`} />
                </div>
              </div>

              {/* Radius Slider */}
              <div className="pt-4 border-t border-[#EFEBE4]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4 text-stone-500" />
                    <h4 className="font-bold text-stone-900 text-sm">Max Delivery Radius</h4>
                  </div>
                  <span className="font-black text-[#D94A38]">{radius} km</span>
                </div>
                <input 
                  type="range" 
                  min="2" max="15" step="1"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full accent-[#D94A38] h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs font-bold text-stone-400 mt-2">
                  <span>2 km</span>
                  <span>15 km</span>
                </div>
              </div>

              {/* Vehicle Selection */}
              <div className="pt-4 border-t border-[#EFEBE4]">
                <div className="flex items-center gap-2 mb-4">
                  <Bike className="w-4 h-4 text-stone-500" />
                  <h4 className="font-bold text-stone-900 text-sm">Vehicle</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'bike', label: 'Motorcycle / Scooter' },
                  ].map(v => (
                    <button
                      key={v.id}
                      onClick={() => setVehicle(v.id)}
                      className={`py-2 px-3 rounded-xl text-sm font-bold transition-colors ${
                        vehicle === v.id 
                          ? 'bg-[#1C1917] text-white border border-[#1C1917]' 
                          : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
