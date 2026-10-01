import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Address } from "../models/Address.ts";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Helper to resolve customer ID from token, headers, query, or body
 */
const getCustomerId = (req: AuthenticatedRequest): string | null => {
  const id =
    req.user?.id ||
    (req.headers["x-user-id"] as string) ||
    (req.headers["x-customer-id"] as string) ||
    (req.query.userId as string) ||
    (req.body?.userId as string) ||
    (req.cookies?.customerId as string) ||
    null;

  return id && String(id).trim() ? String(id).trim() : null;
};

/**
 * @desc    Get all saved addresses for the customer
 * @route   GET /api/addresses
 */
export const getAddresses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = getCustomerId(req);
    if (!customerId) {
      res.status(400).json({
        success: false,
        message: "Customer ID is required.",
      });
      return;
    }

    // If customerId is a valid Mongo ObjectId, populate User details
    let query = Address.find({ customer_id: customerId }).sort({ is_primary: -1, createdAt: -1 });
    if (mongoose.Types.ObjectId.isValid(customerId)) {
      query = query.populate("customer_id", "name phone_number email") as any;
    }
    const addresses = await query.lean();

    const formatted = addresses.map((addr: any) => {
      const userRef = addr.customer_id && typeof addr.customer_id === "object" ? addr.customer_id : null;

      // Strip legacy 'Live GPS Location' and Taluka tokens from user-facing detail
      let displayDetail = (addr.detail || "")
        .replace(/Live GPS Location\s*\([^)]*\),?\s*/gi, "")
        .replace(/\b\w+\s+taluka\b,?\s*/gi, "")
        .replace(/\btaluka\b,?\s*/gi, "")
        .replace(/,\s*,/g, ", ")
        .trim();
      if (displayDetail.startsWith(",")) displayDetail = displayDetail.substring(1).trim();

      // If displayDetail is empty or just city name, construct standard format: House no, Landmark, Area, City - Pincode
      if (!displayDetail || displayDetail.toLowerCase() === (addr.city || "ahmedabad").toLowerCase()) {
        const cityPin = addr.pincode ? `${addr.city || "Ahmedabad"} - ${addr.pincode}` : addr.city || "Ahmedabad";
        const parts = [addr.house_no, addr.landmark, addr.area, cityPin]
          .map((p: any) => (p || "").trim())
          .filter(Boolean);
        const unique: string[] = [];
        for (const p of parts) {
          if (!unique.includes(p)) unique.push(p);
        }
        displayDetail = unique.join(", ") || `${addr.area ? `${addr.area}, ` : ""}${cityPin}`;
      }

      return {
        id: String(addr._id),
        _id: String(addr._id),
        label: addr.label,
        detail: displayDetail,
        house_no: addr.house_no || "",
        area: addr.area || "",
        city: addr.city || "Ahmedabad",
        pincode: addr.pincode || "",
        landmark: addr.landmark || "",
        is_primary: Boolean(addr.is_primary),
        receiver_name: userRef?.name || "",
        phone_number: userRef?.phone_number || "",
        coordinates: addr.lat_lng?.coordinates || [72.5714, 23.0225], // [lng, lat]
        lng: addr.lat_lng?.coordinates?.[0] || 72.5714,
        lat: addr.lat_lng?.coordinates?.[1] || 23.0225,
        createdAt: addr.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error("Get Addresses Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch addresses.",
    });
  }
};

export const AHMEDABAD_LOCALITIES: Record<string, [number, number]> = {
  "manek chowk": [72.5873, 23.0248],
  "chandkheda": [72.5815, 23.1118],
  "vastrapur": [72.5284, 23.0360],
  "prahlad nagar": [72.5085, 23.0076],
  "prahladnagar": [72.5085, 23.0076],
  "law garden": [72.5574, 23.0272],
  "bodakdev": [72.5074, 23.0373],
  "satellite": [72.5204, 23.0180],
  "thaltej": [72.5042, 23.0505],
  "navrangpura": [72.5567, 23.0370],
  "naranpura": [72.5508, 23.0560],
  "memnagar": [72.5358, 23.0514],
  "gota": [72.5385, 23.1098],
  "bopal": [72.4645, 23.0338],
  "south bopal": [72.4600, 23.0200],
  "maninagar": [72.6034, 22.9978],
  "paldi": [72.5620, 23.0125],
  "motera": [72.5960, 23.0988],
  "sabarmati": [72.5828, 23.0768],
  "nikol": [72.6685, 23.0450],
  "naroda": [72.6560, 23.0694],
  "shahibaug": [72.5938, 23.0563],
  "sola": [72.5180, 23.0780],
  "science city": [72.4980, 23.0750],
  "ghatlodia": [72.5360, 23.0710],
  "ranip": [72.5680, 23.0790],
  "vejalpur": [72.5230, 23.0060],
  "jodhpur": [72.5200, 23.0240],
  "ambawadi": [72.5480, 23.0210],
  "usmanpura": [72.5710, 23.0470],
  "chandlodiya": [72.5450, 23.0800],
  "gulbai tekra": [72.5450, 23.0280],
  "sg highway": [72.5050, 23.0350],
  "s.g. highway": [72.5050, 23.0350],
  "hirawadi": [72.6450, 23.0540],
  "bapunagar": [72.6320, 23.0370],
  "odhav": [72.6620, 23.0180],
  "vastral": [72.6580, 22.9980],
  "c.g. road": [72.5560, 23.0300],
  "cg road": [72.5560, 23.0300],
  "ashram road": [72.5720, 23.0380],
  "drive in road": [72.5320, 23.0480],
  "sindhu bhavan": [72.4970, 23.0450],
  "sindhubhavan": [72.4970, 23.0450],
  "shilaj": [72.4700, 23.0600],
  "iscon": [72.5060, 23.0260],
  "iskcon": [72.5060, 23.0260],
  "gurukul": [72.5310, 23.0500],
  "panjrapole": [72.5460, 23.0260],
  "iim": [72.5360, 23.0310],
};

/**
 * Helper to geocode address text using TomTom (with Nominatim & Localities fallback)
 */
export const geocodeAddressBackend = async (options: {
  area?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  detail?: string;
}): Promise<{ lat: number; lng: number } | null> => {
  const { area, city = "Ahmedabad", pincode, landmark, detail } = options;

  const combinedText = `${detail || ""} ${area || ""} ${landmark || ""}`.toLowerCase();

  // 1. Instant Locality Dictionary Match
  for (const [localityName, coords] of Object.entries(AHMEDABAD_LOCALITIES)) {
    if (combinedText.includes(localityName)) {
      return {
        lng: coords[0],
        lat: coords[1],
      };
    }
  }

  // 2. Build candidate queries from most specific clean locality
  const candidateQueries: string[] = [];

  if (area && area.trim()) {
    candidateQueries.push([area.trim(), city, pincode, "Gujarat, India"].filter(Boolean).join(", "));
  }
  if (landmark && landmark.trim()) {
    candidateQueries.push([landmark.trim(), area?.trim(), city, "Gujarat, India"].filter(Boolean).join(", "));
  }
  if (detail && detail.trim()) {
    // Strip flat/house number prefix e.g. "Flat 102, Shivalik..."
    const cleanDetail = detail.replace(/^(flat|house|block|room|plot|shop|b-\d+|a-\d+|\d+)[^,]*,\s*/i, "").trim();
    if (cleanDetail && cleanDetail !== detail) {
      candidateQueries.push([cleanDetail, city, "Gujarat, India"].filter(Boolean).join(", "));
    }
    candidateQueries.push([detail.trim(), city, "Gujarat, India"].filter(Boolean).join(", "));
  }

  if (candidateQueries.length === 0) return null;

  const tomtomKey = process.env.TOMTOM_API_KEY || "pKaNxsGAgRWmxEehTjy8EIxVWGsfSIc3";

  for (const q of candidateQueries) {
    try {
      const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(q)}.json?countrySet=IN&key=${tomtomKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        const first = data.results?.[0];
        if (first?.position?.lat && first?.position?.lon) {
          return {
            lat: Number(first.position.lat),
            lng: Number(first.position.lon),
          };
        }
      }
    } catch (err) {
      console.warn(`TomTom geocode error for query "${q}":`, err);
    }
  }

  // Free Fallback: OpenStreetMap Nominatim
  for (const q of candidateQueries) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
      const nomRes = await fetch(nomUrl, { headers: { "User-Agent": "StreetBites-Server" } });
      if (nomRes.ok) {
        const nomData: any = await nomRes.json();
        if (Array.isArray(nomData) && nomData.length > 0 && nomData[0].lat && nomData[0].lon) {
          return {
            lat: parseFloat(nomData[0].lat),
            lng: parseFloat(nomData[0].lon),
          };
        }
      }
    } catch (err) {
      console.warn(`Nominatim geocode error for query "${q}":`, err);
    }
  }

  return null;
};

/**
 * @desc    Create a new delivery address
 * @route   POST /api/addresses
 */
export const createAddress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = getCustomerId(req);
    const { label, detail, house_no, area, city, pincode, landmark, lat, lng, is_primary = false } = req.body;

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: "Customer ID is required.",
      });
      return;
    }

    // Clean and build full detail without repeating coordinates, Taluka, or duplicate tokens
    let cleanDetail = (detail || "")
      .replace(/Live GPS Location\s*\([^)]*\),?\s*/gi, "")
      .replace(/\b\w+\s+taluka\b,?\s*/gi, "")
      .replace(/\btaluka\b,?\s*/gi, "")
      .replace(/,\s*,/g, ", ")
      .trim();
    if (cleanDetail.startsWith(",")) cleanDetail = cleanDetail.substring(1).trim();

    let fullDetail = "";
    if (cleanDetail && (cleanDetail.includes(area || "") || !area)) {
      fullDetail = cleanDetail;
    } else {
      const cityPin = pincode ? `${city || "Ahmedabad"} - ${pincode}` : city || "Ahmedabad";
      const parts = [house_no, landmark, area, cityPin]
        .map((p) => (p || "").trim())
        .filter(Boolean);
      const uniqueParts: string[] = [];
      for (const p of parts) {
        if (!uniqueParts.includes(p)) {
          uniqueParts.push(p);
        }
      }
      fullDetail = uniqueParts.join(", ");
    }
    if (!fullDetail) {
      fullDetail = [area, city].filter(Boolean).join(", ") || "Ahmedabad, Gujarat";
    }

    if (!label || (!detail && !area)) {
      res.status(400).json({
        success: false,
        message: "Address label, area, or details are required.",
      });
      return;
    }

    let longitude = Number(lng);
    let latitude = Number(lat);

    // If coordinates are missing or fallback defaults, auto-geocode using structured area/city/landmark!
    const isDefaultCoords = (latitude === 23.0225 && longitude === 72.5714) || isNaN(latitude) || isNaN(longitude) || (!lat && !lng);
    if (isDefaultCoords) {
      const geocoded = await geocodeAddressBackend({ area, city, pincode, landmark, detail: fullDetail });
      if (geocoded) {
        latitude = geocoded.lat;
        longitude = geocoded.lng;
      } else {
        latitude = 23.0225;
        longitude = 72.5714;
      }
    }

    // Check if this is the user's first address
    const existingCount = await Address.countDocuments({ customer_id: customerId });
    const shouldBePrimary = is_primary || existingCount === 0;

    if (shouldBePrimary) {
      await Address.updateMany(
        { customer_id: customerId },
        { $set: { is_primary: false } }
      );
    }

    const newAddress = await Address.create({
      customer_id: customerId,
      label: label.trim(),
      detail: fullDetail,
      house_no: house_no ? house_no.trim() : "",
      area: area ? area.trim() : "",
      city: city ? city.trim() : "Ahmedabad",
      pincode: pincode ? pincode.trim() : "",
      landmark: landmark ? landmark.trim() : "",
      is_primary: shouldBePrimary,
      lat_lng: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });

    res.status(201).json({
      success: true,
      message: "Address saved successfully.",
      data: {
        id: String(newAddress._id),
        _id: String(newAddress._id),
        label: newAddress.label,
        detail: newAddress.detail,
        house_no: newAddress.house_no || "",
        area: newAddress.area || "",
        city: newAddress.city || "Ahmedabad",
        pincode: newAddress.pincode || "",
        landmark: newAddress.landmark || "",
        is_primary: newAddress.is_primary,
        coordinates: newAddress.lat_lng.coordinates,
        lng: newAddress.lat_lng.coordinates[0],
        lat: newAddress.lat_lng.coordinates[1],
      },
    });
  } catch (error: any) {
    console.error("Create Address Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to save address.",
    });
  }
};

/**
 * @desc    Update an existing delivery address
 * @route   PUT /api/addresses/:id
 */
export const updateAddress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = getCustomerId(req);
    const { id } = req.params;
    const { label, detail, house_no, area, city, pincode, landmark, lat, lng, is_primary } = req.body;

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: "Customer ID is required.",
      });
      return;
    }

    const address = await Address.findOne({ _id: id, customer_id: customerId });
    if (!address) {
      res.status(404).json({
        success: false,
        message: "Address not found.",
      });
      return;
    }

    if (label) address.label = label.trim();
    if (detail) address.detail = detail.trim();
    if (house_no !== undefined) address.house_no = house_no.trim();
    if (area !== undefined) address.area = area.trim();
    if (city !== undefined) address.city = city.trim();
    if (pincode !== undefined) address.pincode = pincode.trim();
    if (landmark !== undefined) address.landmark = landmark.trim();

    if (lat !== undefined && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      address.lat_lng = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    } else if (address.area || address.detail || address.landmark) {
      const geocoded = await geocodeAddressBackend({
        area: address.area,
        city: address.city || "Ahmedabad",
        pincode: address.pincode,
        landmark: address.landmark,
        detail: address.detail,
      });
      if (geocoded) {
        address.lat_lng = {
          type: "Point",
          coordinates: [geocoded.lng, geocoded.lat],
        };
      }
    }

    if (is_primary === true) {
      await Address.updateMany(
        { customer_id: customerId, _id: { $ne: id } },
        { $set: { is_primary: false } }
      );
      address.is_primary = true;
    }

    await address.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully.",
      data: {
        id: String(address._id),
        _id: String(address._id),
        label: address.label,
        detail: address.detail,
        house_no: address.house_no || "",
        area: address.area || "",
        city: address.city || "Ahmedabad",
        pincode: address.pincode || "",
        landmark: address.landmark || "",
        is_primary: address.is_primary,
        coordinates: address.lat_lng.coordinates,
        lng: address.lat_lng.coordinates[0],
        lat: address.lat_lng.coordinates[1],
      },
    });
  } catch (error: any) {
    console.error("Update Address Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update address.",
    });
  }
};

/**
 * @desc    Delete a delivery address
 * @route   DELETE /api/addresses/:id
 */
export const deleteAddress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customerId = getCustomerId(req);
    const { id } = req.params;

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: "Customer ID is required.",
      });
      return;
    }

    const deleted = await Address.findOneAndDelete({ _id: id, customer_id: customerId });
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Address not found.",
      });
      return;
    }

    // If deleted address was primary, make the next one primary
    if (deleted.is_primary) {
      const nextAddress = await Address.findOne({ customer_id: customerId }).sort({ createdAt: -1 });
      if (nextAddress) {
        nextAddress.is_primary = true;
        await nextAddress.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Address deleted successfully.",
    });
  } catch (error: any) {
    console.error("Delete Address Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to delete address.",
    });
  }
};
