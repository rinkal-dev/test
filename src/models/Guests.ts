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
import { Bookings } from './Bookings';
import { Notifications } from './Notifications';
import { GuestFlights } from './GuestFlights';

@Table({
  modelName: 'guests',
  timestamps: false,
})
export class Guests extends Model {
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

  @Column({
    type: DataType.STRING(64),
    allowNull: false,
    unique: true,
  })
  access_token: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  email: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: null,
  })
  phone: string;

  @Column({
    type: DataType.ENUM('family', 'friend', 'colleague', 'other'),
    allowNull: true,
    defaultValue: null,
  })
  relationship: string;

  @Column({
    type: DataType.ENUM('bride', 'groom', 'mutual'),
    allowNull: true,
    defaultValue: null,
  })
  side: string;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  })
  plus_ones_allowed: number;

  @Column({
    type: DataType.ENUM('email', 'whatsapp', 'both'),
    allowNull: false,
    defaultValue: 'email',
  })
  invitation_channel: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  invitation_sent: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  invitation_sent_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  invitation_opened_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  last_reminder_sent_at: Date;

  @Column({
    type: DataType.ENUM('api', 'excel', 'manual'),
    allowNull: false,
    defaultValue: 'manual',
  })
  import_source: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  notes: string;

  @Column({
    type: DataType.ENUM('pending', 'invited', 'booked', 'declined'),
    allowNull: false,
    defaultValue: 'pending',
  })
  status: string;

  // Password fields for optional registration
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    defaultValue: null,
  })
  password: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  password_set_at: Date;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    defaultValue: null,
  })
  password_reset_token: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  password_reset_expires: Date;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    defaultValue: null,
  })
  set_password_token: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  set_password_token_expires: Date;

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
  static createTimestamp(instance: Guests) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Guests) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => WeddingGroups)
  wedding_group: WeddingGroups;

  @HasMany(() => Bookings)
  bookings: Bookings[];

  @HasMany(() => Notifications)
  notifications: Notifications[];

  @HasMany(() => GuestFlights)
  guest_flights: GuestFlights[];
}
