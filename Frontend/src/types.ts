export interface ClusterItem {
  id: string;
  name: string;
  subtext: string;
  distance: string;
  eta: string;
  imageText: string;
  badge?: string | null;
  isLive: boolean;
  stallsOpen: number;
  totalStalls: number;
  categories: string[];
  accentTag?: string;
  image?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  vendorId: string;
  vendorName: string;
  stallName?: string;
  khauGalliId?: string;
  khauGalliName?: string;
  emoji?: string;
  image?: string;
  stallImage?: string;
  label?: string;
}

export interface Vendor {
  id: string;
  name: string;
  profileImageUrl: string;
  stallName: string;
  since: number;
  rating: number;
  isLive: boolean;
}

export interface AddressItem {
  id: string;
  _id?: string;
  label: "Home" | "Office" | "Other" | string;
  detail: string;
  house_no?: string;
  area?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  is_primary: boolean;
  coordinates: [number, number]; // [lng, lat]
  lng?: number;
  lat?: number;
  createdAt?: string;
}

