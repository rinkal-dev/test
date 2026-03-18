import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { ROOM_TYPES_REPOSITORY, HOTELS_REPOSITORY, BOOKING_ROOMS_REPOSITORY } from 'src/config/constants';
import { RoomTypes } from 'src/models/RoomTypes';
import { Hotels } from 'src/models/Hotels';
import { BookingRooms } from 'src/models/BookingRooms';
import { CreateRoomTypeDto } from './dto/CreateRoomTypeDto';
import { UpdateRoomTypeDto } from './dto/UpdateRoomTypeDto';

@Injectable()
export class RoomTypesService {
  constructor(
    @Inject(ROOM_TYPES_REPOSITORY) private roomTypesModel: typeof RoomTypes,
    @Inject(HOTELS_REPOSITORY) private hotelsModel: typeof Hotels,
    @Inject(BOOKING_ROOMS_REPOSITORY) private bookingRoomsModel: typeof BookingRooms,
  ) {}

  // Generate slug from name
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Get hotel by UUID (returns id for foreign key)
  async getHotelIdByUuid(hotelUuid: string): Promise<number | null> {
    const hotel = await this.hotelsModel.findOne({
      where: { uuid: hotelUuid },
      attributes: ['id'],
      raw: true,
    });
    return hotel?.id || null;
  }

  // Check if hotel exists
  async hotelExists(hotelUuid: string): Promise<boolean> {
    const count = await this.hotelsModel.count({
      where: { uuid: hotelUuid },
    });
    return count > 0;
  }

  // Create room type
  async create(hotelId: number, dto: CreateRoomTypeDto): Promise<RoomTypes> {
    const slug = dto.slug || this.generateSlug(dto.name);

    return await this.roomTypesModel.create({
      uuid: uuidv4(),
      hotel_id: hotelId,
      name: dto.name,
      slug: slug,
      description: dto.description || null,
      bed_type: dto.bed_type || null,
      room_size: dto.room_size || null,
      max_adults: dto.max_adults || 2,
      max_children: dto.max_children || 1,
      max_occupancy: dto.max_occupancy || 3,
      base_price: dto.base_price || null,
      amenities: dto.amenities || null,
      image_url: dto.image_url || null,
      gallery_images: dto.gallery_images || null,
      sort_order: dto.sort_order || 0,
      is_active: dto.is_active !== undefined ? dto.is_active : true,
    });
  }

  // Get all room types for a hotel
  async findAllByHotelId(hotelId: number): Promise<RoomTypes[]> {
    return await this.roomTypesModel.findAll({
      where: { hotel_id: hotelId },
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
    });
  }

  // Get room type by UUID
  async findByUuid(uuid: string): Promise<RoomTypes | null> {
    return await this.roomTypesModel.findOne({
      where: { uuid },
    });
  }

  // Check if room type exists
  async isExist(uuid: string): Promise<{ id: number; hotel_id: number } | null> {
    return await this.roomTypesModel.findOne({
      where: { uuid },
      attributes: ['id', 'hotel_id'],
      raw: true,
    });
  }

  // Update room type
  async update(uuid: string, dto: UpdateRoomTypeDto): Promise<[number]> {
    const updateData: any = { ...dto, updated_at: new Date() };

    // Generate slug if name is updated but slug is not provided
    if (dto.name && !dto.slug) {
      updateData.slug = this.generateSlug(dto.name);
    }

    return await this.roomTypesModel.update(updateData, {
      where: { uuid },
    });
  }

  // Delete room type
  async delete(uuid: string): Promise<number> {
    return await this.roomTypesModel.destroy({
      where: { uuid },
    });
  }

  // Delete all room types for a hotel
  async deleteAllByHotelId(hotelId: number): Promise<number> {
    return await this.roomTypesModel.destroy({
      where: { hotel_id: hotelId },
    });
  }

  // Bulk create room types for a hotel
  async bulkCreate(hotelId: number, roomTypes: CreateRoomTypeDto[]): Promise<RoomTypes[]> {
    const records = roomTypes.map((dto, index) => ({
      uuid: uuidv4(),
      hotel_id: hotelId,
      name: dto.name,
      slug: dto.slug || this.generateSlug(dto.name),
      description: dto.description || null,
      bed_type: dto.bed_type || null,
      room_size: dto.room_size || null,
      max_adults: dto.max_adults || 2,
      max_children: dto.max_children || 1,
      max_occupancy: dto.max_occupancy || 3,
      base_price: dto.base_price || null,
      amenities: dto.amenities || null,
      image_url: dto.image_url || null,
      gallery_images: dto.gallery_images || null,
      sort_order: dto.sort_order ?? index,
      is_active: dto.is_active !== undefined ? dto.is_active : true,
      created_at: new Date(),
    }));

    return await this.roomTypesModel.bulkCreate(records);
  }

  // Check if room type has bookings
  async hasBookings(roomTypeId: number): Promise<boolean> {
    const count = await this.bookingRoomsModel.count({
      where: { room_type_id: roomTypeId },
    });
    return count > 0;
  }

  // Smart sync room types: update existing, handle deletions safely
  async syncRoomTypes(hotelId: number, roomTypes: CreateRoomTypeDto[]): Promise<RoomTypes[]> {
    // Get existing room types for this hotel
    const existingRoomTypes = await this.findAllByHotelId(hotelId);

    const result: RoomTypes[] = [];
    const processedExistingIds: number[] = [];

    // Process each incoming room type
    for (let index = 0; index < roomTypes.length; index++) {
      const dto = roomTypes[index];
      const slug = dto.slug || this.generateSlug(dto.name);

      // Try to find existing room type by slug or name
      const existingRoom = existingRoomTypes.find(
        (r) => r.slug === slug || r.name.toLowerCase() === dto.name.toLowerCase()
      );

      if (existingRoom) {
        // Update existing room type
        await this.roomTypesModel.update(
          {
            name: dto.name,
            slug: slug,
            description: dto.description || null,
            bed_type: dto.bed_type || null,
            room_size: dto.room_size || null,
            max_adults: dto.max_adults || 2,
            max_children: dto.max_children || 1,
            max_occupancy: dto.max_occupancy || 3,
            base_price: dto.base_price || null,
            amenities: dto.amenities || null,
            image_url: dto.image_url || null,
            gallery_images: dto.gallery_images || null,
            sort_order: dto.sort_order ?? index,
            is_active: dto.is_active !== undefined ? dto.is_active : true,
            updated_at: new Date(),
          },
          { where: { id: existingRoom.id } }
        );

        processedExistingIds.push(existingRoom.id);

        // Fetch updated record
        const updated = await this.roomTypesModel.findByPk(existingRoom.id);
        if (updated) result.push(updated);
      } else {
        // Create new room type
        const newRoom = await this.roomTypesModel.create({
          uuid: uuidv4(),
          hotel_id: hotelId,
          name: dto.name,
          slug: slug,
          description: dto.description || null,
          bed_type: dto.bed_type || null,
          room_size: dto.room_size || null,
          max_adults: dto.max_adults || 2,
          max_children: dto.max_children || 1,
          max_occupancy: dto.max_occupancy || 3,
          base_price: dto.base_price || null,
          amenities: dto.amenities || null,
          image_url: dto.image_url || null,
          gallery_images: dto.gallery_images || null,
          sort_order: dto.sort_order ?? index,
          is_active: dto.is_active !== undefined ? dto.is_active : true,
          created_at: new Date(),
        });
        result.push(newRoom);
      }
    }

    // Handle room types that were removed from the list
    for (const existingRoom of existingRoomTypes) {
      if (!processedExistingIds.includes(existingRoom.id)) {
        // Check if this room type has bookings
        const hasBookingsFlag = await this.hasBookings(existingRoom.id);

        if (hasBookingsFlag) {
          // Soft delete: deactivate instead of delete
          await this.roomTypesModel.update(
            { is_active: false, updated_at: new Date() },
            { where: { id: existingRoom.id } }
          );
          console.log(`Room type ${existingRoom.name} deactivated (has existing bookings)`);
        } else {
          // Safe to delete
          await this.roomTypesModel.destroy({ where: { id: existingRoom.id } });
          console.log(`Room type ${existingRoom.name} deleted (no bookings)`);
        }
      }
    }

    return result;
  }
}
