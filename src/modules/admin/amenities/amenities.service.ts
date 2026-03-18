import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { Amenities } from '../../../models/Amenities';
import { HotelAmenities } from '../../../models/HotelAmenities';
import { Admins } from '../../../models/Admins';
import { Roles } from '../../../models/Roles';
import { CreateAmenityDto, UpdateAmenityDto, AmenityQueryDto } from './dto';
import { getAmenityCategoriesList } from '../../../config/amenity-categories.config';

@Injectable()
export class AmenitiesService {
  /**
   * Get all amenities with pagination and filters
   * @param query - Query parameters
   * @param filterAdminId - Admin ID for data-level filtering (null = no filter)
   */
  async findAll(query: AmenityQueryDto, filterAdminId?: number | null) {
    const {
      page = 1,
      limit = 25,
      search,
      category,
      is_active,
      sort_by = 'sort_order',
      sort_order = 'ASC',
    } = query;

    const offset = (page - 1) * limit;
    const where: any = {};
    const andConditions: any[] = [];

    // Data-level filtering: Show shared (Super Admin/Developer) + own + legacy data
    if (filterAdminId !== null && filterAdminId !== undefined) {
      // Get full access admin IDs
      const [admins] = await Amenities.sequelize.query(`
        SELECT DISTINCT a.id
        FROM admins a
        JOIN model_has_roles mhr ON a.id = mhr.model_id AND mhr.model_type = 'Admin'
        JOIN roles r ON mhr.role_id = r.id
        WHERE r.name IN ('Developer', 'Super Admin')
      `) as [any[], unknown];
      const fullAccessAdminIds = admins.map((a: any) => Number(a.id));

      const createdByConditions: any[] = [
        { created_by: null }, // Legacy data without creator
        { created_by: filterAdminId }, // Own data
      ];

      // Add shared data from Super Admin/Developer
      if (fullAccessAdminIds.length > 0) {
        createdByConditions.push({ created_by: { [Op.in]: fullAccessAdminIds } });
      }

      andConditions.push({ [Op.or]: createdByConditions });
    }

    // Search by name
    if (search) {
      andConditions.push({ name: { [Op.iLike]: `%${search}%` } });
    }

    // Filter by category
    if (category) {
      where.category = category;
    }

    // Filter by active status
    if (typeof is_active === 'boolean') {
      where.is_active = is_active;
    }

    // Apply AND conditions if any exist
    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    const { rows: amenities, count: total } = await Amenities.findAndCountAll({
      where,
      order: [[sort_by, sort_order]],
      limit,
      offset,
    });

    return {
      amenities: amenities.map((a) => this.formatAmenity(a)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all active amenities (for dropdowns/selection)
   * - Super Admin/Developer: See ALL active amenities
   * - Other roles: See amenities created by Super Admin/Developer + their own amenities
   */
  async findAllActive(hasFullAccess: boolean, adminId?: number) {
    // Super Admin/Developer sees all active amenities
    if (hasFullAccess) {
      const amenities = await Amenities.findAll({
        where: { is_active: true },
        order: [
          ['category', 'ASC'],
          ['sort_order', 'ASC'],
        ],
      });
      return amenities.map((a) => this.formatAmenity(a));
    }

    // For other roles: Use raw SQL to get amenities they can access
    // This includes: legacy (null), created by Super Admin/Developer, or created by themselves
    const [amenities] = await Amenities.sequelize.query(`
      SELECT a.uuid, a.name, a.icon, a.category, a.description, a.is_active, a.sort_order, a.created_at, a.updated_at
      FROM amenities a
      WHERE a.is_active = true
      AND (
        a.created_by IS NULL
        OR a.created_by IN (
          SELECT DISTINCT adm.id
          FROM admins adm
          JOIN model_has_roles mhr ON adm.id = mhr.model_id AND mhr.model_type = 'Admin'
          JOIN roles r ON mhr.role_id = r.id
          WHERE r.name IN ('Developer', 'Super Admin')
        )
        ${adminId ? `OR a.created_by = ${adminId}` : ''}
      )
      ORDER BY a.category ASC, a.sort_order ASC
    `) as [any[], unknown];

    return amenities;
  }

  /**
   * Get all unique categories (from database)
   */
  async getCategories() {
    const result = await Amenities.findAll({
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']],
    });

    return result.map((r) => r.category);
  }

  /**
   * Get all configured categories (from config file)
   * Returns full category objects with key, label, icon, description
   */
  getConfiguredCategories() {
    return getAmenityCategoriesList();
  }

  /**
   * Get a single amenity by UUID
   */
  async findOne(uuid: string) {
    const amenity = await Amenities.findOne({ where: { uuid } });

    if (!amenity) {
      throw new NotFoundException('Amenity not found');
    }

    // Get hotel count using this amenity
    const hotelCount = await HotelAmenities.count({
      where: { amenity_id: amenity.id },
    });

    return {
      ...this.formatAmenity(amenity),
      created_by: amenity.created_by,
      hotel_count: hotelCount,
    };
  }

  /**
   * Create a new amenity
   * @param dto - Create amenity DTO
   * @param adminId - Admin ID who is creating the amenity
   */
  async create(dto: CreateAmenityDto, adminId?: number) {
    // Check if name already exists
    const existing = await Amenities.findOne({
      where: { name: { [Op.iLike]: dto.name } },
    });

    if (existing) {
      throw new ConflictException('An amenity with this name already exists');
    }

    const amenity = await Amenities.create({
      uuid: uuidv4(),
      name: dto.name,
      icon: dto.icon,
      category: dto.category || 'general',
      description: dto.description || null,
      is_active: dto.is_active ?? true,
      sort_order: dto.sort_order ?? 0,
      created_by: adminId,
    });

    return this.formatAmenity(amenity);
  }

  /**
   * Update an amenity
   */
  async update(uuid: string, dto: UpdateAmenityDto) {
    const amenity = await Amenities.findOne({ where: { uuid } });

    if (!amenity) {
      throw new NotFoundException('Amenity not found');
    }

    // Check if name already exists (if changing name)
    if (dto.name && dto.name !== amenity.name) {
      const existing = await Amenities.findOne({
        where: {
          name: { [Op.iLike]: dto.name },
          id: { [Op.ne]: amenity.id },
        },
      });

      if (existing) {
        throw new ConflictException('An amenity with this name already exists');
      }
    }

    await amenity.update({
      name: dto.name ?? amenity.name,
      icon: dto.icon ?? amenity.icon,
      category: dto.category ?? amenity.category,
      description: dto.description !== undefined ? dto.description : amenity.description,
      is_active: dto.is_active ?? amenity.is_active,
      sort_order: dto.sort_order ?? amenity.sort_order,
    });

    return this.formatAmenity(amenity);
  }

  /**
   * Delete an amenity
   */
  async remove(uuid: string) {
    const amenity = await Amenities.findOne({ where: { uuid } });

    if (!amenity) {
      throw new NotFoundException('Amenity not found');
    }

    // Check if amenity is used by any hotels
    const hotelCount = await HotelAmenities.count({
      where: { amenity_id: amenity.id },
    });

    if (hotelCount > 0) {
      throw new ConflictException(
        `Cannot delete amenity. It is used by ${hotelCount} hotel(s). Deactivate it instead.`
      );
    }

    await amenity.destroy();

    return { message: 'Amenity deleted successfully' };
  }

  /**
   * Format amenity for response
   */
  private formatAmenity(amenity: Amenities) {
    return {
      uuid: amenity.uuid,
      name: amenity.name,
      icon: amenity.icon,
      category: amenity.category,
      description: amenity.description,
      is_active: amenity.is_active,
      sort_order: amenity.sort_order,
      created_at: amenity.created_at,
      updated_at: amenity.updated_at,
    };
  }
}
