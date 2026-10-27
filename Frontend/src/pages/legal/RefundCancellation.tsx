import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, RefreshCw, Clock, CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-react';

export const RefundCancellation: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#8E8B85] hover:text-[#1C1917] transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 sm:p-10 mb-8 shadow-xs">
          <div className="flex items-center gap-3 text-[#D94A38] mb-3">
            <RefreshCw className="w-7 h-7" />
            <span className="text-xs font-black uppercase tracking-widest text-[#D94A38]">Customer Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#1C1917] tracking-tight">
            Refund & Cancellation Policy
          </h1>
          <p className="text-sm text-[#8E8B85] mt-2">
            Clear, transparent guidelines on order cancellations, payment refunds, and resolution timelines.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl border border-[#EAE4DA] p-6 sm:p-10 shadow-xs space-y-8 text-[#5C5954] text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#D94A38]" />
              1. Order Cancellation Windows
            </h2>
            <p>
              Due to the fast-paced nature of street food preparation where ingredients are assembled immediately upon receipt, the following cancellation terms apply:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#EAE4DA]">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Within 60 Seconds of Order</span>
                </div>
                <p className="text-xs text-[#8E8B85]">
                  100% full refund if cancelled immediately before the vendor begins heating grills or tossing tavas.
                </p>
              </div>
              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#EAE4DA]">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-1">
                  <AlertOctagon className="w-4 h-4" />
                  <span>After Cooking Has Begun</span>
                </div>
                <p className="text-xs text-[#8E8B85]">
                  Cancellations requested after food preparation has commenced cannot be refunded as freshly cooked dishes cannot be re-served.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917]">
              2. Refund Eligibility Criteria
            </h2>
            <p>
              Customers are entitled to a full or partial refund under the following verified circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-[#5C5954]">
              <li><strong>Missing or Incorrect Items:</strong> If any dish ordered from a stall was omitted or mistakenly substituted.</li>
              <li><strong>Damaged or Tampered Packaging:</strong> If the packaging was visibly compromised or spilled during transit.</li>
              <li><strong>Excessive Delivery Delay:</strong> If the order delivery exceeds the estimated delivery timeframe by more than 45 minutes due to non-weather logistical issues.</li>
              <li><strong>Stall Out of Stock:</strong> If a vendor is unable to fulfill an accepted item due to sudden ingredient exhaustion.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917]">
              3. Refund Processing Timelines
            </h2>
            <p>
              Once approved by our support team or admin dispute resolution, refunds are initiated immediately to the original payment source:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE4DA] text-[#1C1917] font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3">Credit Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F0E8] text-[#5C5954]">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-[#1C1917]">UPI (GPay / PhonePe / Paytm)</td>
                    <td className="py-2.5 px-3 text-emerald-700 font-medium">Instant to 2 hours</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-[#1C1917]">Credit / Debit Cards</td>
                    <td className="py-2.5 px-3">3 to 5 business days</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-[#1C1917]">Net Banking</td>
                    <td className="py-2.5 px-3">2 to 4 business days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-[#1C1917] flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#D94A38]" />
              4. How to Request a Refund
            </h2>
            <p>
              To request a refund, navigate to <strong>My Orders</strong>, select the specific order, and click <strong>Report Issue / Request Refund</strong> with photos of the damaged or incorrect item. Our support operations team reviews and processes claims within 30 minutes during active Khau Galli hours.
            </p>
          </section>

          <section className="pt-6 border-t border-[#F5F0E8] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-stone-400">
              Need immediate help? Contact: <span className="text-[#D94A38] font-bold">support@streetbites.in</span>
            </p>
            <button
              onClick={() => navigate('/home')}
              className="px-6 py-2.5 rounded-xl bg-[#D94A38] hover:bg-[#B33525] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          </section>

        </div>
      </div>
    </div>
  );
};

export default RefundCancellation;
