import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class SmartImportDto {
  @ApiProperty({
    example: 'https://www.marriott.com/hotels/travel/cunsi-the-westin-resort-and-spa-cancun',
    description: 'URL of the hotel website to import data from',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @Matches(/^https?:\/\/.+/, { message: 'Please provide a valid URL starting with http:// or https://' })
  url: string;
}

// Amenity with category from AI
export interface SmartImportAmenity {
  name: string;
  category: string;
}

// Response type for smart import
export interface SmartImportResponse {
  name: string;
  address: string;
  city: string;
  country: string;
  stars: number;
  description: string;
  amenities: SmartImportAmenity[];
  timezone?: string;
  checkInTime?: string;
  checkOutTime?: string;
  rooms: {
    name: string;
    description: string;
    bedType: string;
    capacity: number;
    pricePerNight: number;
    amenities: SmartImportAmenity[];
  }[];
}

// Full response with estimation flag
export interface SmartImportResult {
  data: SmartImportResponse;
  isEstimated: boolean;
}
