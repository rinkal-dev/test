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
import { v4 as uuidv4 } from 'uuid';
import { WeddingGroups } from './WeddingGroups';
import { GroupRoomBlocks } from './GroupRoomBlocks';
import { Bookings } from './Bookings';

export type HoldStatus = 'active' | 'payment_pending' | 'converted' | 'released' | 'expired';

@Table({
  modelName: 'booking_holds',
  timestamps: false,
})
export class BookingHolds extends Model {
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

  @ForeignKey(() => WeddingGroups)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  wedding_group_id: number;

  @ForeignKey(() => GroupRoomBlocks)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  room_block_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  quantity: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  guest_session_id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    unique: true,
  })
  checkout_token: string;

  @Column({
    type: DataType.ENUM('active', 'payment_pending', 'converted', 'released', 'expired'),
    allowNull: false,
    defaultValue: 'active',
  })
  status: HoldStatus;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  check_in_date: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  check_out_date: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  held_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  expires_at: Date;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  release_reason: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  released_at: Date;

  @ForeignKey(() => Bookings)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
  })
  converted_to_booking_id: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  updated_at: Date;

  // Associations
  @BelongsTo(() => WeddingGroups, 'wedding_group_id')
  wedding_group: WeddingGroups;

  @BelongsTo(() => GroupRoomBlocks, 'room_block_id')
  room_block: GroupRoomBlocks;

  @BelongsTo(() => Bookings, 'converted_to_booking_id')
  booking: Bookings;

  // Hooks
  @BeforeCreate
  static generateUuid(instance: BookingHolds) {
    if (!instance.uuid) {
      instance.uuid = uuidv4();
    }
  }

  @BeforeCreate
  static setTimestamps(instance: BookingHolds) {
    const now = new Date();
    instance.created_at = now;
    instance.updated_at = now;
    if (!instance.held_at) {
      instance.held_at = now;
    }
  }

  @BeforeUpdate
  static updateTimestamp(instance: BookingHolds) {
    instance.updated_at = new Date();
  }

  // Helper method to check if hold is active and not expired
  isValid(): boolean {
    return (
      this.status === 'active' &&
      new Date(this.expires_at) > new Date()
    );
  }

  // Helper method to check if hold can be converted to booking
  canConvert(): boolean {
    return (
      (this.status === 'active' || this.status === 'payment_pending') &&
      new Date(this.expires_at) > new Date()
    );
  }
}
