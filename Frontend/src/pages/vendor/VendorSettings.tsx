import React, { useState } from 'react';
import { Bell, Lock, Globe, Trash2, Smartphone, Mail, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { CustomSelect } from '../../components/CustomSelect';
import { useAlert } from '../../context/AlertContext';

export const VendorSettingsPage: React.FC = () => {
  const { showConfirm, toast } = useAlert();
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState('notifications');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [language, setLanguage] = useState('English');

  const navigate = useNavigate();
  return (
    <div className="animate-fadeIn pb-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-stone-500 mt-1">Manage notifications, security, and operational preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Settings Navigation Sidebar (Desktop) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 space-y-1">
            <button
              onClick={() => setActiveSection('notifications')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-between ${activeSection === 'notifications' ? 'bg-white border border-[#E7E2D9] text-stone-900 shadow-sm' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'}`}
            >
              <div className="flex items-center gap-3">
                <Bell className={`w-4 h-4 ${activeSection === 'notifications' ? 'text-[#D94A38]' : ''}`} /> Notifications
              </div>
              {activeSection === 'notifications' && <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>
            <button
              onClick={() => setActiveSection('security')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-between ${activeSection === 'security' ? 'bg-white border border-[#E7E2D9] text-stone-900 shadow-sm' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'}`}
            >
              <div className="flex items-center gap-3">
                <Lock className={`w-4 h-4 ${activeSection === 'security' ? 'text-[#D94A38]' : ''}`} /> Security
              </div>
              {activeSection === 'security' && <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>
            <button
              onClick={() => setActiveSection('localization')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-between ${activeSection === 'localization' ? 'bg-white border border-[#E7E2D9] text-stone-900 shadow-sm' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'}`}
            >
              <div className="flex items-center gap-3">
                <Globe className={`w-4 h-4 ${activeSection === 'localization' ? 'text-[#D94A38]' : ''}`} /> Localization
              </div>
              {activeSection === 'localization' && <ChevronRight className="w-4 h-4 text-stone-400" />}
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-8">

          {/* Notifications Section */}
          {(activeSection === 'notifications' || window.innerWidth < 1024) && (
            <section className="bg-white rounded-3xl border border-[#E7E2D9] overflow-hidden shadow-sm animate-fadeIn">
              <div className="p-6 border-b border-[#E7E2D9]">
                <h2 className="text-lg font-bold text-stone-900">Notification Preferences</h2>
                <p className="text-xs text-stone-500 mt-1">Choose how you want to be alerted for new orders.</p>
              </div>

              <div className="divide-y divide-[#E7E2D9]">
                <div className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Push Notifications</h3>
                      <p className="text-xs text-stone-500">Receive alerts directly on your device</p>
                    </div>
                  </div>
                  {/* Toggle Switch */}
                  <button
                    onClick={() => setPushEnabled(!pushEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${pushEnabled ? 'bg-[#D94A38]' : 'bg-stone-300'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Email Summaries</h3>
                      <p className="text-xs text-stone-500">Daily breakdown of your sales</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEmailEnabled(!emailEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${emailEnabled ? 'bg-[#D94A38]' : 'bg-stone-300'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${emailEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Security Section (Placeholder) */}
          {(activeSection === 'security' || window.innerWidth < 1024) && (
            <section className="bg-white rounded-3xl border border-[#E7E2D9] overflow-hidden shadow-sm animate-fadeIn">
              <div className="p-6 border-b border-[#E7E2D9]">
                <h2 className="text-lg font-bold text-stone-900">Security</h2>
                <p className="text-xs text-stone-500 mt-1">Manage your password and active sessions.</p>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Change Password</h3>
                  <p className="text-xs text-stone-500 max-w-xs mt-1">Update your account password for enhanced security.</p>
                </div>
                <button onClick={() => navigate('/reset-password')} className="cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2 px-4 rounded-xl transition-colors text-sm">
                  Update
                </button>
              </div>
            </section>
          )}

          {/* Localization Section (Placeholder) */}
          {(activeSection === 'localization' || window.innerWidth < 1024) && (
            <section className="bg-white rounded-3xl border border-[#E7E2D9] overflow-hidden shadow-sm animate-fadeIn">
              <div className="p-6 border-b border-[#E7E2D9]">
                <h2 className="text-lg font-bold text-stone-900">Localization</h2>
                <p className="text-xs text-stone-500 mt-1">Language and region preferences.</p>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Language</h3>
                  <p className="text-xs text-stone-500 max-w-xs mt-1">Select your preferred app language.</p>
                </div>
                <div className="w-36">
                  <CustomSelect
                    value={language}
                    onChange={(val) => setLanguage(val)}
                    options={['English', 'Hindi', 'Gujarati']}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Danger Zone */}
          <section className="bg-white rounded-3xl border border-red-200 overflow-hidden shadow-sm mt-8">
            <div className="p-6 border-b border-red-100 bg-red-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-red-700">Account & Session</h2>
            </div>
            <div className="p-6 divide-y divide-stone-100 space-y-4">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Log Out of Stall Session</h3>
                  <p className="text-xs text-stone-500 max-w-xs mt-1">End your current vendor active session on this device.</p>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    navigate('/signin');
                  }}
                  className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 px-4 rounded-xl transition-colors text-xs cursor-pointer"
                >
                  Log Out
                </button>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Delete Account</h3>
                  <p className="text-xs text-stone-500 max-w-xs mt-1">Permanently remove your stall, menu, and all data from StreetBites.</p>
                </div>
                <button
                  onClick={async () => {
                    const confirmed = await showConfirm({
                      title: 'Delete Vendor Account',
                      message: 'Are you sure you want to permanently delete your stall and vendor account? All active listings and historical records will be permanently removed.',
                      confirmText: 'Delete Account',
                      type: 'danger',
                    });
                    if (confirmed) {
                      toast.info('Account deletion request initiated.');
                    }
                  }}
                  className="flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold py-2 px-4 rounded-xl transition-colors text-xs cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default VendorSettingsPage;