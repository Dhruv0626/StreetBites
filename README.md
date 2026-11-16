# StreetBites — Hyperlocal Street Food Discovery & Cluster Delivery Platform

> **Definition:**  
> **StreetBites** is a full-stack, cluster-based hyperlocal street food discovery and on-demand delivery platform designed to organize and digitize the informal street food economy. The platform enables consumers to discover geofenced street food hubs and place unified orders across multiple independent street food stalls in a single transaction with a single delivery fee, while equipping vendors with digital order management and automated onboarding, delivery partners with multi-point cluster routing and cash reconciliation, and platform operators with centralized KYC verification and real-time operational governance.

---

## Table of Contents

- [Core Value Proposition](#core-value-proposition)
- [System Portals & Roles](#system-portals--roles)
  - [Customer Portal](#customer-portal)
  - [Vendor Management System](#vendor-management-system)
  - [Rider Delivery Fleet](#rider-delivery-fleet)
  - [Admin Governance & Verification](#admin-governance--verification)
- [Multi-Stall Order Lifecycle](#multi-stall-order-lifecycle)
- [Technology Stack](#technology-stack)
- [Project Directory Layout](#project-directory-layout)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Local Setup & Execution](#local-setup--execution)
- [API Route Reference](#api-route-reference)
- [Security Architecture](#security-architecture)

---

## Core Value Proposition

Street food vendors typically operate in tight geographic clusters (such as street food courts, night markets, and khau gallis) without individual digital storefronts. Traditional delivery models require a separate delivery fee for each stall. StreetBites solves this problem through:

1. **Geofenced Food Clusters:** Grouping nearby vendors into defined spatial clusters with geographic boundaries.
2. **Multi-Vendor Single Cart (`SubOrder` Model):** Allowing customers to select items from multiple stalls in the same cluster within one unified checkout.
3. **Coordinated Cluster Pickups:** Directing delivery partners to gather packages sequentially across designated stalls within the cluster before completing a single drop-off to the customer.
4. **Digital Vendor & Rider Onboarding:** Client-side document compilation and structured KYC workflows with administrator verification.

---

## System Portals & Roles

### Customer Portal
- **Location-Based Discovery:** Browse nearby food clusters and stalls using live coordinates and TomTom map visualization.
- **Menu Exploration:** Search items across dietary preferences (Vegetarian, Jain, Non-Vegetarian), categories, and pricing.
- **Unified Cart & Checkout:** Add items from multiple vendors within the same active cluster; choose between digital payment (Razorpay) or Cash on Delivery (COD).
- **Order Tracking:** Track preparation and delivery statuses through real-time state transitions.
- **Reviews & Bookmarks:** Submit vendor feedback and save preferred stalls.

### Vendor Management System
- **Stall Onboarding:** Register stall profile, upload FSSAI credentials, and submit bank settlement details.
- **Kitchen Display System (KDS):** Receive incoming sub-orders, accept requests, and mark preparation progress (`NEW` -> `PREPARING` -> `READY`).
- **Menu Management:** Add and update dishes, set pricing, assign food categories, and toggle live availability.
- **Settlement Ledger:** Monitor daily sales, platform commissions, and net payout statuses.

### Rider Delivery Fleet
- **Rider Verification:** Submit driving license, vehicle registration, and identity documents for administrative approval.
- **Dispatch Queue:** View nearby delivery assignments with visible pickup cluster points and drop-off destinations.
- **Cluster Route Navigation:** Execute sequential pickups across multiple stalls followed by final customer drop-off using TomTom turn-by-turn routing.
- **Cash Management:** Reconcile cash collected on delivery with platform commission tracking.

### Admin Governance & Verification
- **Operational Metrics:** Monitor gross transaction value, active delivery partners, open orders, and platform commission.
- **KYC Verification Center:** Review submitted vendor and rider applications, inspect uploaded credentials, and record approval/rejection audit logs.
- **Cluster Management:** Configure cluster coordinates, geofence radiuses, and operational schedules.
- **Promotions & Settings:** Configure discount coupons, base delivery rates, surge multipliers, and maintenance settings.

---

## Multi-Stall Order Lifecycle

```
Customer Application          API Gateway & Database            Vendor Stalls          Delivery Partner
        |                               |                             |                       |
        |--- 1. Place Cluster Order --->|                             |                       |
        |    (Stall A + Stall B)        |--- 2. Create Master Order ->|                       |
        |                               |    & Split into SubOrders   |                       |
        |                               |                             |                       |
        |                               |--- 3. SubOrder Notification>|                       |
        |                               |       (Stall A & Stall B)   |                       |
        |                               |<-- 4. Mark "READY" ---------|                       |
        |                               |                                                     |
        |                               |--- 5. Assign Cluster Order ------------------------>|
        |                               |                                                     |
        |                               |<-- 6. Confirm Sequential Pickups -------------------|
        |                               |       (Picks up from Stall A, then Stall B)         |
        |                               |                                                     |
        |<-- 7. Deliver Order & OTP Verification ---------------------------------------------|
        |                               |                                                     |
        |                               |--- 8. Update Ledger, Settle Commission & Payouts -->|
```

---

## Technology Stack

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite | Single-page client architecture |
| **Styling** | Tailwind CSS 4, Lucide Icons | Responsive UI layout system |
| **Mapping** | TomTom Web SDK Maps v6 | Geofencing, coordinate mapping, and route calculation |
| **Data Views** | Recharts | Visual sales and platform performance charts |
| **Backend** | Express 5.2, TypeScript, Bun / Node.js | Modular REST service architecture |
| **Database** | MongoDB Atlas, Mongoose 8.9 | Document storage with sub-order relational references |
| **Authentication** | JWT, Argon2 | Role-based token access and password hashing |
| **File Storage** | Cloudinary | Cloud storage for stall and menu imagery |
| **Payments** | Razorpay SDK, In-House COD Ledger | Payment processing and cash reconciliation |

---

## Project Directory Layout

```text
streetBites/
├── backend/
│   ├── src/
│   │   ├── config/              # Database connection
│   │   ├── controllers/         # Business logic for auth, orders, riders, vendors, admin
│   │   ├── middlewares/         # Role authentication, rate limiting, and HTTP hardening
│   │   ├── models/              # Mongoose schemas (Order, SubOrder, Stall, Cluster, User)
│   │   ├── routes/              # Express API endpoints
│   │   ├── seeds/               # Seed data for clusters and stalls
│   │   └── utils/               # Audit logger, image upload, and PII masking
│   ├── .env                     # Backend configuration
│   ├── index.ts                 # Server entry point
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── components/          # Reusable interface components
│   │   ├── context/             # State providers (Auth, Cart)
│   │   ├── pages/
│   │   │   ├── admin/           # Admin verification, clusters, overview
│   │   │   ├── auth/            # Sign in, sign up, password recovery
│   │   │   ├── customer/        # Customer storefront, cart, orders, profile
│   │   │   ├── rider/           # Queue, route navigation, earnings, cash ledger
│   │   │   └── vendor/          # Kitchen display, menu editor, payouts, KYC
│   │   ├── services/            # API communication services
│   │   ├── utils/               # PDF generation and date formatters
│   │   ├── App.tsx              # Application route tree
│   │   └── main.tsx             # DOM initialization
│   ├── .env                     # Client configuration
│   └── package.json
└── README.md
```

---

## Configuration & Environment Variables

### Backend (`backend/.env`)

```ini
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
ADMIN_SECRET_KEY=your_admin_registration_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
TOMTOM_API_KEY=your_tomtom_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Frontend (`Frontend/.env`)

```ini
VITE_API_BASE_URL=http://localhost:3000/api
VITE_TOMTOM_API_KEY=your_tomtom_api_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

---

## Local Setup & Execution

### Prerequisites
- Node.js (version 20 or higher) or Bun (version 1.1 or higher)
- An active MongoDB connection string
- Valid TomTom, Cloudinary, and Razorpay API credentials

### 1. Backend Service
```bash
cd backend
npm install
npm run dev
```
*The API service runs on `http://localhost:3000`.*

### 2. Frontend Application
```bash
cd ../Frontend
npm install
npm run dev
```
*The web client runs on `http://localhost:5173`.*

### 3. Concurrent Startup
To run both backend and frontend from the frontend directory:
```bash
cd Frontend
npm start
```

---

## API Route Reference

Base URL prefix: `/api`

### Authentication (`/api/auth`)
- `POST /api/auth/signup` — Register a customer, vendor, or rider account
- `POST /api/auth/signin` — Authenticate user and issue session tokens
- `POST /api/auth/refresh` — Issue a new access token via refresh token
- `POST /api/auth/logout` — Terminate session and invalidate tokens
- `GET /api/auth/me` — Retrieve the currently authenticated profile

### Marketplace & Customer (`/api/clusters`, `/api/cart`, `/api/payment`, `/api/orders`)
- `GET /api/clusters` — Retrieve all active food clusters
- `GET /api/clusters/:id` — Retrieve cluster details and associated stalls
- `GET /api/stalls/near-me` — Proximity query for stalls near given coordinates
- `GET /api/cart` — Fetch customer cart contents
- `POST /api/cart/add` — Add an item to the cart (enforcing single-cluster rule)
- `POST /api/payment/checkout` — Generate master order and sub-orders
- `GET /api/orders/my-orders` — View customer order history and statuses

### Vendor Operations (`/api/vendor`, `/api/onboarding`)
- `POST /api/onboarding/vendor` — Submit vendor profile and verification documents
- `GET /api/vendor/menu` — List menu items for the authenticated vendor's stall
- `POST /api/vendor/menu` — Add a new dish to the stall menu
- `PUT /api/vendor/menu/:id` — Edit an existing dish or change availability
- `GET /api/vendor/orders` — View active sub-orders for kitchen preparation
- `PUT /api/vendor/orders/:id/status` — Advance sub-order status (`PREPARING` / `READY`)
- `GET /api/vendor/payouts` — Review earnings ledger and settlement records

### Rider Logistics (`/api/rider`, `/api/onboarding`)
- `POST /api/onboarding/rider` — Submit driver credentials and vehicle verification
- `GET /api/rider/queue` — Query available delivery assignments
- `POST /api/rider/accept/:id` — Accept an open delivery assignment
- `PUT /api/rider/orders/:id/status` — Update transit status (`PICKED_UP` / `DELIVERING`)
- `POST /api/rider/orders/:id/complete` — Finalize delivery with OTP confirmation
- `GET /api/rider/earnings` — View trip compensation and summaries
- `GET /api/rider/debt` — View cash-on-delivery balance pending platform settlement

### Administration (`/api/admin`)
- `GET /api/admin/overview` — High-level platform KPIs (GMV, active orders, live partners)
- `GET /api/admin/verifications` — List pending vendor and rider onboarding records
- `PUT /api/admin/verify/:id` — Approve or reject an onboarding request with notes
- `POST /api/admin/clusters` — Define a new geofenced food cluster
- `PUT /api/admin/clusters/:id` — Update cluster boundaries and operational settings
- `PUT /api/admin/settings` — Configure platform fee parameters and operational toggles

---

## Security Architecture

- **Password Cryptography:** User passwords are encrypted using Argon2id before persistence.
- **Session Tokens:** Authentication uses short-lived JWT access tokens paired with refresh tokens delivered over secure HTTP-only cookies.
- **Route Authorization:** Middleware guards verify permissions against user roles (`Customer`, `Vendor`, `Rider`, `Admin`) on every protected route.
- **Data Protection:** Personal identification numbers and sensitive banking values are masked prior to client serialization.
- **Header Hardening:** Standard security headers (Content Security Policy, frame protection, and HSTS) are applied via Helmet middleware.
- **Abuse Prevention:** Sliding-window rate limiting is enforced on sensitive endpoints to protect against automated credential abuse.
