export interface Dish {
  id: string;
  name: string;
  price: number;
  description: string;
  image_url?: string;
  category: string;
  is_available?: boolean;
  status?: string;
}

export interface Stall {
  id: string;
  name: string;
  stall_category: string;
  cluster?: string;
  rating: number;
  open_till?: string;
  since?: string;
  description: string;
  image_url?: string;
  is_accepting_orders?: boolean;
  status?: string;
  last_opened_at?: string | Date | null;
  categories: string[];
  dishes: Dish[];
}

export interface Food_Item {
  name: string;
  emoji: string;
  color: string;
  image_url?: string;
  status?: 'APPROVED' | 'PENDING_REVIEW';
}

export const FOOD_ITEMS: Food_Item[] = [];

export const STALLS_DATA: Stall[] = [];
