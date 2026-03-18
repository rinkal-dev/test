/**
 * ============================================
 * HOTELS SERVICE
 * ============================================
 *
 * Service layer for hotel operations.
 * Uses the abstracted repository pattern.
 *
 * This service is DATABASE-AGNOSTIC:
 * - Uses IHotelRepository interface (never Sequelize directly)
 * - Switching to Supabase requires NO changes here
 * - Just change DATABASE_PROVIDER in .env
 */

import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { getEnvironmentData } from '../../../helpers/general';
import {
  IHotelRepository,
  HOTEL_REPOSITORY,
  HotelEntity,
  HotelQueryParams,
} from '../../../core/repositories';
import { CreateHotelDto } from './dto/CreateHotelDto';
import { UpdateHotelDto } from './dto/UpdateHotelDto';
import { HotelQueryDto } from './dto/HotelQueryDto';
import { SmartImportResponse } from './dto/SmartImportDto';
import {
  ImportRow,
  ParsedHotel,
  ParsedRoomType,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  HotelPreview,
  ImportResult,
  ImportedHotel,
  IMPORT_TEMPLATE_COLUMNS,
  IMPORT_TEMPLATE_SAMPLE,
} from './dto/BulkImportDto';
import * as XLSX from 'xlsx';
import { RoomTypes } from '../../../models/RoomTypes';
import { Hotels } from '../../../models/Hotels';
import { Amenities } from '../../../models/Amenities';
import { HotelAmenities } from '../../../models/HotelAmenities';
import { Admins } from '../../../models/Admins';
import { Roles } from '../../../models/Roles';
import { Op, fn, col, where as seqWhere } from 'sequelize';
import {
  getCategoriesForPrompt,
  isValidAmenityCategory,
  getCategoryIcon,
} from '../../../config/amenity-categories.config';

@Injectable()
export class HotelsService {
  constructor(
    @Inject(HOTEL_REPOSITORY) private hotelRepository: IHotelRepository,
  ) {}

  // Check if slug exists
  async isSlugExists(slug: string, excludeUuid?: string): Promise<boolean> {
    return await this.hotelRepository.isSlugExists(slug, excludeUuid);
  }

  // Create hotel
  async create(createHotelDto: CreateHotelDto, adminId?: number): Promise<HotelEntity> {
    // Extract amenities from DTO
    const { amenities, ...hotelData } = createHotelDto;

    // Create hotel (without amenities initially)
    const hotel = await this.hotelRepository.create({
      uuid: uuidv4(),
      ...hotelData,
      amenities: null, // Will be set after processing
      created_by: adminId, // Track who created the hotel
    });

    // Process amenities: dedupe, match/create in amenities table, link to hotel
    if (amenities?.length) {
      const processedAmenities = await this.processAndLinkAmenities(
        hotel.id,
        amenities,
      );
      // Update hotel with deduplicated amenity names (for JSON column backup)
      if (processedAmenities.length > 0) {
        await this.hotelRepository.update(hotel.uuid, {
          amenities: processedAmenities,
        });
        hotel.amenities = processedAmenities;
      }
    }

    return hotel;
  }

  // Get all hotels with pagination and filters
  async findAll(query: HotelQueryDto, filterAdminId?: number | null) {
    // If filtering is needed, get full access admin IDs for shared data
    let fullAccessAdminIds: number[] = [];
    if (filterAdminId !== null && filterAdminId !== undefined) {
      const [admins] = await Hotels.sequelize.query(`
        SELECT DISTINCT a.id
        FROM admins a
        JOIN model_has_roles mhr ON a.id = mhr.model_id AND mhr.model_type = 'Admin'
        JOIN roles r ON mhr.role_id = r.id
        WHERE r.name IN ('Developer', 'Super Admin')
      `) as [any[], unknown];
      fullAccessAdminIds = admins.map((a: any) => Number(a.id));
    }

    const hotelQuery: HotelQueryParams = {
      page: query.page,
      limit: query.limit,
      search: query.search,
      country: query.country,
      city: query.city,
      star_rating: query.star_rating,
      is_active: query.is_active,
      sort_by: query.sort_by,
      sort_order: query.sort_order as 'ASC' | 'DESC',
      filterAdminId,
      fullAccessAdminIds,
    };

    return await this.hotelRepository.findAllWithFilters(hotelQuery);
  }

  // Get all active hotels (for dropdowns)
  // - Super Admin/Developer: See ALL active hotels
  // - Other roles: See hotels created by Super Admin/Developer + their own hotels
  // Includes room_types for each hotel (needed for Group Wizard)
  async findAllActive(hasFullAccess: boolean, adminId?: number): Promise<any[]> {
    // Super Admin/Developer sees all active hotels
    if (hasFullAccess) {
      const hotels = await Hotels.findAll({
        where: { is_active: true },
        attributes: ['uuid', 'name', 'slug', 'city', 'country', 'star_rating', 'image_url'],
        include: [
          {
            model: RoomTypes,
            as: 'room_types',
            attributes: ['uuid', 'name', 'description', 'base_price', 'max_adults', 'max_children', 'max_occupancy', 'bed_type', 'room_size', 'image_url'],
            where: { is_active: true },
            required: false,
          },
        ],
        order: [['name', 'ASC']],
      });
      return hotels.map(h => h.toJSON());
    }

    // For other roles: First get hotels they can access
    const [hotels] = await Hotels.sequelize.query(`
      SELECT h.id, h.uuid, h.name, h.slug, h.city, h.country, h.star_rating, h.image_url
      FROM hotels h
      WHERE h.is_active = true
      AND (
        h.created_by IS NULL
        OR h.created_by IN (
          SELECT DISTINCT a.id
          FROM admins a
          JOIN model_has_roles mhr ON a.id = mhr.model_id AND mhr.model_type = 'Admin'
          JOIN roles r ON mhr.role_id = r.id
          WHERE r.name IN ('Developer', 'Super Admin')
        )
        ${adminId ? `OR h.created_by = ${adminId}` : ''}
      )
      ORDER BY h.name ASC
    `) as [any[], unknown];

    if (hotels.length === 0) {
      return [];
    }

    // Fetch room types for all these hotels
    const hotelIds = hotels.map((h: any) => h.id);
    const [roomTypes] = await Hotels.sequelize.query(`
      SELECT uuid, hotel_id, name, description, base_price, max_adults, max_children, max_occupancy, bed_type, room_size, image_url
      FROM room_types
      WHERE hotel_id IN (${hotelIds.join(',')})
      AND is_active = true
      ORDER BY sort_order ASC, name ASC
    `) as [any[], unknown];

    // Group room types by hotel_id
    const roomTypesByHotelId: Record<number, any[]> = {};
    for (const rt of roomTypes as any[]) {
      if (!roomTypesByHotelId[rt.hotel_id]) {
        roomTypesByHotelId[rt.hotel_id] = [];
      }
      roomTypesByHotelId[rt.hotel_id].push({
        uuid: rt.uuid,
        name: rt.name,
        description: rt.description,
        base_price: rt.base_price,
        max_adults: rt.max_adults,
        max_children: rt.max_children,
        max_occupancy: rt.max_occupancy,
        bed_type: rt.bed_type,
        room_size: rt.room_size,
        image_url: rt.image_url,
      });
    }

    // Attach room_types to each hotel
    return hotels.map((h: any) => ({
      uuid: h.uuid,
      name: h.name,
      slug: h.slug,
      city: h.city,
      country: h.country,
      star_rating: h.star_rating,
      image_url: h.image_url,
      room_types: roomTypesByHotelId[h.id] || [],
    }));
  }

  // Get hotel by UUID
  async findByUuid(uuid: string): Promise<HotelEntity | null> {
    return await this.hotelRepository.findByUuidWithRoomTypes(uuid);
  }

  // Get hotel by slug
  async findBySlug(slug: string): Promise<HotelEntity | null> {
    return await this.hotelRepository.findBySlugWithRoomTypes(slug);
  }

  // Check if hotel exists
  async isExist(uuid: string): Promise<HotelEntity | null> {
    return await this.hotelRepository.findByUuid(uuid, {
      attributes: ['id', 'uuid', 'slug'],
      raw: true,
    });
  }

  // Update hotel
  async update(uuid: string, updateHotelDto: UpdateHotelDto): Promise<[number]> {
    // Extract amenities from DTO
    const { amenities, ...hotelData } = updateHotelDto;

    // Update hotel data (excluding amenities for now)
    const result = await this.hotelRepository.update(uuid, hotelData);

    // If amenities are provided, process and link them
    if (amenities !== undefined) {
      // Get hotel ID
      const hotel = await this.hotelRepository.findByUuid(uuid, {
        attributes: ['id'],
        raw: true,
      });

      if (hotel) {
        if (amenities && amenities.length > 0) {
          const processedAmenities = await this.processAndLinkAmenities(
            hotel.id,
            amenities,
          );
          // Update hotel with deduplicated amenity names
          await this.hotelRepository.update(uuid, {
            amenities: processedAmenities,
          });
        } else {
          // Empty amenities array - clear all links
          await HotelAmenities.destroy({
            where: { hotel_id: hotel.id },
          });
          await this.hotelRepository.update(uuid, {
            amenities: null,
          });
        }
      }
    }

    return result;
  }

  // Delete hotel
  async delete(uuid: string): Promise<number> {
    return await this.hotelRepository.delete(uuid);
  }

  // Change hotel status
  async changeStatus(uuid: string, is_active: boolean): Promise<[number]> {
    return await this.hotelRepository.changeStatus(uuid, is_active);
  }

  // Search hotels (public)
  async search(searchQuery: string, limit: number = 10) {
    return await this.hotelRepository.search(searchQuery, limit);
  }

  // Smart Import - Fetch hotel data from website using AI (with fallback)
  async smartImport(url: string): Promise<{ data: SmartImportResponse; isEstimated: boolean } | null> {
    const apiKey = getEnvironmentData('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('Gemini API Key is not configured');
    }

    try {
      // Step 1: Try to fetch the website HTML
      const websiteHtml = await this.fetchWebsiteContent(url);

      if (websiteHtml) {
        // SUCCESS: We have real website content
        console.log('Successfully fetched website content, extracting real data...');

        // Step 2: Extract relevant text content
        const cleanedContent = this.extractTextContent(websiteHtml, url);

        // Step 3: Send to Gemini for extraction
        const hotelData = await this.extractHotelDataWithGemini(cleanedContent, url, apiKey, false);

        return { data: hotelData, isEstimated: false };
      } else {
        // FALLBACK: Website blocked/failed, use AI estimation
        console.log('Could not fetch website, falling back to AI estimation...');

        const hotelData = await this.extractHotelDataWithGemini(null, url, apiKey, true);

        return { data: hotelData, isEstimated: true };
      }
    } catch (error) {
      console.error('Smart Import Error:', error);
      throw error;
    }
  }

  // Fetch website content
  private async fetchWebsiteContent(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        timeout: 30000, // 30 second timeout
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        validateStatus: (status) => status < 500, // Accept redirects and client errors
      });

      if (response.status >= 400) {
        console.error(`HTTP Error: ${response.status}`);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Fetch Error:', error.message || error);
      return null;
    }
  }

  // Extract and clean text content from HTML
  private extractTextContent(html: string, url: string): string {
    // Remove script and style tags
    let cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

    // Extract text from remaining HTML
    cleaned = cleaned
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Limit content to avoid token limits (roughly 15000 chars ~ 4000 tokens)
    const maxLength = 15000;
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength) + '...';
    }

    return `URL: ${url}\n\nContent:\n${cleaned}`;
  }

  // Extract hotel data using Gemini AI
  private async extractHotelDataWithGemini(
    content: string | null,
    url: string,
    apiKey: string,
    isEstimated: boolean,
  ): Promise<SmartImportResponse> {
    // Get category descriptions for AI prompt
    const categoryDescriptions = getCategoriesForPrompt();

    // Different prompts for real extraction vs estimation
    const prompt = isEstimated
      ? `
You are a hotel industry expert. Based on the following hotel website URL, provide your best estimation of the hotel details.

Website URL: ${url}

Since we cannot access the website directly, please use your knowledge about this hotel (if known) or make reasonable estimates based on:
- The hotel brand/chain (from URL)
- The location (from URL)
- Typical properties of this type

Provide ESTIMATED data in valid JSON format ONLY (no markdown, no code blocks):

1. Hotel name (extract from URL or estimate)
2. Full address (city, country based on URL)
3. City name
4. Country name
5. Star rating (number 1-5, estimate based on brand)
6. Hotel description (2-3 sentences based on typical properties)
7. List of typical amenities for this hotel class (max 10), each with name and category
8. Timezone (IANA format like "America/Cancun", "Europe/Paris" based on hotel location)
9. Check-in time (typical check-in time in 24h format like "15:00", default "15:00" if unknown)
10. Check-out time (typical check-out time in 24h format like "11:00", default "11:00" if unknown)
11. Typical room categories for this hotel type:
   - name: Room type name
   - description: Brief description
   - bedType: Typical bed configuration
   - capacity: Typical max occupancy (number)
   - pricePerNight: Estimated average rate in USD (number only)
   - amenities: Typical room amenities (max 5), each with name and category

AMENITY CATEGORIES (use one of these for each amenity):
${categoryDescriptions}

JSON structure:
{
  "name": "string",
  "address": "string",
  "city": "string",
  "country": "string",
  "stars": number,
  "description": "string",
  "amenities": [{"name": "string", "category": "string"}],
  "timezone": "string (IANA timezone)",
  "checkInTime": "string (HH:MM format)",
  "checkOutTime": "string (HH:MM format)",
  "rooms": [{
    "name": "string",
    "description": "string",
    "bedType": "string",
    "capacity": number,
    "pricePerNight": number,
    "amenities": [{"name": "string", "category": "string"}]
  }]
}`
      : `
You are a hotel data extraction expert. Analyze the following website content from a hotel website and extract accurate hotel information.

Website URL: ${url}

Website Content:
${content}

Extract and return the following information in valid JSON format ONLY (no markdown, no code blocks):

1. Hotel name (exact name from the website)
2. Full address (as shown on website)
3. City name
4. Country name
5. Star rating (number 1-5, use 5 if luxury/not specified)
6. Hotel description (2-3 sentences summarizing the property)
7. List of amenities (from website, max 10), each with name and category
8. Timezone (IANA format like "America/Cancun", "Europe/Paris" based on hotel location)
9. Check-in time (from website in 24h format like "15:00", default "15:00" if not found)
10. Check-out time (from website in 24h format like "11:00", default "11:00" if not found)
11. Room categories with details:
   - name: Room type name
   - description: Brief description
   - bedType: Bed configuration
   - capacity: Max occupancy (number)
   - pricePerNight: Price if found, otherwise estimate based on hotel class (number only, USD)
   - amenities: Room-specific amenities (max 5), each with name and category

AMENITY CATEGORIES (use one of these for each amenity):
${categoryDescriptions}

IMPORTANT:
- Extract REAL data from the content, don't make up information
- If information is not found, use reasonable defaults based on hotel type
- Prices should be numbers only (no currency symbols)
- Return ONLY valid JSON, no explanations
- Each amenity must have a "name" and "category" field

JSON structure:
{
  "name": "string",
  "address": "string",
  "city": "string",
  "country": "string",
  "stars": number,
  "description": "string",
  "amenities": [{"name": "string", "category": "string"}],
  "timezone": "string (IANA timezone)",
  "checkInTime": "string (HH:MM format)",
  "checkOutTime": "string (HH:MM format)",
  "rooms": [{
    "name": "string",
    "description": "string",
    "bedType": "string",
    "capacity": number,
    "pricePerNight": number,
    "amenities": [{"name": "string", "category": "string"}]
  }]
}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error:', errorText);
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('No response from AI');
      }

      // Parse and validate JSON
      const cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const hotelData = JSON.parse(cleanedText) as SmartImportResponse;

      // Validate required fields
      if (!hotelData.name || !hotelData.address) {
        throw new Error('Could not extract hotel name or address');
      }

      return hotelData;
    } catch (error) {
      console.error('Gemini Extraction Error:', error);
      throw error;
    }
  }

  // =============================================================================
  // BULK IMPORT - TWO STEP PROCESS (Validate → Confirm)
  // =============================================================================

  // Generate slug from name
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 255);
  }

  // Make slug unique by appending number if exists
  private async makeSlugUnique(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await this.isSlugExists(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  // Make room type slug unique within hotel
  private async makeRoomSlugUnique(baseSlug: string, hotelId: number): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await RoomTypes.findOne({ where: { slug, hotel_id: hotelId } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  // Normalize hotel name for comparison (trim, lowercase)
  private normalizeHotelName(name: string): string {
    return String(name || '').trim().toLowerCase();
  }

  // Parse Excel/CSV file buffer
  parseImportFile(buffer: Buffer): ImportRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    return XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: '' });
  }

  // Parse comma-separated string to array
  private parseAmenities(amenities: string | undefined): string[] {
    if (!amenities || String(amenities).trim() === '') return [];
    return String(amenities).split(',').map(a => a.trim()).filter(a => a);
  }

  /**
   * Process and link amenities to a hotel
   *
   * This method:
   * 1. Deduplicates amenity names (case-insensitive)
   * 2. Matches against existing amenities in the database
   * 3. Creates new amenities for unmatched ones (with AI-suggested category)
   * 4. Links all amenities to the hotel via hotel_amenities junction table
   * 5. Returns the final deduplicated list of amenity names
   *
   * Supports two input formats:
   * - string[] (backward compatible for bulk import)
   * - { name: string, category: string }[] (from Smart Import with AI categories)
   *
   * @param hotelId - The hotel ID to link amenities to
   * @param amenityInput - Array of amenity strings or objects with name/category
   * @returns Deduplicated array of amenity names
   */
  private async processAndLinkAmenities(
    hotelId: number,
    amenityInput: (string | { name: string; category?: string })[] | null | undefined,
  ): Promise<string[]> {
    if (!amenityInput || amenityInput.length === 0) {
      return [];
    }

    // Step 1: Normalize input and deduplicate (case-insensitive)
    // Map: lowercase name -> { name, category }
    const seen = new Map<string, { name: string; category: string }>();

    for (const item of amenityInput) {
      let name: string;
      let category: string = 'general';

      if (typeof item === 'string') {
        // Old format: just a string
        name = item.trim();
      } else {
        // New format: { name, category }
        name = (item.name || '').trim();
        if (item.category && isValidAmenityCategory(item.category)) {
          category = item.category;
        }
      }

      if (name) {
        const lower = name.toLowerCase();
        if (!seen.has(lower)) {
          seen.set(lower, { name, category });
        }
      }
    }

    const uniqueAmenities = Array.from(seen.values());

    if (uniqueAmenities.length === 0) {
      return [];
    }

    // Step 2: Find existing amenities (case-insensitive match)
    const existingAmenities = await Amenities.findAll({
      where: seqWhere(
        fn('LOWER', col('name')),
        { [Op.in]: uniqueAmenities.map(a => a.name.toLowerCase()) }
      ),
    });

    const existingMap = new Map<string, Amenities>();
    for (const amenity of existingAmenities) {
      existingMap.set(amenity.name.toLowerCase(), amenity);
    }

    // Step 3: Create new amenities for unmatched ones (with AI-suggested category & icon)
    const amenityIdsToLink: number[] = [];
    const finalNames: string[] = [];

    for (const { name, category } of uniqueAmenities) {
      const lower = name.toLowerCase();
      let amenity = existingMap.get(lower);

      if (!amenity) {
        // Create new amenity with AI-suggested category and corresponding icon
        const icon = getCategoryIcon(category);
        amenity = await Amenities.create({
          uuid: uuidv4(),
          name: name,
          icon: icon,
          category: category,
          is_active: true,
          sort_order: 0,
        });
        console.log(`Created new amenity: ${name} (category: ${category}, icon: ${icon})`);
      }

      amenityIdsToLink.push(amenity.id);
      finalNames.push(amenity.name); // Use the name from DB (proper casing)
    }

    // Step 4: Link amenities to hotel (bulk create, ignore duplicates)
    if (amenityIdsToLink.length > 0) {
      // First, remove existing links for this hotel to avoid duplicates
      await HotelAmenities.destroy({
        where: { hotel_id: hotelId },
      });

      // Create new links
      const links = amenityIdsToLink.map(amenityId => ({
        hotel_id: hotelId,
        amenity_id: amenityId,
      }));

      await HotelAmenities.bulkCreate(links);
      console.log(`Linked ${links.length} amenities to hotel ${hotelId}`);
    }

    return finalNames;
  }

  // =============================================================================
  // STEP 1: VALIDATE - Parse, validate, check duplicates, return preview
  // =============================================================================

  async validateImport(buffer: Buffer): Promise<ValidationResult> {
    const rows = this.parseImportFile(buffer);
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const parsedHotels: ParsedHotel[] = [];

    let currentHotel: ParsedHotel | null = null;
    const hotelNamesInFile: Set<string> = new Set();

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 for header row and 0-index

      const hotelName = String(row.hotel_name || '').trim();
      const roomName = String(row.room_name || '').trim();

      // Check if this row starts a new hotel or continues previous
      if (hotelName) {
        const normalizedName = this.normalizeHotelName(hotelName);

        // Check if same as current hotel (repeated row)
        if (currentHotel && this.normalizeHotelName(currentHotel.name) === normalizedName) {
          // Same hotel, just add room
        } else {
          // New hotel - validate hotel fields
          const hotelErrors = this.validateHotelFields(row, rowNumber);
          errors.push(...hotelErrors);

          if (hotelErrors.length === 0) {
            // Check for duplicate in file
            if (hotelNamesInFile.has(normalizedName)) {
              warnings.push({
                type: 'duplicate_in_file',
                hotelName,
                message: `Hotel "${hotelName}" appears multiple times in file. Rooms will be merged.`,
              });
              // Find existing parsed hotel and use it
              currentHotel = parsedHotels.find(
                h => this.normalizeHotelName(h.name) === normalizedName
              ) || null;
            } else {
              hotelNamesInFile.add(normalizedName);

              // Create new parsed hotel
              currentHotel = {
                name: hotelName,
                address: String(row.address || '').trim(),
                city: String(row.city || '').trim(),
                country: String(row.country || '').trim(),
                star_rating: row.star_rating ? Number(row.star_rating) : undefined,
                check_in_time: row.check_in_time ? String(row.check_in_time).trim() : undefined,
                check_out_time: row.check_out_time ? String(row.check_out_time).trim() : undefined,
                timezone: row.timezone ? String(row.timezone).trim() : undefined,
                description: row.hotel_description ? String(row.hotel_description).trim() : undefined,
                amenities: this.parseAmenities(row.hotel_amenities),
                roomTypes: [],
              };
              parsedHotels.push(currentHotel);
            }
          }
        }
      } else {
        // Empty hotel_name - use previous hotel
        if (!currentHotel) {
          errors.push({
            row: rowNumber,
            field: 'hotel_name',
            message: 'First row must have a hotel name',
          });
          continue;
        }
      }

      // Validate and add room type
      if (roomName && currentHotel) {
        const roomErrors = this.validateRoomFields(row, rowNumber);
        errors.push(...roomErrors);

        if (roomErrors.length === 0) {
          const roomType: ParsedRoomType = {
            name: roomName,
            description: row.room_description ? String(row.room_description).trim() : undefined,
            bed_type: row.bed_type ? String(row.bed_type).trim() : undefined,
            room_size: row.room_size ? String(row.room_size).trim() : undefined,
            max_adults: row.max_adults ? Number(row.max_adults) : undefined,
            max_children: row.max_children ? Number(row.max_children) : undefined,
            max_occupancy: row.max_occupancy ? Number(row.max_occupancy) : undefined,
            base_price: row.base_price ? Number(row.base_price) : undefined,
            amenities: this.parseAmenities(row.room_amenities),
          };
          currentHotel.roomTypes.push(roomType);
        }
      } else if (!roomName) {
        errors.push({
          row: rowNumber,
          field: 'room_name',
          message: 'Room name is required',
        });
      }
    }

    // Check for duplicates in database
    const hotelPreviews: HotelPreview[] = [];
    for (const hotel of parsedHotels) {
      const existingHotel = await Hotels.findOne({
        where: {
          name: { [Op.iLike]: hotel.name }, // Case-insensitive
        },
        attributes: ['uuid', 'name'],
      });

      if (existingHotel) {
        errors.push({
          row: 0, // General error, not row-specific
          field: 'hotel_name',
          message: `Hotel "${hotel.name}" already exists in database. Please remove it from the import file or rename it.`,
        });
      }

      hotelPreviews.push({
        name: hotel.name,
        address: hotel.address,
        city: hotel.city,
        country: hotel.country,
        star_rating: hotel.star_rating,
        roomCount: hotel.roomTypes.length,
        existsInDb: !!existingHotel,
        existingUuid: existingHotel?.uuid,
      });
    }

    // Count totals
    const totalRoomTypes = parsedHotels.reduce((sum, h) => sum + h.roomTypes.length, 0);

    // Create token for confirm step (base64 encoded parsed data)
    const parsedDataToken = Buffer.from(JSON.stringify(parsedHotels)).toString('base64');

    return {
      valid: errors.length === 0,
      canImport: errors.length === 0,
      summary: {
        totalRows: rows.length,
        hotelsFound: parsedHotels.length,
        roomTypesFound: totalRoomTypes,
        errors: errors.length,
        warnings: warnings.length,
      },
      hotels: hotelPreviews,
      errors,
      warnings,
      parsedDataToken: errors.length === 0 ? parsedDataToken : undefined,
    };
  }

  // Validate hotel fields
  private validateHotelFields(row: ImportRow, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!row.hotel_name || String(row.hotel_name).trim() === '') {
      errors.push({ row: rowNumber, field: 'hotel_name', message: 'Hotel name is required' });
    }
    if (!row.address || String(row.address).trim() === '') {
      errors.push({ row: rowNumber, field: 'address', message: 'Address is required' });
    }
    if (!row.city || String(row.city).trim() === '') {
      errors.push({ row: rowNumber, field: 'city', message: 'City is required' });
    }
    if (!row.country || String(row.country).trim() === '') {
      errors.push({ row: rowNumber, field: 'country', message: 'Country is required' });
    }

    // Validate star rating
    if (row.star_rating !== undefined && String(row.star_rating).trim() !== '') {
      const stars = Number(row.star_rating);
      if (isNaN(stars) || stars < 1 || stars > 5) {
        errors.push({ row: rowNumber, field: 'star_rating', message: 'Star rating must be 1-5' });
      }
    }

    return errors;
  }

  // Validate room fields
  private validateRoomFields(row: ImportRow, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate numeric fields
    if (row.max_adults !== undefined && String(row.max_adults).trim() !== '') {
      const val = Number(row.max_adults);
      if (isNaN(val) || val < 1) {
        errors.push({ row: rowNumber, field: 'max_adults', message: 'Max adults must be a positive number' });
      }
    }

    if (row.max_children !== undefined && String(row.max_children).trim() !== '') {
      const val = Number(row.max_children);
      if (isNaN(val) || val < 0) {
        errors.push({ row: rowNumber, field: 'max_children', message: 'Max children must be 0 or greater' });
      }
    }

    if (row.base_price !== undefined && String(row.base_price).trim() !== '') {
      const val = Number(row.base_price);
      if (isNaN(val) || val < 0) {
        errors.push({ row: rowNumber, field: 'base_price', message: 'Base price must be 0 or greater' });
      }
    }

    return errors;
  }

  // =============================================================================
  // STEP 2: CONFIRM - Actually create hotels and room types
  // =============================================================================

  async confirmImport(parsedDataToken: string, adminId?: number): Promise<ImportResult> {
    // Decode parsed data
    const parsedHotels: ParsedHotel[] = JSON.parse(
      Buffer.from(parsedDataToken, 'base64').toString('utf-8')
    );

    const importedHotels: ImportedHotel[] = [];
    let totalRoomTypesCreated = 0;

    for (const hotelData of parsedHotels) {
      // Generate unique slug
      const baseSlug = this.generateSlug(hotelData.name);
      const uniqueSlug = await this.makeSlugUnique(baseSlug);

      // Create hotel (without amenities initially)
      const hotel = await this.hotelRepository.create({
        uuid: uuidv4(),
        name: hotelData.name,
        slug: uniqueSlug,
        address: hotelData.address,
        city: hotelData.city,
        country: hotelData.country,
        star_rating: hotelData.star_rating || null,
        check_in_time: hotelData.check_in_time || '15:00:00',
        check_out_time: hotelData.check_out_time || '11:00:00',
        timezone: hotelData.timezone || 'UTC',
        description: hotelData.description || null,
        amenities: null, // Will be set after processing
        is_active: true,
        created_by: adminId, // Track who imported the hotel
      });

      // Process amenities: dedupe, match/create in amenities table, link to hotel
      if (hotelData.amenities?.length) {
        const processedAmenities = await this.processAndLinkAmenities(
          hotel.id,
          hotelData.amenities,
        );
        // Update hotel with deduplicated amenity names (for JSON column backup)
        if (processedAmenities.length > 0) {
          await this.hotelRepository.update(hotel.uuid, {
            amenities: processedAmenities,
          });
        }
      }

      // Create room types
      let roomTypesCreated = 0;
      for (const roomData of hotelData.roomTypes) {
        const roomSlug = this.generateSlug(roomData.name);
        const uniqueRoomSlug = await this.makeRoomSlugUnique(roomSlug, hotel.id);

        await RoomTypes.create({
          uuid: uuidv4(),
          hotel_id: hotel.id,
          name: roomData.name,
          slug: uniqueRoomSlug,
          description: roomData.description || null,
          bed_type: roomData.bed_type || null,
          room_size: roomData.room_size || null,
          max_adults: roomData.max_adults || 2,
          max_children: roomData.max_children || 1,
          max_occupancy: roomData.max_occupancy || 3,
          base_price: roomData.base_price || null,
          amenities: roomData.amenities?.length ? roomData.amenities : null,
          is_active: true,
        });

        roomTypesCreated++;
        totalRoomTypesCreated++;
      }

      importedHotels.push({
        uuid: hotel.uuid,
        name: hotel.name,
        slug: hotel.slug,
        roomTypesCreated,
      });
    }

    return {
      success: true,
      hotelsCreated: importedHotels.length,
      roomTypesCreated: totalRoomTypesCreated,
      importedHotels,
    };
  }

  // =============================================================================
  // GENERATE TEMPLATE
  // =============================================================================

  generateImportTemplate(): Buffer {
    const workbook = XLSX.utils.book_new();

    // Create header row and sample data
    const headers = IMPORT_TEMPLATE_COLUMNS.map(col => col.header);
    const data = [
      headers,
      ...IMPORT_TEMPLATE_SAMPLE.map(sample =>
        IMPORT_TEMPLATE_COLUMNS.map(col => sample[col.key] ?? '')
      ),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = IMPORT_TEMPLATE_COLUMNS.map(col => ({ wch: col.width }));

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hotels & Rooms');

    // Add instructions sheet
    const instructions = [
      ['Hotel & Room Import Template'],
      [''],
      ['=== HOW IT WORKS ==='],
      ['Each row = one room type. Group rooms under hotels.'],
      [''],
      ['=== TWO WAYS TO FORMAT ==='],
      [''],
      ['Option 1: Repeat hotel info on each row'],
      ['  hotel_name  | city   | room_name'],
      ['  Grand Hotel | Miami  | Deluxe Room'],
      ['  Grand Hotel | Miami  | Suite'],
      [''],
      ['Option 2: Leave hotel cells empty for additional rooms'],
      ['  hotel_name  | city   | room_name'],
      ['  Grand Hotel | Miami  | Deluxe Room'],
      ['              |        | Suite        <- uses Grand Hotel'],
      [''],
      ['=== REQUIRED HOTEL FIELDS ==='],
      ['- hotel_name: Hotel name'],
      ['- address: Full address'],
      ['- city: City name'],
      ['- country: Country name'],
      [''],
      ['=== REQUIRED ROOM FIELDS ==='],
      ['- room_name: Room type name'],
      [''],
      ['=== OPTIONAL FIELDS ==='],
      ['Hotel: star_rating (1-5), check_in_time, check_out_time, timezone, hotel_description, hotel_amenities'],
      ['Room: room_description, bed_type, room_size, max_adults, max_children, max_occupancy, base_price, room_amenities'],
      [''],
      ['=== TIPS ==='],
      ['- Amenities: comma-separated (Pool, Spa, WiFi)'],
      ['- Time format: HH:MM (15:00)'],
      ['- Timezone: America/New_York, Europe/London, etc.'],
      ['- Delete sample rows before importing'],
      [''],
      ['=== IMPORT PROCESS ==='],
      ['1. Upload file → System validates & shows preview'],
      ['2. Review preview → Fix errors if any'],
      ['3. Confirm → Hotels & rooms are created'],
    ];

    const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
    instructionSheet['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
