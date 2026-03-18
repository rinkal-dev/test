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
import { Admins } from './Admins';
import { GroupRoomBlocks } from './GroupRoomBlocks';
import { GroupAddons } from './GroupAddons';
import { CancellationPolicies } from './CancellationPolicies';
import { Guests } from './Guests';
import { Bookings } from './Bookings';
import { Notifications } from './Notifications';
import { GroupItinerary } from './GroupItinerary';

@Table({
  modelName: 'wedding_groups',
  timestamps: false,
})
export class WeddingGroups extends Model {
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
  })
  bride_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  groom_name: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  event_start_date: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  event_end_date: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  booking_window_start: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  booking_window_end: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  booking_link: string;

  @ForeignKey(() => Hotels)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  hotel_id: number;

  @Column({
    type: DataType.ENUM('fixed', 'percentage', 'per_person'),
    allowNull: false,
  })
  deposit_type: 'fixed' | 'percentage' | 'per_person';

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  deposit_value: number;

  @Column({
    type: DataType.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 3,
  })
  final_payment_due_days: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  contact_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  contact_email: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: null,
  })
  contact_phone: string;

  // Bride contact info
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    defaultValue: null,
  })
  bride_email: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: null,
  })
  bride_phone: string;

  // Groom contact info
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    defaultValue: null,
  })
  groom_email: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: null,
  })
  groom_phone: string;

  // Hotel contact info
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    defaultValue: null,
  })
  hotel_contact_name: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    defaultValue: null,
  })
  hotel_contact_email: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: null,
  })
  hotel_contact_phone: string;

  // Admin internal notes
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  admin_notes: string;

  // External booking reference (hotel's reference number)
  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    defaultValue: null,
  })
  external_booking_ref: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  whatsapp_enabled: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  invitations_sent_at: Date;

  @Column({
    type: DataType.ENUM('draft', 'active', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft',
  })
  status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  welcome_message: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    defaultValue: null,
  })
  image_url: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'UTC',
  })
  timezone: string; // IANA timezone (e.g., 'America/Cancun', 'Europe/Paris')

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 15.00,
  })
  tax_rate: number; // Tax rate percentage (e.g., 15.00 = 15%)

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  })
  currency_code: string; // ISO 4217 currency code (e.g., 'USD', 'CAD')

  @ForeignKey(() => Admins)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  created_by: number;

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
  static createTimestamp(instance: WeddingGroups) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: WeddingGroups) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => Hotels)
  hotel: Hotels;

  @BelongsTo(() => Admins)
  created_by_admin: Admins;

  @HasMany(() => GroupRoomBlocks)
  group_room_blocks: GroupRoomBlocks[];

  @HasMany(() => GroupAddons)
  group_addons: GroupAddons[];

  @HasMany(() => CancellationPolicies)
  cancellation_policies: CancellationPolicies[];

  @HasMany(() => Guests)
  guests: Guests[];

  @HasMany(() => Bookings)
  bookings: Bookings[];

  @HasMany(() => Notifications)
  notifications: Notifications[];

  @HasMany(() => GroupItinerary)
  itinerary: GroupItinerary[];
}
