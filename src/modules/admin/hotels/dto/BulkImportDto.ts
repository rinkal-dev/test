import { ApiProperty } from '@nestjs/swagger';

// =============================================================================
// IMPORT ROW INTERFACE (Single sheet with hotels + rooms)
// =============================================================================

export interface ImportRow {
  // Hotel fields
  hotel_name?: string;
  address?: string;
  city?: string;
  country?: string;
  star_rating?: number | string;
  check_in_time?: string;
  check_out_time?: string;
  timezone?: string;
  hotel_description?: string;
  hotel_amenities?: string; // comma-separated

  // Room fields
  room_name?: string;
  room_description?: string;
  bed_type?: string;
  room_size?: string;
  max_adults?: number | string;
  max_children?: number | string;
  max_occupancy?: number | string;
  base_price?: number | string;
  room_amenities?: string; // comma-separated
}

// =============================================================================
// PARSED & GROUPED DATA
// =============================================================================

export interface ParsedHotel {
  name: string;
  address: string;
  city: string;
  country: string;
  star_rating?: number;
  check_in_time?: string;
  check_out_time?: string;
  timezone?: string;
  description?: string;
  amenities?: string[];
  roomTypes: ParsedRoomType[];
}

export interface ParsedRoomType {
  name: string;
  description?: string;
  bed_type?: string;
  room_size?: string;
  max_adults?: number;
  max_children?: number;
  max_occupancy?: number;
  base_price?: number;
  amenities?: string[];
}

// =============================================================================
// VALIDATION RESULT (Step 1: Preview)
// =============================================================================

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationWarning {
  type: 'duplicate_in_db' | 'duplicate_in_file';
  hotelName: string;
  message: string;
}

export interface HotelPreview {
  name: string;
  address: string;
  city: string;
  country: string;
  star_rating?: number;
  roomCount: number;
  existsInDb: boolean;
  existingUuid?: string; // If exists in DB
}

export interface ValidationResult {
  valid: boolean;
  canImport: boolean; // true if no errors (warnings are ok)
  summary: {
    totalRows: number;
    hotelsFound: number;
    roomTypesFound: number;
    errors: number;
    warnings: number;
  };
  hotels: HotelPreview[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  // Store parsed data for confirm step (base64 encoded JSON)
  parsedDataToken?: string;
}

// =============================================================================
// IMPORT RESULT (Step 2: Confirm)
// =============================================================================

export interface ImportedHotel {
  uuid: string;
  name: string;
  slug: string;
  roomTypesCreated: number;
}

export interface ImportResult {
  success: boolean;
  hotelsCreated: number;
  roomTypesCreated: number;
  importedHotels: ImportedHotel[];
}

// =============================================================================
// TEMPLATE COLUMNS
// =============================================================================

export const IMPORT_TEMPLATE_COLUMNS = [
  // Hotel columns
  { header: 'hotel_name', key: 'hotel_name', width: 30, required: true, group: 'hotel' },
  { header: 'address', key: 'address', width: 40, required: true, group: 'hotel' },
  { header: 'city', key: 'city', width: 20, required: true, group: 'hotel' },
  { header: 'country', key: 'country', width: 20, required: true, group: 'hotel' },
  { header: 'star_rating', key: 'star_rating', width: 12, required: false, group: 'hotel' },
  { header: 'check_in_time', key: 'check_in_time', width: 15, required: false, group: 'hotel' },
  { header: 'check_out_time', key: 'check_out_time', width: 15, required: false, group: 'hotel' },
  { header: 'timezone', key: 'timezone', width: 25, required: false, group: 'hotel' },
  { header: 'hotel_description', key: 'hotel_description', width: 40, required: false, group: 'hotel' },
  { header: 'hotel_amenities', key: 'hotel_amenities', width: 40, required: false, group: 'hotel' },
  // Room columns
  { header: 'room_name', key: 'room_name', width: 25, required: true, group: 'room' },
  { header: 'room_description', key: 'room_description', width: 40, required: false, group: 'room' },
  { header: 'bed_type', key: 'bed_type', width: 15, required: false, group: 'room' },
  { header: 'room_size', key: 'room_size', width: 12, required: false, group: 'room' },
  { header: 'max_adults', key: 'max_adults', width: 12, required: false, group: 'room' },
  { header: 'max_children', key: 'max_children', width: 12, required: false, group: 'room' },
  { header: 'max_occupancy', key: 'max_occupancy', width: 12, required: false, group: 'room' },
  { header: 'base_price', key: 'base_price', width: 12, required: false, group: 'room' },
  { header: 'room_amenities', key: 'room_amenities', width: 40, required: false, group: 'room' },
];

// =============================================================================
// SAMPLE DATA (Shows both formats - repeated and empty cells)
// =============================================================================

export const IMPORT_TEMPLATE_SAMPLE = [
  // Hotel 1 with 2 room types (repeated hotel name)
  {
    hotel_name: 'Grand Resort & Spa',
    address: '123 Ocean Drive, Cancun',
    city: 'Cancun',
    country: 'Mexico',
    star_rating: 5,
    check_in_time: '15:00',
    check_out_time: '11:00',
    timezone: 'America/Cancun',
    hotel_description: 'Luxurious beachfront resort perfect for weddings',
    hotel_amenities: 'Pool, Spa, Beach Access, Restaurant, Bar',
    room_name: 'Deluxe Ocean View',
    room_description: 'Spacious room with stunning ocean views',
    bed_type: 'King',
    room_size: '45 sqm',
    max_adults: 2,
    max_children: 2,
    max_occupancy: 4,
    base_price: 350,
    room_amenities: 'Mini Bar, Safe, Balcony',
  },
  {
    hotel_name: 'Grand Resort & Spa', // Same hotel, another room
    address: '123 Ocean Drive, Cancun',
    city: 'Cancun',
    country: 'Mexico',
    star_rating: 5,
    check_in_time: '15:00',
    check_out_time: '11:00',
    timezone: 'America/Cancun',
    hotel_description: 'Luxurious beachfront resort perfect for weddings',
    hotel_amenities: 'Pool, Spa, Beach Access, Restaurant, Bar',
    room_name: 'Premium Suite',
    room_description: 'Luxury suite with separate living area',
    bed_type: 'King',
    room_size: '75 sqm',
    max_adults: 2,
    max_children: 2,
    max_occupancy: 4,
    base_price: 550,
    room_amenities: 'Mini Bar, Safe, Balcony, Jacuzzi',
  },
  // Hotel 2 with 2 room types (using empty cells format)
  {
    hotel_name: 'Seaside Inn',
    address: '456 Beach Road, Miami Beach',
    city: 'Miami',
    country: 'USA',
    star_rating: 4,
    check_in_time: '14:00',
    check_out_time: '10:00',
    timezone: 'America/New_York',
    hotel_description: 'Charming boutique hotel with ocean views',
    hotel_amenities: 'Pool, Restaurant, Free WiFi',
    room_name: 'Standard Room',
    room_description: 'Comfortable room with essential amenities',
    bed_type: 'Queen',
    room_size: '30 sqm',
    max_adults: 2,
    max_children: 1,
    max_occupancy: 3,
    base_price: 180,
    room_amenities: 'TV, WiFi, Air Conditioning',
  },
  {
    hotel_name: '', // Empty = use previous hotel
    address: '',
    city: '',
    country: '',
    star_rating: '',
    check_in_time: '',
    check_out_time: '',
    timezone: '',
    hotel_description: '',
    hotel_amenities: '',
    room_name: 'Family Suite',
    room_description: 'Perfect for families with connecting rooms',
    bed_type: 'Two Queens',
    room_size: '55 sqm',
    max_adults: 4,
    max_children: 2,
    max_occupancy: 6,
    base_price: 280,
    room_amenities: 'TV, WiFi, Kitchenette',
  },
];
