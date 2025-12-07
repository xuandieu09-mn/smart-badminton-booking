export class CourtResponseDto {
  id: number;
  name: string;
  description?: string;
  pricePerHour: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
