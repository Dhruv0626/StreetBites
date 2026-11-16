# 🍔 StreetBites — Hyperlocal Multi-Stall Street Food Ordering & Delivery Platform

> ### 📖 Platform Definition
> **StreetBites** is a full-stack, cluster-based hyperlocal street food discovery and on-demand delivery platform designed to organize and digitize the informal street food economy. The platform enables consumers to discover geofenced street food hubs and place unified orders across multiple independent street food stalls in a single transaction with a single delivery fee, while equipping vendors with digital order management and automated onboarding, delivery partners with multi-point cluster routing and cash reconciliation, and platform operators with centralized KYC verification and real-time operational governance.

---

## 📑 Table of Contents

- [🌟 Core Innovation & Problem Solved](#-core-innovation--problem-solved)
- [👥 Four-Sided Ecosystem & Portals](#-four-sided-ecosystem--portals)
  - [🛒 1. Customer Experience Portal](#-1-customer-experience-portal)
  - [👨‍🍳 2. Vendor Management Hub](#-2-vendor-management-hub)
  - [🛵 3. Rider Logistics & Fleet Portal](#-3-rider-logistics--fleet-portal)
  - [🛡️ 4. Master Admin Governance Portal](#-4-master-admin-governance-portal)
- [🔄 Multi-Stall Order & Delivery Lifecycle](#-multi-stall-order--delivery-lifecycle)
- [💻 Technology Stack](#-technology-stack)
- [📂 Project Directory Layout](#-project-directory-layout)
- [⚙️ Configuration & Environment Variables](#-configuration--environment-variables)
- [🚀 Local Setup & Quickstart](#-local-setup--quickstart)
- [🔌 Comprehensive API Route Reference](#-comprehensive-api-route-reference)
  - [🔐 Authentication & Session](#-authentication--session-routes)
  - [🛍️ Customer & Marketplace](#-customer--marketplace-routes)
  - [🍳 Vendor Operations](#-vendor-operations-routes)
  - [📦 Rider Logistics](#-rider-logistics-routes)
  - [⚙️ Admin Controls](#-admin-controls-routes)
- [🔒 Security, Privacy & PII Compliance](#-security-privacy--pii-compliance)

---

## 🌟 Core Innovation & Problem Solved

Traditional food delivery applications treat every restaurant as a standalone pick-up point, charging separate delivery fees and dispatching separate drivers. In street food hubs (*Khau Gallis, night markets, food squares*), multiple micro-vendors operate within meters of each other. 

StreetBites introduces **Cluster-Aware Fulfillment**:

| 🛑 Traditional Delivery Platforms | ✨ StreetBites Cluster Architecture |
| :--- | :--- |
| ❌ Order from 2 stalls = 2 separate orders & 2 delivery fees | ✅ Single unified cart spanning multiple stalls in a cluster |
| ❌ 2 riders dispatched to the same street food corner | ✅ 1 rider gathers all sub-orders sequentially in one visit |
| ❌ Informal vendors excluded due to complex onboarding | ✅ Self-serve digital KYC with auto-generated verification documents |
| ❌ No support for daily cash debt reconciliation | ✅ Integrated double-entry COD cash ledger for delivery partners |

---

## 👥 Four-Sided Ecosystem & Portals

```
                             ┌───────────────────────────────┐
                             │    🍔 StreetBites Platform    │
                             └───────────────┬───────────────┘
                                             │
             ┌─────────────────┬─────────────┴─────────────┬─────────────────┐
             ▼                 ▼                           ▼                 ▼
   ┌──────────────────┐ ┌──────────────────┐     ┌──────────────────┐ ┌──────────────────┐
   │   🛒 CUSTOMER   │ │    👨‍🍳 VENDOR     │     │     🛵 RIDER    │  │     🛡️ ADMIN     │
   │ Foodie Discovery │ │ Kitchen Display  │     │ Fleet Logistics  │ │ Master Control   │
   │   & Multi-Cart   │ │  & Menu Studio   │     │  & GPS Routing   │ │ & KYC Governance │
   └──────────────────┘ └──────────────────┘     └──────────────────┘ └──────────────────┘
```

### 🛒 1. Customer Experience Portal
* **📍 Hyperlocal Geofencing:** Automatic detection of nearby street food clusters via GPS coordinates and interactive TomTom mapping.
* **🍜 Category & Dietary Filters:** Real-time filtering for vegetarian, non-vegetarian, Jain-friendly, popular snacks, and beverages.
* **🛍️ Multi-Stall Unified Cart:** Add items from multiple vendors within the same active cluster; the system automatically creates linked sub-orders.
* **💳 Flexible Payment Options:** Seamless checkout supporting digital payments via Razorpay, built-in wallet balances, and Cash on Delivery (COD).
* **📦 Live Visual Tracking:** Real-time state progress indicators (*Order Placed $\rightarrow$ Preparing $\rightarrow$ Picked Up $\rightarrow$ Delivering $\rightarrow$ Completed*).
* **⭐ Feedback & Bookmarks:** Leave ratings and text reviews for individual stalls; bookmark preferred stalls for one-tap access.

### 👨‍🍳 2. Vendor Management Hub
* **📝 Self-Serve Onboarding:** Guided digital registration capturing stall details, FSSAI registration numbers, and banking details.
* **🛎️ Kitchen Display System (KDS):** Incoming sub-orders update live with audio notifications; one-click transitions (`NEW` $\rightarrow$ `PREPARING` $\rightarrow$ `READY`).
* **📋 Dynamic Menu Studio:** Add or update dishes, adjust pricing, upload food photography via Cloudinary, and toggle instant item availability.
* **📊 Visual Earnings & Analytics:** Recharts-powered sales trends, popular dish analytics, commission deductions, and pending payout balances.
* **🧼 Hygiene Compliance:** Access to food safety benchmarks, packaging guidelines, and platform hygiene ratings.

### 🛵 3. Rider Logistics & Fleet Portal
* **🪪 Partner Verification:** Driver profile submission including Driving License, Vehicle Registration (RC), and identity details.
* **📍 Proximity Order Queue:** Real-time broadcast of available cluster orders within rider operating zones.
* **🗺️ Multi-Point Waypoint Navigation:** Route sequence guiding the rider to each vendor stall in the cluster before navigating to the customer.
* **💵 COD Cash Debt Tracking:** Running reconciliation of physical cash collected from customers, platform service cuts, and net earnings.
* **🛡️ Rider Support & Guidelines:** Road safety protocols, bad-weather compensation rules, and direct emergency dispatch.

### 🛡️ 4. Master Admin Governance Portal
* **📈 Executive Analytics:** Live overview of platform Gross Merchandise Value (GMV), active delivery fleet count, open orders, and commissions.
* **✅ KYC Verification Center:** Review submitted vendor and rider applications, inspect documents, view generated PDF files, and record audit notes.
* **🗺️ Cluster Boundary Manager:** Define geographic cluster centroids, geofence radiuses, operating hours, and active/inactive states.
* **🏷️ Promotions & Coupon Engine:** Create percentage-based or flat discount codes with minimum order values, usage limits, and expiration windows.
* **⚖️ Dispute & Complaint Management:** Review customer dispute tickets, rider fulfillment issues, and handle compensation requests.
* **⚙️ Global Platform Controls:** Dynamic adjustments for base delivery fees, distance surcharges, platform commissions, and maintenance modes.

---

## 🔄 Multi-Stall Order & Delivery Lifecycle

```
[Customer]                [API Gateway & DB]            [Vendor Stalls]          [Rider Partner]
    │                             │                            │                        │
    ├── 1. Checkout Multi-Cart ──>│                            │                        │
    │   (Stall A + Stall B)       ├── 2. Save Master Order ────┤                        │
    │                             │   & Split Sub-Orders       │                        │
    │                             │                            │                        │
    │                             ├── 3. Broadcast Sub-Orders ─┤                        │
    │                             │      (Stall A & Stall B)   │                        │
    │                             │<── 4. Stalls Mark "READY" ─┤                        │
    │                             │                                                     │
    │                             ├── 5. Dispatch to Cluster Queue ────────────────────>│
    │                             │                                                     │
    │                             │<── 6. Accept & Perform Waypoint Pickups ────────────┤
    │                             │      (Pick up Stall A, then Stall B)                │
    │                             │                                                     │
    │<── 7. Deliver & OTP Verify ───────────────────────────────────────────────────────┤
    │                             │                                                     │
    │                             ├── 8. Settle Vendor Ledgers & Record Rider Debt ────>│
```

---

## 💻 Technology Stack

### Frontend Architecture
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React & React Icons
- **Mapping:** TomTom Web SDK Maps v6
- **Data Visualization:** Recharts v3
- **Document Engine:** Client-Side ISO 32000-1 Compliant PDF Generator (`pdfGenerator.ts`)

### Backend Architecture
- **Runtime:** Bun 1.1 / Node.js 20+
- **Framework:** Express 5.2 (REST Architecture)
- **Database:** MongoDB Atlas via Mongoose 8.9 ODM
- **Authentication:** Dual-Token JWT (Access + Refresh in HTTP-Only Cookies)
- **Password Security:** Argon2id
- **HTTP Hardening:** Helmet 8
- **Traffic Control:** Sliding-Window In-Memory Rate Limiting
- **Cloud Assets:** Cloudinary SDK v2
- **Payment Gateway:** Razorpay SDK Integration

---

## 📂 Project Directory Layout

```text
streetBites/
├── 🌐 backend/
│   ├── src/
│   │   ├── config/              # MongoDB Mongoose database connection
│   │   ├── controllers/         # Business logic handlers (Auth, Orders, Riders, Stalls)
│   │   ├── middlewares/         # Role-based guards, rate limiting, and Helmet security
│   │   ├── models/              # Mongoose schemas (User, Stall, Cluster, Order, SubOrder)
│   │   ├── routes/              # Express API endpoint definitions
│   │   ├── seeds/               # Initial cluster and vendor seed datasets
│   │   └── utils/               # Cloudinary uploader, audit logger, and PII masking
│   ├── .env                     # Backend environment configuration
│   ├── index.ts                 # Server bootstrap and middleware pipeline
│   └── package.json
│
├── 🎨 Frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI widgets, navigation bars, and modals
│   │   ├── context/             # Global React state (AuthContext, CartContext)
│   │   ├── hooks/               # Custom hooks (geolocation, debounced inputs)
│   │   ├── pages/
│   │   │   ├── admin/           # Admin dashboards (Overview, Verification, Clusters)
│   │   │   ├── auth/            # Authentication (Sign In, Sign Up, Password Reset)
│   │   │   ├── customer/        # Customer storefront, cart, orders, profile
│   │   │   ├── legal/           # Terms of Service, Privacy, Food Hygiene standards
│   │   │   ├── rider/           # Rider order queue, GPS route, earnings, debt ledger
│   │   │   └── vendor/          # Kitchen display, menu studio, payouts, KYC form
│   │   ├── services/            # Axios / Fetch HTTP client layer
│   │   ├── utils/               # PDF generator and date formatting utilities
│   │   ├── App.tsx              # Application routing tree
│   │   └── main.tsx             # React DOM entry point
│   ├── .env                     # Client environment configuration
│   └── package.json
│
└── 📄 README.md                 # Project documentation
```

---

## ⚙️ Configuration & Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Required | Description |
| :--- | :---: | :--- |
| `PORT` | Optional | Server port (defaults to `3000`) |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `JWT_ACCESS_SECRET` | **Yes** | Secret for signing short-lived access tokens |
| `JWT_ACCESS_EXPIRES_IN`| Optional | Access token expiration (e.g., `15m`) |
| `JWT_REFRESH_SECRET` | **Yes** | Secret for signing long-lived refresh tokens |
| `JWT_REFRESH_EXPIRES_IN`| Optional| Refresh token expiration (e.g., `7d`) |
| `CLIENT_URL` | Optional | Allowed CORS origin (e.g., `http://localhost:5173`) |
| `ADMIN_SECRET_KEY` | **Yes** | Passphrase required to register system administrators |
| `CLOUDINARY_CLOUD_NAME`| **Yes** | Cloudinary account identifier |
| `CLOUDINARY_API_KEY` | **Yes** | Cloudinary public API key |
| `CLOUDINARY_API_SECRET`| **Yes** | Cloudinary private API secret |
| `TOMTOM_API_KEY` | **Yes** | TomTom developer API key for location lookups |
| `RAZORPAY_KEY_ID` | **Yes** | Razorpay public key ID |
| `RAZORPAY_KEY_SECRET` | **Yes** | Razorpay secret key |

### Frontend Configuration (`Frontend/.env`)

| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_API_BASE_URL` | **Yes** | Base URL pointing to the backend API (`http://localhost:3000/api`) |
| `VITE_TOMTOM_API_KEY` | **Yes** | TomTom public key for rendering client maps |
| `VITE_RAZORPAY_KEY_ID` | **Yes** | Razorpay public key for checkout initialization |

---

## 🚀 Local Setup & Quickstart

### Prerequisites
- **Node.js** (v20+) or **Bun** (v1.1+)
- **MongoDB** (local server or MongoDB Atlas cluster)
- API keys for **TomTom Maps**, **Cloudinary**, and **Razorpay**

### 1. Backend Service
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
# or with Bun:
# bun install

# Start development server
npm run dev
# or with Bun:
# bun run dev
```
*Backend server starts on `http://localhost:3000`.*

### 2. Frontend Application
```bash
# Navigate to Frontend directory (in a new terminal)
cd Frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend application starts on `http://localhost:5173`.*

### 3. Concurrent Startup
To run both backend and frontend concurrently from the `Frontend` folder:
```bash
cd Frontend
npm start
```

---

## 🔌 Comprehensive API Route Reference

Base API Path: `/api`

### 🔐 Authentication & Session Routes
| HTTP Method | Route | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Public | Register customer, vendor, or rider account |
| `POST` | `/api/auth/signin` | Public | Authenticate user and issue JWT cookies |
| `POST` | `/api/auth/refresh` | Public | Renew access token via refresh token |
| `POST` | `/api/auth/logout` | Authenticated | Invalidate session cookies |
| `POST` | `/api/auth/forgot-password` | Public | Request password reset token |
| `POST` | `/api/auth/reset-password` | Public | Reset password using one-time verification token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile |

### 🛍️ Customer & Marketplace Routes
| HTTP Method | Route | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/clusters` | Public | Fetch all active food clusters |
| `GET` | `/api/clusters/:id` | Public | Retrieve cluster info and member stalls |
| `GET` | `/api/stalls/near-me` | Public | Spatial query for stalls within radius |
| `GET` | `/api/stalls/:id` | Public | Fetch stall menu, ratings, and hygiene score |
| `GET` | `/api/cart` | Customer | Retrieve customer cart contents |
| `POST` | `/api/cart/add` | Customer | Add item to cart (validates single cluster rule) |
| `POST` | `/api/payment/checkout` | Customer | Place master order and generate sub-orders |
| `GET` | `/api/orders/my-orders` | Customer | Retrieve personal order history and live statuses |
| `POST` | `/api/reviews` | Customer | Submit feedback for a fulfilled stall order |

### 🍳 Vendor Operations Routes
| HTTP Method | Route | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/onboarding/vendor` | User | Submit vendor KYC, FSSAI, and stall profile |
| `GET` | `/api/vendor/menu` | Vendor | Retrieve all menu items for the stall |
| `POST` | `/api/vendor/menu` | Vendor | Add new menu item with Cloudinary image |
| `PUT` | `/api/vendor/menu/:id` | Vendor | Update pricing, description, or availability |
| `DELETE` | `/api/vendor/menu/:id` | Vendor | Remove an item from the menu |
| `GET` | `/api/vendor/orders` | Vendor | Fetch active sub-orders for kitchen display |
| `PUT` | `/api/vendor/orders/:id/status`| Vendor | Advance sub-order status (`PREPARING` / `READY`)|
| `GET` | `/api/vendor/payouts` | Vendor | View financial statements and payout records |

### 📦 Rider Logistics Routes
| HTTP Method | Route | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/onboarding/rider` | User | Submit vehicle registration and driver license |
| `GET` | `/api/rider/queue` | Rider | View available cluster delivery jobs |
| `POST` | `/api/rider/accept/:id` | Rider | Accept a cluster delivery job |
| `PUT` | `/api/rider/orders/:id/status` | Rider | Update transit status (`PICKED_UP` / `DELIVERING`)|
| `POST` | `/api/rider/orders/:id/complete`| Rider | Complete drop-off with customer OTP verification |
| `GET` | `/api/rider/earnings` | Rider | View trip compensation and summaries |
| `GET` | `/api/rider/debt` | Rider | View collected COD cash pending remittance |

### ⚙️ Admin Controls Routes
| HTTP Method | Route | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/overview` | Admin | Overall metrics (GMV, active orders, active riders) |
| `GET` | `/api/admin/verifications` | Admin | List pending vendor and rider KYC applications |
| `PUT` | `/api/admin/verify/:id` | Admin | Approve or reject onboarding with audit notes |
| `POST` | `/api/admin/clusters` | Admin | Create a new geofenced food cluster |
| `PUT` | `/api/admin/clusters/:id` | Admin | Edit cluster coordinates, boundary, or status |
| `POST` | `/api/admin/offers` | Admin | Create promotional discount codes |
| `GET` | `/api/admin/transactions` | Admin | Full double-entry financial audit ledger |
| `PUT` | `/api/admin/settings` | Admin | Update platform commission and delivery fees |

---

## 🔒 Security, Privacy & PII Compliance

- **Argon2id Hashing:** Password security uses the Argon2id algorithm with dedicated memory-cost and time-cost parameters to resist brute-force cracking.
- **Dual-Token Session Architecture:** Short-lived access tokens (15-minute validity) paired with long-lived refresh tokens (7-day validity) stored in `HttpOnly`, `SameSite=Strict` cookies.
- **Role-Based Access Control (RBAC):** Middleware checks verify user permissions (`Customer`, `Vendor`, `Rider`, `Admin`) before granting access to protected endpoints.
- **PII Data Masking:** Phone numbers, bank account identifiers, and national identity numbers are masked prior to client-side serialization.
- **Audit Trails:** Administrative approvals, rejections, and fee changes are permanently logged to an immutable `KycAuditLog` collection.
- **HTTP Header Hardening:** Helmet middleware applies Content Security Policy (CSP), frame protection, and HSTS headers.
- **Sliding-Window Rate Limiting:** Protects sensitive authentication and verification routes against automated abuse.
