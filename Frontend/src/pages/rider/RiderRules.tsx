import React from 'react';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export const RiderRulesPage: React.FC = () => {
  const navigate = useNavigate();

  const rules = [
    {
      title: 'Code of Conduct',
      items: [
        'Always wear the StreetBites branded t-shirt and carry the official delivery bag.',
        'Be polite and courteous to vendors and customers at all times.',
        'Follow traffic rules strictly. Do not over-speed to meet delivery deadlines.',
      ]
    },
    {
      title: 'Cash-On-Delivery (COD) Policy',
      items: [
        'Collect the exact amount mentioned on the app from the customer.',
        'Deposit collected cash into your StreetBites account before your debt limit (₹1,000) is reached.',
        'Failure to deposit COD money on time will lead to immediate ID suspension.',
      ]
    },
    {
      title: 'Order Acceptance & Cancellations',
      items: [
        'Accept orders within the 2-minute timer window.',
        'Do not cancel an order after picking up the food under any circumstances unless approved by Support.',
        'Frequent rejections will negatively impact your dispatch priority and bonuses.',
      ]
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="cursor-pointer w-10 h-10 bg-white border border-[#EFEBE4] rounded-xl flex items-center justify-center hover:bg-stone-50 transition-colors shrink-0 md:hidden"
        >
          <ChevronLeft className="w-5 h-5 text-stone-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Rules & Regulations</h1>
          <p className="text-sm text-stone-500 mt-1">Please read and follow these guidelines strictly.</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-amber-800">Important Notice</h4>
          <p className="text-xs text-amber-700 mt-1">Violating these rules may result in temporary account suspension, penalty charges, or permanent termination of your partnership with StreetBites.</p>
        </div>
      </div>

      <div className="space-y-6">
        {rules.map((section, index) => (
          <div key={index} className="bg-white border border-[#EFEBE4] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-bold text-stone-900">{section.title}</h2>
            </div>
            
            <ul className="space-y-3">
              {section.items.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-stone-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D94A38] shrink-0 mt-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiderRulesPage;
