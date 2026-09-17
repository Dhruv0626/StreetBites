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
  emoji?: string;
  image?: string;
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
