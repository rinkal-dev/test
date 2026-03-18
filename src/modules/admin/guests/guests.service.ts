import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { CreateGuestDto, UpdateGuestDto, GuestQueryDto } from './dto';
import { GuestInvitationEmailService, GuestInvitationData } from './guest-invitation-email.service';
import {
  IGuestsRepository,
  GUESTS_REPOSITORY,
  GuestEntity,
  FormattedGuest,
  FormattedGuestDetails,
} from '../../../core/repositories/guests.repository.interface';

// Temporary storage for validated import data (simple in-memory cache)
const importValidationCache = new Map<string, { data: any[]; groupUuid: string; expiresAt: number }>();

@Injectable()
export class GuestsService {
  private readonly logger = new Logger(GuestsService.name);

  constructor(
    @Inject(GUESTS_REPOSITORY)
    private readonly guestsRepository: IGuestsRepository,
    private readonly invitationEmailService: GuestInvitationEmailService,
  ) {}

  /**
   * Generate a unique access token for guest
   */
  private generateAccessToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get all guests with pagination and filters
   * @param query - Query parameters
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async findAll(query: GuestQueryDto, filterAdminId?: number | null) {
    const {
      page = 1,
      limit = 25,
    } = query;

    const result = await this.guestsRepository.findAllWithFilters(query, filterAdminId);

    return {
      guests: result.rows.map((g) => this.formatGuest(g)),
      pagination: {
        page,
        limit,
        total: result.count,
        totalPages: Math.ceil(result.count / limit),
      },
    };
  }

  /**
   * Get guests by wedding group UUID
   * @param groupUuid - Wedding group UUID
   * @param query - Query parameters
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async findByWeddingGroup(groupUuid: string, query: GuestQueryDto, filterAdminId?: number | null) {
    const groupData = await this.guestsRepository.getWeddingGroupByUuid(groupUuid);

    if (!groupData) {
      throw new NotFoundException('Wedding group not found');
    }

    // Check ownership if filterAdminId is provided
    if (filterAdminId !== null && filterAdminId !== undefined && groupData.created_by !== filterAdminId) {
      throw new NotFoundException('Wedding group not found or you do not have access');
    }

    return this.findAll({ ...query, wedding_group_uuid: groupUuid }, filterAdminId);
  }

  /**
   * Get a single guest by UUID
   */
  async findOne(uuid: string) {
    const guest = await this.guestsRepository.findByUuidWithDetails(uuid);

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    return this.formatGuestDetails(guest);
  }

  /**
   * Create a new guest
   * @param dto - Create guest DTO
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async create(dto: CreateGuestDto, filterAdminId?: number | null) {
    // Find the wedding group
    const groupData = await this.guestsRepository.getWeddingGroupByUuid(dto.wedding_group_uuid);

    if (!groupData) {
      throw new NotFoundException('Wedding group not found');
    }

    // Check ownership if filterAdminId is provided
    if (filterAdminId !== null && filterAdminId !== undefined && groupData.created_by !== filterAdminId) {
      throw new NotFoundException('Wedding group not found or you do not have access');
    }

    const groupId = groupData.id;

    // Check if email already exists in this wedding group
    const existingGuest = await this.guestsRepository.findByEmailInGroup(dto.email, groupId);

    if (existingGuest) {
      throw new ConflictException('A guest with this email already exists in this wedding group');
    }

    const guest = await this.guestsRepository.create({
      uuid: uuidv4(),
      wedding_group_id: groupId,
      access_token: this.generateAccessToken(),
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone || null,
      relationship: dto.relationship || null,
      side: dto.side || null,
      plus_ones_allowed: dto.plus_ones_allowed ?? 0,
      invitation_channel: dto.invitation_channel || 'email',
      notes: dto.notes || null,
      import_source: 'manual',
      status: 'pending',
    });

    // Reload with relations for response
    const createdGuest = await this.guestsRepository.findByUuidWithDetails(guest.uuid);
    return this.formatGuest(createdGuest || guest);
  }

  /**
   * Update a guest
   */
  async update(uuid: string, dto: UpdateGuestDto) {
    const guest = await this.guestsRepository.findByUuidWithWeddingGroup(uuid);

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    // Check if email is being changed
    const isEmailChanged = dto.email && dto.email.toLowerCase() !== guest.email.toLowerCase();

    if (isEmailChanged) {
      const emailExists = await this.guestsRepository.isEmailExistsInGroup(
        dto.email,
        guest.wedding_group_id,
        guest.id,
      );

      if (emailExists) {
        throw new ConflictException('A guest with this email already exists in this wedding group');
      }
    }

    // Build update data
    const updateData: any = {
      name: dto.name ?? guest.name,
      email: dto.email ? dto.email.toLowerCase() : guest.email,
      phone: dto.phone !== undefined ? dto.phone : guest.phone,
      relationship: dto.relationship !== undefined ? dto.relationship : guest.relationship,
      side: dto.side !== undefined ? dto.side : guest.side,
      plus_ones_allowed: dto.plus_ones_allowed ?? guest.plus_ones_allowed,
      invitation_channel: dto.invitation_channel ?? guest.invitation_channel,
      notes: dto.notes !== undefined ? dto.notes : guest.notes,
      status: dto.status ?? guest.status,
    };

    // Reset invitation status if email is changed (so invitation can be sent to new email)
    if (isEmailChanged && guest.invitation_sent) {
      updateData.invitation_sent = false;
      updateData.invitation_sent_at = null;
      updateData.status = 'pending'; // Reset status since new email hasn't received invitation
    }

    await this.guestsRepository.update(uuid, updateData);

    // Reload with relations for response
    const updatedGuest = await this.guestsRepository.findByUuidWithDetails(uuid);
    return this.formatGuest(updatedGuest || guest);
  }

  /**
   * Delete a guest
   */
  async remove(uuid: string) {
    const guest = await this.guestsRepository.findByUuidWithDetails(uuid);

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    // Check if guest has bookings
    if (guest.bookings && guest.bookings.length > 0) {
      throw new ConflictException(
        'Cannot delete guest with existing bookings. Mark as declined instead.',
      );
    }

    await this.guestsRepository.delete(uuid);

    return { message: 'Guest deleted successfully' };
  }

  /**
   * Send invitation to a single guest
   */
  async sendInvitation(uuid: string, customMessage?: string) {
    const guest = await this.guestsRepository.findByUuidForInvitation(uuid);

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    if (!guest.wedding_group) {
      throw new BadRequestException('Guest is not associated with a wedding group');
    }

    if (guest.wedding_group.status !== 'active') {
      throw new BadRequestException('Cannot send invitations for inactive wedding groups');
    }

    // Check if guest has password set
    const hasPassword = !!(guest as any).password;
    let setPasswordToken: string | null = null;

    // Generate set password token if guest doesn't have a password
    if (!hasPassword) {
      setPasswordToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date();
      tokenExpires.setDate(tokenExpires.getDate() + 7); // Token valid for 7 days

      // Save the token to the guest
      await this.guestsRepository.update(uuid, {
        set_password_token: setPasswordToken,
        set_password_token_expires: tokenExpires,
      });
    }

    // Prepare invitation data
    const invitationData: GuestInvitationData = {
      guestUuid: guest.uuid,
      guestName: guest.name,
      guestEmail: guest.email,
      guestAccessToken: guest.access_token,
      plusOnesAllowed: guest.plus_ones_allowed,
      hasPassword,
      setPasswordToken,
      weddingName: guest.wedding_group.name,
      brideName: guest.wedding_group.bride_name || 'Bride',
      groomName: guest.wedding_group.groom_name || 'Groom',
      eventStartDate: guest.wedding_group.event_start_date?.toISOString?.() || guest.wedding_group.event_start_date as any,
      eventEndDate: guest.wedding_group.event_end_date?.toISOString?.() || guest.wedding_group.event_end_date as any,
      welcomeMessage: guest.wedding_group.welcome_message,
      bookingLink: guest.wedding_group.booking_link,
      hotelName: guest.wedding_group.hotel?.name || 'Hotel',
      hotelCity: guest.wedding_group.hotel?.city || '',
      hotelCountry: guest.wedding_group.hotel?.country || '',
      customMessage,
    };

    // Send the invitation email
    const emailResult = await this.invitationEmailService.sendInvitation(invitationData);

    if (!emailResult.success) {
      this.logger.error(`Failed to send invitation to ${guest.email}: ${emailResult.message}`);
      throw new BadRequestException(`Failed to send invitation: ${emailResult.message}`);
    }

    // Mark as invited only after successful email send
    await this.guestsRepository.update(uuid, {
      invitation_sent: true,
      invitation_sent_at: new Date(),
      status: guest.status === 'pending' ? 'invited' : guest.status,
    });

    // Reload for response
    const updatedGuest = await this.guestsRepository.findByUuidWithDetails(uuid);

    return {
      message: 'Invitation sent successfully',
      guest: this.formatGuest(updatedGuest || guest),
    };
  }

  /**
   * Send bulk invitations
   * Processes emails sequentially with small delay to avoid rate limiting
   */
  async sendBulkInvitations(guestUuids: string[], customMessage?: string) {
    const results = {
      success: [] as string[],
      failed: [] as { uuid: string; error: string }[],
    };

    this.logger.log(`Starting bulk invitation for ${guestUuids.length} guests`);

    for (let i = 0; i < guestUuids.length; i++) {
      const uuid = guestUuids[i];
      try {
        await this.sendInvitation(uuid, customMessage);
        results.success.push(uuid);
      } catch (error) {
        results.failed.push({
          uuid,
          error: error.message || 'Failed to send invitation',
        });
      }

      // Small delay between emails to avoid rate limiting (100ms)
      if (i < guestUuids.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this.logger.log(`Bulk invitation complete: ${results.success.length} sent, ${results.failed.length} failed`);

    return {
      message: `Sent ${results.success.length} invitations, ${results.failed.length} failed`,
      results,
    };
  }

  /**
   * Get guest statistics for a wedding group
   */
  /**
   * Get guest statistics for a wedding group
   * @param groupUuid - Wedding group UUID
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async getStats(groupUuid: string, filterAdminId?: number | null) {
    const groupData = await this.guestsRepository.getWeddingGroupByUuid(groupUuid);

    if (!groupData) {
      throw new NotFoundException('Wedding group not found');
    }

    // Check ownership if filterAdminId is provided
    if (filterAdminId !== null && filterAdminId !== undefined && groupData.created_by !== filterAdminId) {
      throw new NotFoundException('Wedding group not found or you do not have access');
    }

    return this.guestsRepository.getStatsByWeddingGroup(groupData.id);
  }

  /**
   * Regenerate access token for a guest
   */
  async regenerateAccessToken(uuid: string) {
    const guest = await this.guestsRepository.findByUuid(uuid);

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    const newToken = this.generateAccessToken();
    await this.guestsRepository.update(uuid, { access_token: newToken });

    return {
      message: 'Access token regenerated successfully',
      access_token: newToken,
    };
  }

  /**
   * Format guest for API response
   */
  private formatGuest(guest: GuestEntity): FormattedGuest {
    return {
      uuid: guest.uuid,
      name: guest.name,
      email: guest.email,
      phone: guest.phone || null,
      relationship: guest.relationship || null,
      side: guest.side || null,
      plus_ones_allowed: guest.plus_ones_allowed,
      invitation_channel: guest.invitation_channel,
      invitation_sent: guest.invitation_sent,
      invitation_sent_at: guest.invitation_sent_at || null,
      status: guest.status,
      notes: guest.notes || null,
      import_source: guest.import_source,
      wedding_group: guest.wedding_group
        ? {
            uuid: guest.wedding_group.uuid,
            name: guest.wedding_group.name,
            booking_link: guest.wedding_group.booking_link || null,
          }
        : null,
      has_bookings: guest.bookings && guest.bookings.length > 0,
      created_at: guest.created_at || null,
      updated_at: guest.updated_at || null,
    };
  }

  /**
   * Format guest with full details
   */
  private formatGuestDetails(guest: GuestEntity): FormattedGuestDetails {
    return {
      uuid: guest.uuid,
      name: guest.name,
      email: guest.email,
      phone: guest.phone || null,
      relationship: guest.relationship || null,
      side: guest.side || null,
      plus_ones_allowed: guest.plus_ones_allowed,
      invitation_channel: guest.invitation_channel,
      invitation_sent: guest.invitation_sent,
      invitation_sent_at: guest.invitation_sent_at || null,
      invitation_opened_at: guest.invitation_opened_at || null,
      last_reminder_sent_at: guest.last_reminder_sent_at || null,
      status: guest.status,
      notes: guest.notes || null,
      import_source: guest.import_source,
      access_token: guest.access_token,
      wedding_group: guest.wedding_group
        ? {
            uuid: guest.wedding_group.uuid,
            name: guest.wedding_group.name,
            booking_link: guest.wedding_group.booking_link || null,
            event_start_date: guest.wedding_group.event_start_date || null,
            event_end_date: guest.wedding_group.event_end_date || null,
            status: guest.wedding_group.status || null,
            created_by: guest.wedding_group.created_by || null,
          }
        : null,
      bookings:
        guest.bookings?.map((b) => ({
          uuid: b.uuid,
          booking_reference: b.booking_reference,
          check_in_date: b.check_in_date || null,
          check_out_date: b.check_out_date || null,
          total_rooms: b.total_rooms || null,
          total_adults: b.total_adults || null,
          total_children: b.total_children || null,
          total_amount: b.total_amount ? Number(b.total_amount) : null,
          currency: b.currency || null,
          status: b.status || null,
          created_at: b.created_at || null,
        })) || [],
      has_bookings: guest.bookings && guest.bookings.length > 0,
      created_at: guest.created_at || null,
      updated_at: guest.updated_at || null,
    };
  }

  /**
   * Generate CSV template for guest import (empty template with headers)
   * Phone numbers are wrapped in quotes to prevent Excel scientific notation
   */
  generateCsvTemplate(): string {
    const headers = ['name', 'email', 'phone'];
    const exampleRows = [
      ['John Doe', 'john@example.com', '"+15551234567"'],
      ['Jane Smith', 'jane@example.com', '"+447911123456"'],
      ['Raj Patel', 'raj@example.com', '"+919876543210"'],
    ];

    return [
      headers.join(','),
      ...exampleRows.map(row => row.join(',')),
    ].join('\n');
  }

  /**
   * Export guests to CSV - optionally filtered by wedding group
   * @param groupUuid - Optional wedding group UUID. If not provided, exports all guests.
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async exportGuestsToCsv(groupUuid?: string, filterAdminId?: number | null): Promise<string> {
    // If groupUuid provided, verify it exists and check ownership
    if (groupUuid) {
      const groupData = await this.guestsRepository.getWeddingGroupByUuid(groupUuid);
      if (!groupData) {
        throw new NotFoundException('Wedding group not found');
      }
      // Check ownership if filterAdminId is provided
      if (filterAdminId !== null && filterAdminId !== undefined && groupData.created_by !== filterAdminId) {
        throw new NotFoundException('Wedding group not found or you do not have access');
      }
    }

    // Fetch guests - with or without group filter
    const result = await this.guestsRepository.findAllWithFilters({
      wedding_group_uuid: groupUuid || undefined,
      limit: 10000, // High limit to get all guests
    }, filterAdminId);

    // Include wedding_group column when exporting all
    const includeGroupColumn = !groupUuid;
    const headers = includeGroupColumn
      ? ['wedding_group', 'name', 'email', 'phone', 'status', 'invitation_sent', 'invitation_sent_at']
      : ['name', 'email', 'phone', 'status', 'invitation_sent', 'invitation_sent_at'];

    const rows = result.rows.map((guest) => {
      const baseFields = [
        this.escapeCsvField(guest.name || ''),
        this.escapeCsvField(guest.email || ''),
        this.formatPhoneForCsv(guest.phone || ''),
        guest.status || '',
        guest.invitation_sent ? 'Yes' : 'No',
        guest.invitation_sent_at ? new Date(guest.invitation_sent_at).toISOString() : '',
      ];

      if (includeGroupColumn) {
        const groupName = guest.wedding_group?.name || 'Unknown';
        return [this.escapeCsvField(groupName), ...baseFields].join(',');
      }

      return baseFields.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Escape CSV field to handle commas and quotes
   */
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Format phone number for CSV to prevent Excel scientific notation
   * Uses ="value" format which Excel treats as text
   */
  private formatPhoneForCsv(phone: string): string {
    if (!phone) return '';
    // Use Excel formula format to force text treatment
    return `="${phone.replace(/"/g, '""')}"`;
  }

  /**
   * Import guests from CSV content
   * @param weddingGroupUuid - Wedding group UUID
   * @param csvContent - CSV content
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async importFromCsv(
    weddingGroupUuid: string,
    csvContent: string,
    filterAdminId?: number | null,
  ): Promise<{ message: string; imported: number; skipped: number; errors: string[] }> {
    // Verify wedding group exists and check ownership
    const groupData = await this.guestsRepository.getWeddingGroupByUuid(weddingGroupUuid);
    if (!groupData) {
      throw new NotFoundException('Wedding group not found');
    }
    // Check ownership if filterAdminId is provided
    if (filterAdminId !== null && filterAdminId !== undefined && groupData.created_by !== filterAdminId) {
      throw new NotFoundException('Wedding group not found or you do not have access');
    }
    const groupId = groupData.id;

    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new BadRequestException('CSV file must contain header row and at least one data row');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    const phoneIdx = headers.indexOf('phone');

    const missingColumns: string[] = [];
    if (nameIdx === -1) missingColumns.push('"name"');
    if (emailIdx === -1) missingColumns.push('"email"');
    if (missingColumns.length > 0) {
      throw new BadRequestException(`CSV must contain ${missingColumns.join(' and ')} column${missingColumns.length > 1 ? 's' : ''}`);
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles basic cases)
      const values = this.parseCsvLine(line);

      const name = values[nameIdx]?.trim();
      const email = values[emailIdx]?.trim()?.toLowerCase();
      const phone = phoneIdx >= 0 ? values[phoneIdx]?.trim() : undefined;

      // Validate required fields
      if (!name || !email) {
        errors.push(`Row ${i + 1}: Missing name or email`);
        skipped++;
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Row ${i + 1}: Invalid email format "${email}"`);
        skipped++;
        continue;
      }

      // Check for duplicate email in group
      const existingGuest = await this.guestsRepository.findByEmailInGroup(email, groupId);
      if (existingGuest) {
        errors.push(`Row ${i + 1}: Email "${email}" already exists in this group`);
        skipped++;
        continue;
      }

      try {
        await this.guestsRepository.create({
          uuid: uuidv4(),
          wedding_group_id: groupId,
          name,
          email,
          phone: phone || null,
          access_token: crypto.randomBytes(32).toString('hex'),
          status: 'pending',
          invitation_channel: 'email',
          import_source: 'excel',
        });
        imported++;
      } catch (error) {
        errors.push(`Row ${i + 1}: Failed to import - ${error.message}`);
        skipped++;
      }
    }

    return {
      message: `Import complete: ${imported} guests imported, ${skipped} skipped`,
      imported,
      skipped,
      errors: errors.slice(0, 10), // Limit errors to first 10
    };
  }

  /**
   * Parse a CSV line handling quoted values
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  }

  /**
   * Validate CSV import and return preview data
   * @param weddingGroupUuid - Wedding group UUID
   * @param csvContent - CSV content
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async validateCsvImport(
    weddingGroupUuid: string,
    csvContent: string,
    filterAdminId?: number | null,
  ): Promise<{
    canImport: boolean;
    token: string;
    summary: { totalRows: number; validGuests: number; errors: number; duplicates: number };
    guests: { row: number; name: string; email: string; phone: string; status: 'valid' | 'error' | 'duplicate'; error?: string }[];
    errors: { row: number; field: string; message: string }[];
  }> {
    // Verify wedding group exists and check ownership
    const groupData = await this.guestsRepository.getWeddingGroupByUuid(weddingGroupUuid);
    if (!groupData) {
      throw new NotFoundException('Wedding group not found');
    }
    // Check ownership if filterAdminId is provided
    if (filterAdminId !== null && filterAdminId !== undefined && groupData.created_by !== filterAdminId) {
      throw new NotFoundException('Wedding group not found or you do not have access');
    }
    const groupId = groupData.id;

    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new BadRequestException('CSV file must contain header row and at least one data row');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    const phoneIdx = headers.indexOf('phone');

    const missingColumns: string[] = [];
    if (nameIdx === -1) missingColumns.push('"name"');
    if (emailIdx === -1) missingColumns.push('"email"');
    if (missingColumns.length > 0) {
      throw new BadRequestException(`CSV must contain ${missingColumns.join(' and ')} column${missingColumns.length > 1 ? 's' : ''}`);
    }

    const guests: { row: number; name: string; email: string; phone: string; status: 'valid' | 'error' | 'duplicate'; error?: string }[] = [];
    const errors: { row: number; field: string; message: string }[] = [];
    const validGuestsData: { name: string; email: string; phone: string }[] = [];
    const seenEmails = new Set<string>();

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCsvLine(line);
      const name = values[nameIdx]?.trim();
      const email = values[emailIdx]?.trim()?.toLowerCase();
      const phone = phoneIdx >= 0 ? values[phoneIdx]?.trim() : '';

      // Skip completely empty rows (no name and no email)
      if (!name && !email) {
        continue;
      }

      const guestEntry: typeof guests[0] = {
        row: i + 1,
        name: name || '',
        email: email || '',
        phone: phone || '',
        status: 'valid',
      };

      // Validate required fields
      if (!name) {
        guestEntry.status = 'error';
        guestEntry.error = 'Missing name';
        errors.push({ row: i + 1, field: 'name', message: 'Name is required' });
        guests.push(guestEntry);
        continue;
      }

      // Validate name max length (100 chars - matching form validation)
      if (name.length > 100) {
        guestEntry.status = 'error';
        guestEntry.error = 'Name too long (max 100)';
        errors.push({ row: i + 1, field: 'name', message: `Name must not exceed 100 characters (got ${name.length})` });
        guests.push(guestEntry);
        continue;
      }

      if (!email) {
        guestEntry.status = 'error';
        guestEntry.error = 'Missing email';
        errors.push({ row: i + 1, field: 'email', message: 'Email is required' });
        guests.push(guestEntry);
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        guestEntry.status = 'error';
        guestEntry.error = 'Invalid email format';
        errors.push({ row: i + 1, field: 'email', message: `Invalid email format: ${email}` });
        guests.push(guestEntry);
        continue;
      }

      // Validate phone format (7-15 digits - matching form validation)
      if (phone) {
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 7 || phoneDigits.length > 15) {
          guestEntry.status = 'error';
          guestEntry.error = 'Invalid phone (7-15 digits)';
          errors.push({ row: i + 1, field: 'phone', message: `Phone must have 7-15 digits (got ${phoneDigits.length})` });
          guests.push(guestEntry);
          continue;
        }
      }

      // Check for duplicate in CSV
      if (seenEmails.has(email)) {
        guestEntry.status = 'duplicate';
        guestEntry.error = 'Duplicate email in file';
        errors.push({ row: i + 1, field: 'email', message: `Duplicate email in file: ${email}` });
        guests.push(guestEntry);
        continue;
      }
      seenEmails.add(email);

      // Check for existing guest in database
      const existingGuest = await this.guestsRepository.findByEmailInGroup(email, groupId);
      if (existingGuest) {
        guestEntry.status = 'duplicate';
        guestEntry.error = 'Already exists in group';
        errors.push({ row: i + 1, field: 'email', message: `Email already exists in this group: ${email}` });
        guests.push(guestEntry);
        continue;
      }

      guests.push(guestEntry);
      validGuestsData.push({ name, email, phone });
    }

    // Generate token and store validated data
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes
    importValidationCache.set(token, { data: validGuestsData, groupUuid: weddingGroupUuid, expiresAt });

    // Clean up expired entries
    for (const [key, value] of importValidationCache.entries()) {
      if (value.expiresAt < Date.now()) {
        importValidationCache.delete(key);
      }
    }

    return {
      canImport: validGuestsData.length > 0 && errors.length === 0,
      token,
      summary: {
        totalRows: lines.length - 1,
        validGuests: validGuestsData.length,
        errors: errors.length,
        duplicates: guests.filter(g => g.status === 'duplicate').length,
      },
      guests,
      errors,
    };
  }

  /**
   * Confirm import using validation token
   * @param weddingGroupUuid - Wedding group UUID
   * @param token - Validation token
   * @param sendInvitations - Whether to send invitations after import
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async confirmImport(
    weddingGroupUuid: string,
    token: string,
    sendInvitations: boolean = false,
    filterAdminId?: number | null,
  ): Promise<{
    message: string;
    imported: number;
    invitationsSent: number;
    guests: { name: string; email: string; invitationSent?: boolean }[];
  }> {
    const cached = importValidationCache.get(token);

    if (!cached) {
      throw new BadRequestException('Invalid or expired validation token. Please validate the file again.');
    }

    if (cached.expiresAt < Date.now()) {
      importValidationCache.delete(token);
      throw new BadRequestException('Validation token has expired. Please validate the file again.');
    }

    if (cached.groupUuid !== weddingGroupUuid) {
      throw new BadRequestException('Token does not match the wedding group.');
    }

    // Verify wedding group exists and check ownership
    const groupData = await this.guestsRepository.getWeddingGroupByUuid(weddingGroupUuid);
    if (!groupData) {
      throw new NotFoundException('Wedding group not found');
    }
    // Check ownership if filterAdminId is provided
    if (filterAdminId !== null && filterAdminId !== undefined && groupData.created_by !== filterAdminId) {
      throw new NotFoundException('Wedding group not found or you do not have access');
    }
    const groupId = groupData.id;

    const importedGuests: { name: string; email: string; uuid?: string; invitationSent?: boolean }[] = [];

    // First, create all guests
    for (const guest of cached.data) {
      try {
        const guestUuid = uuidv4();
        await this.guestsRepository.create({
          uuid: guestUuid,
          wedding_group_id: groupId,
          name: guest.name,
          email: guest.email,
          phone: guest.phone || null,
          access_token: crypto.randomBytes(32).toString('hex'),
          status: 'pending',
          invitation_channel: 'email',
          import_source: 'excel',
        });
        importedGuests.push({ name: guest.name, email: guest.email, uuid: guestUuid });
      } catch (error) {
        this.logger.error(`Failed to import guest ${guest.email}: ${error.message}`);
      }
    }

    // Send invitations if requested
    let invitationsSent = 0;
    if (sendInvitations && importedGuests.length > 0) {
      for (const guest of importedGuests) {
        try {
          if (guest.uuid) {
            await this.sendInvitation(guest.uuid);
            guest.invitationSent = true;
            invitationsSent++;
          }
        } catch (error) {
          this.logger.error(`Failed to send invitation to ${guest.email}: ${error.message}`);
          guest.invitationSent = false;
        }
      }
    }

    // Clean up token
    importValidationCache.delete(token);

    // Remove uuid from response (internal use only)
    const responseGuests = importedGuests.map(({ name, email, invitationSent }) => ({
      name,
      email,
      ...(sendInvitations ? { invitationSent } : {}),
    }));

    const message = sendInvitations
      ? `Successfully imported ${importedGuests.length} guests and sent ${invitationsSent} invitations`
      : `Successfully imported ${importedGuests.length} guests`;

    return {
      message,
      imported: importedGuests.length,
      invitationsSent,
      guests: responseGuests,
    };
  }

  /**
   * Get wedding group details for broadcast
   * @param groupUuid - Wedding group UUID
   * @param filterAdminId - Optional admin ID for data-level filtering (null = no filter)
   */
  async getWeddingGroupDetails(groupUuid: string, filterAdminId?: number | null): Promise<{ name: string; uuid: string; created_by?: number | null } | null> {
    // Verify wedding group exists and check ownership
    const groupData = await this.guestsRepository.getWeddingGroupByUuid(groupUuid);
    if (!groupData) {
      return null;
    }
    // Check ownership if filterAdminId is provided
    if (filterAdminId !== null && filterAdminId !== undefined && groupData.created_by !== filterAdminId) {
      return null;
    }

    // Get group name from the repository
    const result = await this.guestsRepository.findAllWithFilters({
      wedding_group_uuid: groupUuid,
      limit: 1,
    }, filterAdminId);

    if (result.rows.length > 0 && result.rows[0].wedding_group) {
      return {
        uuid: groupUuid,
        name: result.rows[0].wedding_group.name,
        created_by: groupData.created_by,
      };
    }

    // Fallback - get from a direct query
    return {
      uuid: groupUuid,
      name: 'Wedding Group',
      created_by: groupData.created_by,
    };
  }

  /**
   * Get guests for broadcast based on audience type
   */
  async getGuestsForBroadcast(
    groupUuid: string,
    audience: 'ALL' | 'BOOKED' | 'UNPAID' | 'INVITED',
  ): Promise<{ uuid: string; name: string; email: string; phone?: string }[]> {
    const result = await this.guestsRepository.findAllWithFilters({
      wedding_group_uuid: groupUuid,
      limit: 10000,
    });

    let filteredGuests = result.rows;

    switch (audience) {
      case 'BOOKED':
        // Guests with confirmed bookings
        filteredGuests = result.rows.filter(g => g.status === 'booked');
        break;
      case 'UNPAID':
        // Guests with pending payments (booked but not fully paid)
        // For now, this filters booked guests - can be refined with payment status
        filteredGuests = result.rows.filter(g => g.status === 'booked');
        break;
      case 'INVITED':
        // Guests who were invited but haven't booked
        filteredGuests = result.rows.filter(g => g.status === 'invited');
        break;
      case 'ALL':
      default:
        // All guests (invited & booked)
        filteredGuests = result.rows.filter(g => g.status === 'invited' || g.status === 'booked');
        break;
    }

    return filteredGuests.map(g => ({
      uuid: g.uuid,
      name: g.name,
      email: g.email,
      phone: g.phone || undefined,
    }));
  }
}
