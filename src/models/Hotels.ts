import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
  HasMany,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { RoomTypes } from './RoomTypes';
import { WeddingGroups } from './WeddingGroups';
import { Amenities } from './Amenities';
import { HotelAmenities } from './HotelAmenities';
import { Admins } from './Admins';

@Table({
  modelName: 'hotels',
  timestamps: false,
})
export class Hotels extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
    type: DataType.BIGINT.UNSIGNED,
  })
  id: number;

  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    unique: true,
  })
  uuid: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  slug: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  description: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  address: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  city: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    defaultValue: null,
  })
  state: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  country: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: null,
  })
  postal_code: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: null,
  })
  phone: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  website: string;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  star_rating: number;

  @Column({
    type: DataType.TIME,
    allowNull: false,
    defaultValue: '14:00:00',
  })
  check_in_time: string;

  @Column({
    type: DataType.TIME,
    allowNull: false,
    defaultValue: '11:00:00',
  })
  check_out_time: string;

  @Column({
    type: DataType.DECIMAL(10, 8),
    allowNull: true,
    defaultValue: null,
  })
  latitude: number;

  @Column({
    type: DataType.DECIMAL(11, 8),
    allowNull: true,
    defaultValue: null,
  })
  longitude: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  image_url: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    defaultValue: null,
  })
  amenities: string[];

  @Column({
    type: DataType.JSON,
    allowNull: true,
    defaultValue: null,
  })
  gallery_images: string[];

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_active: boolean;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'UTC',
  })
  timezone: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  updated_at: Date;

  @ForeignKey(() => Admins)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  created_by: number;

  @BelongsTo(() => Admins, 'created_by')
  creator: Admins;

  @BeforeCreate
  static createTimestamp(instance: Hotels) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Hotels) {
    instance.updated_at = new Date();
  }

  // Relationships
  @HasMany(() => RoomTypes)
  room_types: RoomTypes[];

  @HasMany(() => WeddingGroups)
  wedding_groups: WeddingGroups[];

  // Many-to-many relationship with Amenities
  @BelongsToMany(() => Amenities, () => HotelAmenities)
  amenities_list: Amenities[];
}
