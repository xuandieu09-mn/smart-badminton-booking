import { IsNumber, Min } from 'class-validator';

export class DepositDto {
  @IsNumber()
  @Min(10000, { message: 'Minimum deposit is 10,000 VND' })
  amount: number;
}
