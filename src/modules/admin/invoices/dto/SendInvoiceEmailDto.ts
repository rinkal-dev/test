import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendInvoiceEmailDto {
  @ApiPropertyOptional({
    description: 'Whether to include PDF as attachment (default: true)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  include_pdf_attachment?: boolean;

  @ApiPropertyOptional({
    description: 'Custom message to include in the email',
    example: 'Thank you for your booking! Please find your invoice attached.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  custom_message?: string;
}
