import { apiRequest } from "./api";
import logoImg from "../assets/Logo/Logo.png";

/**
 * Dynamically loads the official Razorpay Checkout SDK
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn("Failed to load official Razorpay SDK script from CDN");
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export interface RazorpayOrderData {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  foodItemsTotal: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
}

export interface PlaceOrderPayload {
  cluster_id: string;
  items: Array<{
    stall_id?: string;
    stallId?: string;
    item_id?: string;
    id?: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  delivery_fee: number;
  delivery_address: string;
  delivery_coordinates?: [number, number];
  delivery_notes?: string;
}

export const razorpayService = {
  // 1. Initiate Razorpay Order for customer checkout
  createCheckoutOrder: async (payload: PlaceOrderPayload) => {
    return apiRequest<RazorpayOrderData>("/payments/razorpay/create-order", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 2. Verify Razorpay Payment and finalize order
  verifyPayment: async (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    cluster_id: string;
    items: any[];
    delivery_fee: number;
    delivery_address: string;
    delivery_coordinates?: [number, number];
    delivery_notes?: string;
  }) => {
    return apiRequest<{
      orderId: string;
      orderNumber: string;
      status: string;
      totalAmount: number;
      deliveryOtp: string;
    }>("/payments/razorpay/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 3. Create Cash on Delivery (COD) Order
  createCodOrder: async (payload: PlaceOrderPayload) => {
    return apiRequest<{
      orderId: string;
      orderNumber: string;
      status: string;
      totalAmount: number;
      deliveryOtp: string;
    }>("/payments/cod/create-order", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 4. Initiate Rider COD Debt Repayment
  createRiderDebtOrder: async (riderId?: string) => {
    return apiRequest<{
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      debtAmount: number;
    }>("/payments/rider/repay-debt/create-order", {
      method: "POST",
      body: JSON.stringify({ riderId }),
    });
  },

  // 5. Verify Rider Debt Repayment
  verifyRiderDebtRepay: async (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    riderId?: string;
  }) => {
    return apiRequest<{
      settledAmount: number;
      remainingDebt: number;
    }>("/payments/rider/repay-debt/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 6. Global Admin Financial Ledger & Revenue Overview
  getAdminFinancialOverview: async () => {
    return apiRequest<{
      totalPlatformRevenue: number;
      totalVendorPayouts: number;
      floatingCashInField: number;
      totalRiderDeposits: number;
      transactions: Array<{
        id: string;
        type: string;
        amount: number;
        status: string;
        user: string;
        note: string;
        createdAt: string;
      }>;
    }>("/payments/admin/overview", {
      method: "GET",
    });
  },

  // 7. Customer Orders
  getCustomerOrders: async () => {
    return apiRequest<any[]>("/payments/my-orders", {
      method: "GET",
    });
  },

  // 8. Open Razorpay Checkout Modal UI
  openCheckout: async (options: {
    key: string;
    amount: number;
    currency?: string;
    name?: string;
    description?: string;
    order_id: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    onSuccess: (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => void;
    onDismiss?: () => void;
  }) => {
    // Detect placeholder / mock keys for local development
    const isPlaceholderKey =
      !options.key ||
      options.key === "rzp_test_streetbites" ||
      options.key.includes("YourKey") ||
      options.key === "dummy_key";

    if (isPlaceholderKey) {
      // Render interactive StreetBites Sandbox Payment Modal
      const modalId = "streetbites-razorpay-sim-modal";
      const existing = document.getElementById(modalId);
      if (existing) existing.remove();

      const modalEl = document.createElement("div");
      modalEl.id = modalId;
      modalEl.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(28,25,23,0.65);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="background:#ffffff;border-radius:24px;width:100%;max-width:440px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.3);overflow:hidden;border:1px solid #EAE4DA;animation:fadeIn 0.2s ease-out;">
            <!-- Header -->
            <div style="background:linear-gradient(135deg, #FAF0ED, #FFF8F0);padding:20px 24px;border-bottom:1px solid #FCE8E6;display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:10px;">
                <img src="${logoImg}" alt="StreetBites" style="width:36px;height:36px;border-radius:10px;object-fit:cover;box-shadow:0 3px 8px rgba(217,74,56,0.25);" />
                <div>
                  <h4 style="margin:0;font-size:15px;font-weight:900;color:#1C1917;letter-spacing:-0.2px;">StreetBites Test Gateway</h4>
                  <span style="font-size:11px;color:#8E8B85;font-weight:600;">Razorpay Sandbox Simulator</span>
                </div>
              </div>
              <span style="background:#D94A38;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.5px;">
                Test Mode
              </span>
            </div>

            <!-- Body -->
            <div style="padding:24px;">
              <div style="background:#FAF7F2;border:1px solid #EAE4DA;border-radius:16px;padding:16px;margin-bottom:18px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <span style="font-size:12px;color:#8E8B85;font-weight:600;">Amount Payable:</span>
                  <span style="font-size:20px;font-weight:900;color:#1C1917;">₹${(options.amount / 100).toFixed(1)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#8E8B85;padding-top:8px;border-top:1px dashed #EAE4DA;">
                  <span>Order Reference:</span>
                  <span style="font-family:monospace;font-weight:700;color:#5A5751;">${options.order_id}</span>
                </div>
              </div>

              <!-- Notice -->
              <div style="background:#F4F9FF;border:1px solid #D0E2FF;border-radius:14px;padding:12px 14px;margin-bottom:22px;font-size:11px;color:#0043CE;line-height:1.5;">
                <strong style="display:block;margin-bottom:2px;">ℹ Test Sandbox Active:</strong>
                Using simulated credentials (<code>rzp_test_streetbites</code>). When you add your real Razorpay Test Key in <code>backend/.env</code>, the official Razorpay popup will open automatically.
              </div>

              <!-- Action Buttons -->
              <div style="display:flex;gap:10px;">
                <button id="sb-sim-cancel-btn" style="flex:1;padding:12px 16px;background:#FAF7F2;border:1px solid #EAE4DA;border-radius:14px;font-size:12px;font-weight:700;color:#5A5751;cursor:pointer;">
                  Cancel
                </button>
                <button id="sb-sim-pay-btn" style="flex:2;padding:12px 16px;background:linear-gradient(135deg,#D94A38,#C43D2E);border:none;border-radius:14px;font-size:12px;font-weight:800;color:#ffffff;cursor:pointer;box-shadow:0 4px 14px rgba(217,74,56,0.3);display:flex;align-items:center;justify-content:center;gap:6px;">
                  ✓ Complete Test Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modalEl);

      const closeSimModal = () => {
        modalEl.remove();
      };

      document.getElementById("sb-sim-cancel-btn")?.addEventListener("click", () => {
        closeSimModal();
        if (options.onDismiss) options.onDismiss();
      });

      document.getElementById("sb-sim-pay-btn")?.addEventListener("click", () => {
        const payBtn = document.getElementById("sb-sim-pay-btn");
        if (payBtn) {
          payBtn.textContent = "Verifying...";
          payBtn.setAttribute("disabled", "true");
        }
        setTimeout(() => {
          closeSimModal();
          options.onSuccess({
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_order_id: options.order_id,
            razorpay_signature: `sig_sim_${Date.now()}`,
          });
        }, 400);
      });

      return;
    }

    const isLoaded = await loadRazorpayScript();

    if (!isLoaded || !window.Razorpay) {
      console.warn("Razorpay SDK not loaded in browser, falling back to simulated test payment");
      setTimeout(() => {
        options.onSuccess({
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_order_id: options.order_id,
          razorpay_signature: `sig_sim_${Date.now()}`,
        });
      }, 800);
      return;
    }

    try {
      const absoluteLogoUrl = typeof window !== "undefined"
        ? (logoImg.startsWith("http") ? logoImg : new URL(logoImg, window.location.origin).href)
        : logoImg;

      const rzpOptions = {
        key: options.key,
        amount: options.amount,
        currency: options.currency || "INR",
        name: options.name || "StreetBites",
        description: options.description || "Multi-Stall Street Food Checkout",
        image: (options as any).image || absoluteLogoUrl,
        order_id: options.order_id,
        handler: function (response: any) {
          options.onSuccess({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id || options.order_id,
            razorpay_signature: response.razorpay_signature || `sig_${Date.now()}`,
          });
        },
        prefill: {
          name: options.customerName || "",
          email: options.customerEmail || "",
          contact: options.customerPhone || "",
        },
        theme: {
          color: "#D94A38",
        },
        modal: {
          ondismiss: function () {
            if (options.onDismiss) {
              options.onDismiss();
            }
          },
        },
      };

      const rzp = new window.Razorpay(rzpOptions);

      rzp.on("payment.failed", function (failResponse: any) {
        console.warn("Razorpay payment failed:", failResponse?.error);
        if (options.onDismiss) {
          options.onDismiss();
        }
      });

      rzp.open();
    } catch (openErr) {
      console.error("Failed to open Razorpay checkout modal:", openErr);
      if (options.onDismiss) {
        options.onDismiss();
      }
    }
  },
};

export default razorpayService;
