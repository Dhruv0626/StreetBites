import { TOMTOM_API_KEY } from '../config/tomtom';

/**
 * Forward & Reverse Geocoding Utility for StreetBites
 * Resolves real [lat, lng] coordinates from typed user address strings.
 */

export interface GeocodeOptions {
  area?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  detail?: string;
  house_no?: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress?: string;
}

/**
 * Forward geocoding with multi-tier candidate queries.
 * By querying clean "Area, City, Pincode" separately from internal "Flat 402",
 * TomTom Geocoding API resolves exact coordinates reliably!
 */
export async function geocodeAddressText(
  input: string | GeocodeOptions,
  optionalLandmark?: string
): Promise<GeocodeResult | null> {
  const options: GeocodeOptions =
    typeof input === 'string'
      ? { detail: input, landmark: optionalLandmark }
      : input;

  const { area, city = 'Ahmedabad', pincode, landmark, detail } = options;

  // Build high-confidence candidate queries from most specific clean locality to broader fallbacks
  const candidateQueries: string[] = [];

  // 1. Area + City + Pincode (Extremely high TomTom accuracy for Indian addresses)
  if (area && area.trim()) {
    candidateQueries.push([area.trim(), city, pincode, 'Gujarat, India'].filter(Boolean).join(', '));
  }

  // 2. Landmark + Area + City
  if (landmark && landmark.trim()) {
    if (area && area.trim()) {
      candidateQueries.push([landmark.trim(), area.trim(), city, 'Gujarat, India'].filter(Boolean).join(', '));
    } else {
      candidateQueries.push([landmark.trim(), city, pincode, 'Gujarat, India'].filter(Boolean).join(', '));
    }
  }

  // 3. Raw detail + City fallback
  if (detail && detail.trim()) {
    candidateQueries.push([detail.trim(), city, 'Gujarat, India'].filter(Boolean).join(', '));
  }

  // 4. Area alone fallback
  if (area && area.trim() && !candidateQueries.includes(`${area.trim()}, Ahmedabad, India`)) {
    candidateQueries.push(`${area.trim()}, Ahmedabad, India`);
  }

  if (candidateQueries.length === 0) {
    return null;
  }

  const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY || TOMTOM_API_KEY;

  // 1. Try TomTom Geocoding API across candidate queries
  for (const query of candidateQueries) {
    try {
      const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?countrySet=IN&key=${tomtomKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const firstResult = data.results?.[0];
        if (firstResult?.position?.lat && firstResult?.position?.lon) {
          const lat = Number(firstResult.position.lat);
          const lng = Number(firstResult.position.lon);
          // Avoid central Ahmedabad default if a more specific match is found
          return {
            lat,
            lng,
            formattedAddress: firstResult.address?.freeformAddress || query,
          };
        }
      }
    } catch (err) {
      console.warn(`TomTom forward geocode fallback for "${query}":`, err);
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim
  for (const query of candidateQueries) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const nomRes = await fetch(nomUrl, {
        headers: { 'Accept-Language': 'en' },
      });
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (Array.isArray(nomData) && nomData.length > 0 && nomData[0].lat && nomData[0].lon) {
          return {
            lat: parseFloat(nomData[0].lat),
            lng: parseFloat(nomData[0].lon),
            formattedAddress: nomData[0].display_name,
          };
        }
      }
    } catch (nomErr) {
      console.warn(`Nominatim fallback geocode error for "${query}":`, nomErr);
    }
  }

  return null;
}

export interface ReverseGeocodeResult {
  area: string;
  city: string;
  pincode: string;
  formattedAddress: string;
}

/**
 * Reverse geocodes [lat, lng] to exact "Area, City" format (e.g. "Chandkheda, Ahmedabad")
 * Queries OpenStreetMap Nominatim for rich Indian suburbs/localities with TomTom fallback.
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  let detectedArea = '';
  let detectedCity = 'Ahmedabad';
  let detectedPincode = '';

  // 1. Primary: Nominatim (granular suburb/neighbourhood mappings)
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const nomRes = await fetch(nomUrl, {
      headers: { 'Accept-Language': 'en' },
    });
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      const addr = nomData.address;
      if (addr) {
        detectedArea =
          addr.suburb ||
          addr.neighbourhood ||
          addr.neighborhood ||
          addr.residential ||
          addr.quarter ||
          addr.city_district ||
          addr.road ||
          '';

        const rawCity = addr.city || addr.town || addr.municipality || addr.state_district || addr.district || '';
        if (rawCity && !rawCity.toLowerCase().includes('taluka')) {
          detectedCity = rawCity;
        } else {
          detectedCity = 'Ahmedabad';
        }

        detectedPincode = addr.postcode || '';
      }
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode error:', err);
  }

  // 2. Secondary: TomTom reverse geocode if area not found or identical to city
  if (!detectedArea || detectedArea.toLowerCase() === detectedCity.toLowerCase()) {
    try {
      const tomtomKey = import.meta.env.VITE_TOMTOM_API_KEY || TOMTOM_API_KEY;
      const tomtomUrl = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${tomtomKey}`;
      const tomtomRes = await fetch(tomtomUrl);
      if (tomtomRes.ok) {
        const tomtomData = await tomtomRes.json();
        const addr = tomtomData.addresses?.[0]?.address;
        if (addr) {
          const ttArea =
            addr.municipalitySubdivision ||
            addr.neighborhood ||
            addr.streetName ||
            addr.subdivision ||
            '';
          if (ttArea && ttArea.toLowerCase() !== (addr.municipality || '').toLowerCase()) {
            detectedArea = ttArea;
          }
          if (addr.municipality && !addr.municipality.toLowerCase().includes('taluka')) {
            detectedCity = addr.municipality;
          }
          if (addr.postalCode && !detectedPincode) {
            detectedPincode = addr.postalCode;
          }
        }
      }
    } catch (err) {
      console.warn('TomTom reverse geocode error:', err);
    }
  }

  // Clean up area string: Remove any "Taluka" substring
  detectedArea = (detectedArea || '')
    .replace(/\b\w+\s+taluka\b/gi, '')
    .replace(/\btaluka\b/gi, '')
    .replace(/,\s*,/g, ',')
    .trim()
    .replace(/^,\s*|,\s*$/g, '');

  detectedCity = (detectedCity || 'Ahmedabad')
    .replace(/\b\w+\s+taluka\b/gi, '')
    .replace(/\btaluka\b/gi, '')
    .trim();

  // If area is empty or equal to city, fallback to Ahmedabad default locality
  if (!detectedArea || detectedArea.toLowerCase() === detectedCity.toLowerCase()) {
    detectedArea = 'Central Ahmedabad';
  }

  const parts: string[] = [];
  if (detectedArea) parts.push(detectedArea);
  if (detectedCity && !parts.includes(detectedCity)) parts.push(detectedCity);

  const cityWithPin = detectedPincode ? `${detectedCity} - ${detectedPincode}` : detectedCity;
  const formattedAddress = detectedArea ? `${detectedArea}, ${cityWithPin}` : cityWithPin;

  return {
    area: detectedArea,
    city: detectedCity,
    pincode: detectedPincode,
    formattedAddress,
  };
}

