import type { Request, Response, NextFunction } from "express";

/**
 * Enterprise Helmet Security Configuration for StreetBites
 * 
 * Provides defense-in-depth against:
 * - Cross-Site Scripting (XSS)
 * - Clickjacking / UI Redressing
 * - MIME-sniffing exploits
 * - Insecure Transport (HSTS)
 * - Technology Fingerprinting (Removes X-Powered-By)
 * - Cross-Origin Resource & Embedder leaks
 * 
 * Carefully calibrated to ensure zero breaking changes for:
 * - Razorpay Payment Checkout iframe & API
 * - TomTom Navigation & Map Tiles
 * - Cloudinary Image Hosting
 * - Google & Facebook OAuth authentication flows
 */

export const applySecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Remove X-Powered-By header to prevent technology fingerprinting
  res.removeHeader("X-Powered-By");

  // 2. Strict-Transport-Security (HSTS): Force HTTPS for 1 year, including all subdomains
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // 3. X-Content-Type-Options: Prevent browsers from MIME-sniffing responses away from declared content-type
  res.setHeader("X-Content-Type-Options", "nosniff");

  // 4. X-Frame-Options: Protect against Clickjacking attacks while permitting self-framing
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // 5. X-XSS-Protection: Disable deprecated, buggy XSS auditors in legacy browsers (OWASP best practice)
  res.setHeader("X-XSS-Protection", "0");

  // 6. X-DNS-Prefetch-Control: Turn off DNS prefetching for user privacy
  res.setHeader("X-DNS-Prefetch-Control", "off");

  // 7. X-Download-Options: Prevent Internet Explorer from executing downloads in site's context
  res.setHeader("X-Download-Options", "noopen");

  // 8. X-Permitted-Cross-Domain-Policies: Disallow Adobe Flash and Acrobat cross-domain policy files
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  // 9. Referrer-Policy: Protect user browsing privacy while transmitting essential origin for payment/auth
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // 10. Cross-Origin-Resource-Policy: Allow frontend application to access API assets/responses across origins
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  // 11. Cross-Origin-Opener-Policy: Allow OAuth popups (Google / Facebook) without breaking opener communication
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  // 12. Content-Security-Policy: Strict yet compatible with Razorpay, TomTom Maps, Cloudinary, and OAuth
  const cspDirectives = [
    "default-src 'self'",
    // Scripts: allow self, inline scripts for React/Vite, Razorpay checkout, and TomTom map SDK
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.tomtom.com",
    // Styles: allow self, inline styles for Tailwind/styled components, and TomTom maps
    "style-src 'self' 'unsafe-inline' https://api.tomtom.com https://fonts.googleapis.com",
    // Fonts: allow self, Google Fonts, and data URIs
    "font-src 'self' data: https://fonts.gstatic.com",
    // Images: allow self, data URIs, blob URIs, Cloudinary, Unsplash, TomTom tiles, OpenStreetMap, Google & Facebook avatars
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.tomtom.com https://*.openstreetmap.org https://*.googleusercontent.com https://*.facebook.com https://*.fbcdn.net",
    // Connect (API / WebSocket / Geocoding / Routing / Payment endpoints)
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.tomtom.com https://*.openstreetmap.org https://accounts.google.com https://oauth2.googleapis.com https://graph.facebook.com https://api.cloudinary.com",
    // Frames: allow Razorpay secure payment modal iframe
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    // Objects: block Flash, Java, and other legacy plugin objects
    "object-src 'none'",
    // Base URI restriction
    "base-uri 'self'",
    // Form action targets
    "form-action 'self' https://accounts.google.com https://www.facebook.com",
  ].join("; ");

  res.setHeader("Content-Security-Policy", cspDirectives);

  next();
};

export default applySecurityHeaders;

