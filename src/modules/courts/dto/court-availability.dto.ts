export class CourtAvailabilityDto {
  date: string; // ISO format: 2025-12-07

  slots: {
    time: string; // "09:00-10:00"
    available: boolean;
    price: number;
    priceType: 'NORMAL' | 'GOLDEN' | 'PEAK';
  }[];
}
