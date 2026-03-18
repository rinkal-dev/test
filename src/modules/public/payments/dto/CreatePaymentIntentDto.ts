import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsEmail, Min } from 'class-validator';

export enum PaymentTypeEnum {
  DEPOSIT = 'deposit',
  FINAL = 'final',
}

export class CreatePaymentIntentDto {
  @IsNotEmpty()
  @IsString()
  booking_uuid: string;

  @IsNotEmpty()
  @IsEnum(PaymentTypeEnum)
  payment_type: PaymentTypeEnum;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number; // Optional - will use booking's deposit/final amount if not provided

  @IsOptional()
  @IsString()
  currency?: string; // Optional - will use booking's currency if not provided

  @IsNotEmpty()
  @IsEmail()
  customer_email: string;

  @IsNotEmpty()
  @IsString()
  customer_name: string;
}
