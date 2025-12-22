export class CourtResponseDto {
  id: number;
  name: string;
  description?: string;
  pricePerHour: number;
  peakPricePerHour: number; // Peak price (17:00 - closing)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
