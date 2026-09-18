import React, { useState, useMemo } from 'react';
import {
  IndianRupee,
  Percent,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Clock,
  Utensils,
  AlertTriangle,
  PackageCheck,
  Building2,
  PowerOff,
  Scale,
  Search,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

export const VendorRulesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const ruleCategories = [
    {
      id: 'legal',
      category: '1. Onboarding & Legal Compliance',
      icon: <ShieldCheck className="w-5 h-5 text-[#D94A38]" />,
      summary: 'Mandatory licenses, identity verification, and local municipal registrations.',
      rules: [
        {
          title: 'Mandatory FSSAI Registration & License',
          content: 'All food stalls must possess and maintain a valid Food Safety and Standards Authority of India (FSSAI) registration or license. An active certificate copy must be uploaded on the portal and updated prior to expiry.'
        },
        {
          title: 'KYC & Documentation Verification',
          content: 'Vendors must submit valid Aadhaar Card, PAN Card, active Bank Account / verified UPI ID, and high-resolution storefront photos during onboarding. Incomplete or falsified documents will result in immediate disqualification.'
        },
        {
          title: 'Visible Display of FSSAI License',
          content: 'A physical printout of the FSSAI license certificate and StreetBites QR code must be displayed prominently at the physical food stall for field audits and customer trust.'
        },
        {
          title: 'Street Vending Act & Municipal Compliance',
          content: 'Vendors operating in designated Khau Gallis must adhere to local municipal corporation regulations, designated stall boundaries, and local zoning laws.'
        }
      ]
    },
    {
      id: 'menu',
      category: '2. Menu Integrity, Pricing & Dietary Tags',
      icon: <Utensils className="w-5 h-5 text-[#D94A38]" />,
      summary: 'Menu approvals, price parity, dietary classifications, and stock management.',
      rules: [
        {
          title: 'Admin Approval for Menu Additions & Edits',
          content: 'All newly added dishes, combo offers, and price revisions are submitted in "Review Pending" status. They must be validated by the StreetBites quality team before going live on the customer app.'
        },
        {
          title: 'Price Parity (Digital vs Stall Prices)',
          content: 'Vendors must list base prices that match their physical counter prices. Inflating base prices on the platform above physical counter prices is strictly prohibited.'
        },
        {
          title: 'Mandatory Veg / Non-Veg & Dietary Labeling',
          content: 'Every menu item must be accurately tagged with its dietary classification (Pure Veg, Non-Veg, Egg, Jain, Vegan). Mislabeling dietary categories carries a zero-tolerance penalty.'
        },
        {
          title: 'Real-Time Stock & Availability Management',
          content: 'When an item or ingredient runs out, the vendor must immediately toggle the item to "Unavailable" in the Vendor Dashboard to prevent unfulfillable customer orders.'
        },
        {
          title: 'Transparent Allergen & Ingredient Disclosures',
          content: 'Dishes containing common allergens (peanuts, tree nuts, dairy, soy, gluten) must include clear descriptions to protect customer health and prevent allergic reactions.'
        }
      ]
    },
    {
      id: 'sla',
      category: '3. Order Fulfillment & Preparation SLAs',
      icon: <Clock className="w-5 h-5 text-[#D94A38]" />,
      summary: 'Turnaround times, multi-stall Khau Galli dispatch coordination, and pickup protocols.',
      rules: [
        {
          title: 'Instant Order Acknowledgment (< 90 Seconds)',
          content: 'Vendors must acknowledge and accept incoming orders within 90 seconds of ringing. Persistent auto-rejections trigger automated offline status.'
        },
        {
          title: 'Standard Preparation Time SLA (10–15 Minutes)',
          content: 'Food preparation should be completed within the standard 10–15 minute window. Unreasonable delays degrade stall visibility and lower Khau Galli dispatch efficiency.'
        },
        {
          title: 'Accurate "Ready for Pickup" Handover',
          content: 'Vendors must tap "Ready for Pickup" only after the food is completely cooked, packed, sealed, and placed in the pickup staging zone—never prematurely while still on the flame.'
        },
        {
          title: 'Khau Galli Delivery Synchronization',
          content: 'StreetBites delivers combined orders from multiple stalls in the same Khau Galli. A delay by one stall holds up the entire order and rider dispatch for other partner vendors.'
        },
        {
          title: 'Adherence to Customer Cooking Notes',
          content: 'Vendors must review and adhere to special cooking instructions (e.g., "less spicy", "no onions", "extra green chutney") whenever feasible.'
        }
      ]
    },
    {
      id: 'hygiene',
      category: '4. Food Safety, Hygiene & Kitchen Sanitation',
      icon: <ShieldAlert className="w-5 h-5 text-[#D94A38]" />,
      summary: 'Hygiene standards, potable water, safe cooking oils, and cross-contamination prevention.',
      rules: [
        {
          title: 'Food Handler Personal Hygiene',
          content: 'Stall staff must wear clean aprons, hairnets or head coverings, and disposable gloves when preparing ready-to-eat dishes. Hands must be washed regularly with soap.'
        },
        {
          title: 'Certified Potable Water Usage',
          content: 'Only clean, filtered, or boiled potable water must be used for cooking, ice cubes, panipuri water, and dishwashing. Tap water of unverified quality is strictly prohibited.'
        },
        {
          title: 'Fresh Ingredients & Safe Oil Norms',
          content: 'All raw materials, vegetables, dairy, and spices must be fresh and unadulterated. Reheating used cooking oil repeatedly (Total Polar Compounds > 25%) is illegal under FSSAI rules and results in immediate delisting.'
        },
        {
          title: 'Cross-Contamination & Utensil Segregation',
          content: 'Stalls serving both vegetarian and non-vegetarian dishes must strictly maintain separate cooking pans, cutting boards, knives, and prep areas.'
        },
        {
          title: 'Daily Stall Sanitization & Pest Control',
          content: 'Prep tables, frying stations, and ingredient storage bins must be scrubbed and disinfected daily before and after operating hours.'
        }
      ]
    },
    {
      id: 'packaging',
      category: '5. Packaging, Sealing & Eco Standards',
      icon: <PackageCheck className="w-5 h-5 text-[#D94A38]" />,
      summary: 'Spill-proof sealing, tamper-evident tape, eco-friendly containers, and condiments.',
      rules: [
        {
          title: 'Leak-Proof & Temperature-Preserving Packaging',
          content: 'Gravies, soups, sambar, and beverages must be packed in sturdy, airtight, leak-proof food-grade containers to withstand motorcycle delivery over rough streets.'
        },
        {
          title: 'Tamper-Evident Safety Seals',
          content: 'All delivery bags and boxes must be securely sealed with tamper-evident stickers or security tape to ensure safety and build customer confidence.'
        },
        {
          title: 'Eco-Friendly & Plastic Ban Compliance',
          content: 'Vendors must utilize biodegradable, bagasse, paper, or recyclable food containers in compliance with state and municipal single-use plastic ban regulations.'
        },
        {
          title: 'Complete Packaging of Condiments & Cutlery',
          content: 'Chutneys, dips, cutlery, and napkins must be cleanly sealed and placed inside the main package to prevent missing item complaints.'
        }
      ]
    },
    {
      id: 'operations',
      category: '6. Online Status & Operating Hours',
      icon: <PowerOff className="w-5 h-5 text-[#D94A38]" />,
      summary: 'Status toggling, scheduled operating hours, and emergency closing procedures.',
      rules: [
        {
          title: 'Accurate "Go Online" Switch Protocol',
          content: 'Turn the "Accepting Orders" toggle ON only when the physical stall is open, ingredients are prepped, and staff is ready to cook. Switch OFF immediately when closing for the day.'
        },
        {
          title: 'Operating Hours ("Open Till") Accuracy',
          content: 'Keep your stall\'s published operating hours updated so customers in your Khau Galli know your exact opening and closing schedule.'
        },
        {
          title: 'Emergency Downtime Notification',
          content: 'In case of sudden ingredient shortages, gas depletion, or weather disruptions, vendors must toggle offline immediately and alert their Khau Galli coordinator.'
        }
      ]
    },
    {
      id: 'revenue',
      category: '7. Revenue Split, Payouts & Invoicing',
      icon: <Scale className="w-5 h-5 text-[#D94A38]" />,
      summary: '95% net vendor payout, 5% platform fee, automated daily settlements, and tax transparency.',
      rules: [
        {
          title: '95% Net Vendor Payout (5% Platform Fee)',
          content: 'Vendors receive 95% of their listed base food price for every successfully fulfilled order. The flat 5% platform fee covers payment processing, technology infrastructure, GPS tracking, and rider dispatch.'
        },
        {
          title: 'Automated Daily Bank Settlement (T+1)',
          content: 'Earnings from completed orders are automatically settled to the vendor\'s registered bank account or verified UPI VPA every 24 hours without manual payout requests.'
        },
        {
          title: 'Zero Onboarding or Monthly Maintenance Fees',
          content: 'StreetBites charges ₹0 registration fees and ₹0 recurring monthly subscriptions. You only pay the 5% platform fee on actual completed sales.'
        },
        {
          title: 'Transparent Accounting & Invoicing',
          content: 'Vendors receive full digital itemized statements for every order cycle, detailing gross sales, platform fee deductions, customer discounts, and net payouts.'
        }
      ]
    },
    {
      id: 'penalties',
      category: '8. Cancellation, Quality Disputes & Penalties',
      icon: <AlertTriangle className="w-5 h-5 text-[#D94A38]" />,
      summary: 'Order cancellation thresholds, customer chargebacks, dispute resolution, and off-platform bans.',
      rules: [
        {
          title: 'Vendor Cancellation Rate Limit (< 3%)',
          content: 'Canceling accepted orders inconveniences hungry customers. Stalls exceeding a 3% monthly cancellation threshold face search deranking and temporary suspension.'
        },
        {
          title: 'Customer Quality Complaints & Chargebacks',
          content: 'If an order is refunded due to wrong items, missing items, spoilage, foreign objects, or burnt food, the cost of the affected item is deducted from the vendor\'s settlement.'
        },
        {
          title: 'Prohibition of Off-Platform Transactions',
          content: 'Soliciting StreetBites customers for direct off-platform cash transactions or bypassing the app is strictly prohibited and results in permanent blacklisting.'
        },
        {
          title: '48-Hour Dispute & Appeal Window',
          content: 'If a vendor believes a customer refund or penalty was unfairly assessed, they may lodge a formal appeal with photo evidence within 48 hours via Vendor Support.'
        }
      ]
    }
  ];

  const filteredCategories = useMemo(() => {
    return ruleCategories
      .map(cat => {
        const matchesCategory = selectedCategory === 'all' || cat.id === selectedCategory;
        if (!matchesCategory) return null;

        if (!searchQuery.trim()) return cat;

        const filteredRules = cat.rules.filter(
          r =>
            r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cat.category.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filteredRules.length === 0) return null;

        return { ...cat, rules: filteredRules };
      })
      .filter(Boolean) as typeof ruleCategories;
  }, [searchQuery, selectedCategory]);

  const totalRulesCount = ruleCategories.reduce((acc, cat) => acc + cat.rules.length, 0);

  return (
    <div className="animate-fadeIn pb-24 max-w-4xl mx-auto space-y-8 font-sans">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#D94A38]/10 text-[#D94A38] text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md">
              Official Partner Policy
            </span>
            <span className="text-xs text-[#8E8B85] font-medium">• Updated for {new Date().getFullYear()}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">
            Vendor Rules & Regulations
          </h1>
          <p className="text-sm text-[#5C5954] mt-1 leading-relaxed">
            Comprehensive platform standards, FSSAI hygiene mandates, revenue split terms, and operational guidelines for street food partners.
          </p>
        </div>
        <div className="bg-[#FAF7F2] border border-[#EAE4DA] px-3.5 py-2 rounded-2xl flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-3xs">
          <Building2 className="w-4 h-4 text-[#D94A38]" />
          <span className="text-xs font-bold text-[#1C1917]">StreetBites Partner Code ({totalRulesCount} Rules)</span>
        </div>
      </div>

      {/* ─── 💰 Transparent 95% / 5% Revenue Split Card ─── */}
      <div className="bg-gradient-to-br from-[#1C1917] to-[#2D2826] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#D94A38] text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                95% / 5% Revenue Split
              </span>
              <span className="text-xs text-stone-400 font-medium">Daily Automated Bank Settlement</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-2">How Your Earnings & Payout Are Calculated</h2>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-2 rounded-xl self-start sm:self-auto shadow-inner">
            <ShieldCheck className="w-4 h-4" /> 100% Guaranteed Daily Payout
          </div>
        </div>

        {/* Visual Split Formula */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 hover:bg-white/8 transition-colors">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span className="font-bold text-white">Your Vendor Share</span>
              <Percent className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white">95%</div>
            <p className="text-xs text-stone-300 mt-1 leading-relaxed">
              You retain 95% of your listed baseline dish price for every delivered order.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 hover:bg-white/8 transition-colors">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span className="font-bold text-white">Platform Service Fee</span>
              <IndianRupee className="w-4 h-4 text-stone-400" />
            </div>
            <div className="text-3xl font-black text-stone-300">5%</div>
            <p className="text-xs text-stone-300 mt-1 leading-relaxed">
              Covers payment gateway fees, rider dispatch, Khau Galli multi-stall batching, and 24/7 customer support.
            </p>
          </div>
        </div>

        {/* Real Example Box */}
        <div className="bg-white/10 border border-white/15 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D94A38] block">
              Transparent Calculation Example
            </span>
            <p className="text-xs text-stone-200 leading-relaxed">
              Base Dish Price: <strong>₹100</strong> → Platform Commission (5%): <strong>₹5</strong> → Vendor Net Payout: <strong className="text-emerald-400">₹95.00</strong>
            </p>
          </div>
          <div className="bg-white text-stone-900 text-xs font-black px-4 py-2.5 rounded-xl shrink-0 shadow-sm">
            Net Payout: ₹95.00 (95%)
          </div>
        </div>
      </div>

      {/* ─── Search & Category Filters ─── */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search rules (e.g. FSSAI, packaging, 95% payout, LPG, ratings, cancellation)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#EAE4DA] rounded-2xl text-sm font-medium text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#D94A38] focus:ring-1 focus:ring-[#D94A38] shadow-3xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-stone-600 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded-md"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${selectedCategory === 'all'
              ? 'bg-[#1C1917] text-white shadow-sm'
              : 'bg-white border border-[#EAE4DA] text-stone-600 hover:bg-[#FAF7F2]'
              }`}
          >
            All Sections ({totalRulesCount})
          </button>
          {ruleCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${selectedCategory === cat.id
                ? 'bg-[#D94A38] text-white shadow-sm'
                : 'bg-white border border-[#EAE4DA] text-stone-600 hover:bg-[#FAF7F2]'
                }`}
            >
              {cat.category.split('. ')[1] || cat.category} ({cat.rules.length})
            </button>
          ))}
        </div>
      </div>

      {/* ─── Categorized Rules Grid ─── */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#EAE4DA] p-12 text-center space-y-3 shadow-3xs">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-800">No rules matched your search</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try searching for terms like "FSSAI", "cancellation", "packaging", "hygiene", or reset filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-2 text-xs font-bold text-[#D94A38] hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((categoryGroup, groupIdx) => (
            <div
              key={categoryGroup.id || groupIdx}
              className="bg-white rounded-3xl border border-[#EAE4DA] overflow-hidden shadow-2xs hover:shadow-sm transition-shadow"
            >
              {/* Category Header */}
              <div className="bg-[#FAF7F2] p-4.5 sm:p-5 border-b border-[#EAE4DA] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#EAE4DA] flex items-center justify-center shadow-3xs">
                    {categoryGroup.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1C1917]">{categoryGroup.category}</h2>
                    <p className="text-[11px] text-[#8E8B85] hidden sm:block">{categoryGroup.summary}</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-stone-500 bg-white border border-[#EAE4DA] px-2.5 py-1 rounded-lg">
                  {categoryGroup.rules.length} {categoryGroup.rules.length === 1 ? 'Rule' : 'Rules'}
                </span>
              </div>

              {/* Rules in Category */}
              <div className="p-5 sm:p-6 space-y-5 divide-y divide-[#F5F0E8]">
                {categoryGroup.rules.map((rule, ruleIdx) => (
                  <div key={ruleIdx} className={ruleIdx > 0 ? 'pt-5' : ''}>
                    <div className="flex items-start gap-3.5">
                      <CheckCircle2 className="w-4 h-4 text-[#D94A38] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-[#1C1917]">{rule.title}</h3>
                        <p className="text-xs text-[#5C5954] leading-relaxed">{rule.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Compliance Notice Banner ─── */}
      <div className="bg-[#FAF7F2] border border-[#EAE4DA] rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-3xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-white border border-[#EAE4DA] flex items-center justify-center text-[#D94A38] shrink-0 shadow-3xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#1C1917]">Need Policy Clarification or Have a Dispute?</h4>
            <p className="text-xs text-[#8E8B85] mt-0.5">
              Contact your designated Khau Galli coordinator or reach StreetBites Partner Support 24/7.
            </p>
          </div>
        </div>
        <a
          href="mailto:support@streetbites.in"
          className="bg-[#1C1917] text-white hover:bg-black font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          Contact Partner Support
        </a>
      </div>
    </div>
  );
};

export default VendorRulesPage;

