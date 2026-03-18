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
import { WeddingGroups } from './WeddingGroups';
import { Guests } from './Guests';
import { BookingRooms } from './BookingRooms';
import { BookingAddons } from './BookingAddons';
import { Payments } from './Payments';
import { Invoices } from './Invoices';
import { Refunds } from './Refunds';
import { Notifications } from './Notifications';
import { GuestFlights } from './GuestFlights';

@Table({
  modelName: 'bookings',
  timestamps: false,
})
export class Bookings extends Model {
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
    type: DataType.STRING(50),
    allowNull: false,
    unique: true,
  })
  booking_reference: string;

  @ForeignKey(() => WeddingGroups)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  wedding_group_id: number;

  @ForeignKey(() => Guests)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  guest_id: number;

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
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
  })
  total_rooms: number;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
  })
  total_nights: number;

  @Column({
    type: DataType.INTEGER.UNSIGNED,
    allowNull: false,
  })
  total_adults: number;

  @Column({
    type: DataType.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  })
  total_children: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  total_amount: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  deposit_amount: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  final_amount: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  })
  subtotal: number; // Pre-tax amount (rooms + addons)

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
  })
  tax_rate: number; // Tax rate percentage at time of booking

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  })
  tax_amount: number; // Calculated tax amount

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  })
  currency: string;

  @Column({
    type: DataType.ENUM('pending', 'deposit_paid', 'confirmed', 'completed', 'cancelled', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  })
  status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  special_requests: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  deposit_paid_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  final_paid_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  confirmed_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  cancelled_at: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  cancellation_reason: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    defaultValue: null,
  })
  guest_timezone: string; // IANA timezone where guest made the booking (e.g., 'Asia/Kolkata')

  @Column({
    type: DataType.JSON,
    allowNull: true,
    defaultValue: null,
  })
  internal_notes: Array<{
    id: string;
    author: string;
    author_id: number;
    text: string;
    timestamp: string;
  }>;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  roommate_opt_in: boolean; // Solo traveler connection opt-in

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    defaultValue: null,
  })
  roommate_note: string; // Optional note for roommate matching preferences

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
  static createTimestamp(instance: Bookings) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Bookings) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => WeddingGroups)
  wedding_group: WeddingGroups;

  @BelongsTo(() => Guests)
  guest: Guests;

  @HasMany(() => BookingRooms)
  booking_rooms: BookingRooms[];

  @HasMany(() => BookingAddons)
  booking_addons: BookingAddons[];

  @HasMany(() => Payments)
  payments: Payments[];

  @HasMany(() => Invoices)
  invoices: Invoices[];

  @HasMany(() => Refunds)
  refunds: Refunds[];

  @HasMany(() => Notifications)
  notifications: Notifications[];

  @HasMany(() => GuestFlights)
  guest_flights: GuestFlights[];
}
