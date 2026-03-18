import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Hotels } from './Hotels';
import { GroupRoomBlocks } from './GroupRoomBlocks';
import { BookingRooms } from './BookingRooms';

@Table({
  modelName: 'room_types',
  timestamps: false,
})
export class RoomTypes extends Model {
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

  @ForeignKey(() => Hotels)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  hotel_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  slug: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  description: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    defaultValue: null,
  })
  bed_type: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    defaultValue: null,
  })
  room_size: string;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
    defaultValue: 2,
  })
  max_adults: number;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  })
  max_children: number;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
    defaultValue: 3,
  })
  max_occupancy: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  })
  base_price: number;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    defaultValue: null,
  })
  amenities: object;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  image_url: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    defaultValue: null,
  })
  gallery_images: string[];

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  sort_order: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_active: boolean;

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

  @BeforeCreate
  static createTimestamp(instance: RoomTypes) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: RoomTypes) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => Hotels)
  hotel: Hotels;

  @HasMany(() => GroupRoomBlocks)
  group_room_blocks: GroupRoomBlocks[];

  @HasMany(() => BookingRooms)
  booking_rooms: BookingRooms[];
}
