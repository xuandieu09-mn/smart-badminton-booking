export type PriceType = 'NORMAL' | 'GOLDEN' | 'PEAK';

export interface Court {
  id: number;
  name: string;
  description?: string;
  pricePerHour: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourtAvailabilitySlot {
  time: string; // "09:00-10:00"
  available: boolean;
  price: number;
  priceType: PriceType;
}

export interface CourtAvailability {
  date: string; // ISO date string "YYYY-MM-DD"
  slots: CourtAvailabilitySlot[];
}
