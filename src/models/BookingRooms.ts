import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Bookings } from './Bookings';
import { RoomTypes } from './RoomTypes';
import { GroupRoomBlocks } from './GroupRoomBlocks';

@Table({
  modelName: 'booking_rooms',
  timestamps: false,
})
export class BookingRooms extends Model {
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

  @ForeignKey(() => Bookings)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  booking_id: number;

  @ForeignKey(() => RoomTypes)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  room_type_id: number;

  @ForeignKey(() => GroupRoomBlocks)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
  })
  room_block_id: number;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
  })
  quantity: number;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
  })
  adults: number;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  })
  children: number;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  })
  teens: number; // Teen 13-17 years

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  price_per_night: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: false,
    defaultValue: 1,
  })
  total_nights: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  subtotal: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  extra_person_charges: number; // Extra adults/children/teens charges

  @Column({
    type: DataType.JSON,
    allowNull: true,
    defaultValue: null,
  })
  price_breakdown: object; // Detailed nightly breakdown

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
  static createTimestamp(instance: BookingRooms) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: BookingRooms) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => Bookings)
  booking: Bookings;

  @BelongsTo(() => RoomTypes)
  room_type: RoomTypes;

  @BelongsTo(() => GroupRoomBlocks)
  room_block: GroupRoomBlocks;
}
