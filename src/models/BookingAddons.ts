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
import { GroupAddons } from './GroupAddons';

@Table({
  modelName: 'booking_addons',
  timestamps: false,
})
export class BookingAddons extends Model {
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

  @ForeignKey(() => GroupAddons)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  group_addon_id: number;

  @Column({
    type: DataType.ENUM(
      'extra_adult',
      'extra_child',
      'extra_bed',
      'breakfast',
      'airport_transfer',
      'late_checkout',
      'early_checkin',
      'other',
    ),
    allowNull: false,
  })
  addon_type: string;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
  })
  quantity: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  price: number;

  @Column({
    type: DataType.ENUM('per_stay', 'per_night', 'per_guest', 'per_guest_per_night'),
    allowNull: false,
    defaultValue: 'per_stay',
  })
  pricing_type: 'per_stay' | 'per_night' | 'per_guest' | 'per_guest_per_night';

  @Column({
    type: DataType.ENUM('all_guests', 'adults_only', 'children_only'),
    allowNull: false,
    defaultValue: 'all_guests',
  })
  applies_to: 'all_guests' | 'adults_only' | 'children_only';

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  subtotal: number;

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
  static createTimestamp(instance: BookingAddons) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: BookingAddons) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => Bookings)
  booking: Bookings;

  @BelongsTo(() => GroupAddons)
  group_addon: GroupAddons;
}
