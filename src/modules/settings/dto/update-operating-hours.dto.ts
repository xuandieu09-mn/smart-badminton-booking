import { IsInt, Min, Max } from 'class-validator';

export class UpdateOperatingHoursDto {
  @IsInt()
  @Min(5, { message: 'Giờ mở cửa không được sớm hơn 5:00' })
  @Max(23, { message: 'Giờ mở cửa không được muộn hơn 23:00' })
  openingHour: number;

  @IsInt()
  @Min(6, { message: 'Giờ đóng cửa không được sớm hơn 6:00' })
  @Max(24, { message: 'Giờ đóng cửa không được muộn hơn 24:00 (0:00 ngày hôm sau)' })
  closingHour: number;
}
