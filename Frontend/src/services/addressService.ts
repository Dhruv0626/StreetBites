import { apiRequest } from "./api.ts";
import type { AddressItem } from "../types.ts";

export interface CreateAddressPayload {
  label: "Home" | "Office" | "Other" | string;
  detail: string;
  house_no?: string;
  area?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  is_primary?: boolean;
}

export interface UpdateAddressPayload {
  label?: "Home" | "Office" | "Other" | string;
  detail?: string;
  house_no?: string;
  area?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  is_primary?: boolean;
}

// In-Memory Cache for customer addresses
let cachedAddresses: AddressItem[] | null = null;
let lastAddressFetchTime = 0;
const addressListeners = new Set<(data: AddressItem[]) => void>();

function notifyAddressListeners(data: AddressItem[]) {
  addressListeners.forEach((listener) => {
    try {
      listener(data);
    } catch (err) {
      console.warn("Error in address listener:", err);
    }
  });
}

export function subscribeAddresses(listener: (data: AddressItem[]) => void): () => void {
  addressListeners.add(listener);
  if (cachedAddresses) {
    listener(cachedAddresses);
  }
  return () => {
    addressListeners.delete(listener);
  };
}

export function clearAddressCache(): void {
  cachedAddresses = null;
  lastAddressFetchTime = 0;
}

/**
 * Fetch all addresses saved for the current customer with SWR support
 */
export async function getCustomerAddresses(forceRefresh = false): Promise<AddressItem[]> {
  const now = Date.now();

  // Background silent fetch
  const fetchFresh = async () => {
    try {
      const res = await apiRequest<AddressItem[]>("/addresses", {
        method: "GET",
        requiresAuth: false,
      });
      if (res.success && Array.isArray(res.data)) {
        cachedAddresses = res.data;
        lastAddressFetchTime = Date.now();
        notifyAddressListeners(res.data);
        return res.data;
      }
      return [];
    } catch (err) {
      console.error("Failed to fetch customer addresses:", err);
      return cachedAddresses || [];
    }
  };

  if (!forceRefresh && cachedAddresses) {
    // If older than 5s, trigger silent background revalidation
    if (now - lastAddressFetchTime > 5000) {
      fetchFresh();
    }
    return cachedAddresses;
  }

  return fetchFresh();
}

/**
 * Create a new address for the customer
 */
export async function createCustomerAddress(payload: CreateAddressPayload): Promise<AddressItem | null> {
  try {
    const res = await apiRequest<AddressItem>("/addresses", {
      method: "POST",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
    if (res.success && res.data) {
      clearAddressCache();
      return res.data;
    }
    return null;
  } catch (err) {
    console.error("Failed to create customer address:", err);
    return null;
  }
}

/**
 * Update an existing customer address
 */
export async function updateCustomerAddress(
  id: string,
  payload: UpdateAddressPayload
): Promise<AddressItem | null> {
  try {
    const res = await apiRequest<AddressItem>(`/addresses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
    if (res.success && res.data) {
      clearAddressCache();
      return res.data;
    }
    return null;
  } catch (err) {
    console.error("Failed to update customer address:", err);
    return null;
  }
}

/**
 * Delete a customer address
 */
export async function deleteCustomerAddress(id: string): Promise<boolean> {
  try {
    const res = await apiRequest(`/addresses/${id}`, {
      method: "DELETE",
      requiresAuth: false,
    });
    if (res.success) {
      clearAddressCache();
    }
    return Boolean(res.success);
  } catch (err) {
    console.error("Failed to delete customer address:", err);
    return false;
  }
}
