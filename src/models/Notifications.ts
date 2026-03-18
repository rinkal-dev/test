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
import { WeddingGroups } from './WeddingGroups';
import { Guests } from './Guests';
import { Bookings } from './Bookings';

@Table({
  modelName: 'notifications',
  timestamps: false,
})
export class Notifications extends Model {
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
    allowNull: true,
    defaultValue: null,
  })
  wedding_group_id: number;

  @ForeignKey(() => Guests)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  guest_id: number;

  @ForeignKey(() => Bookings)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  booking_id: number;

  @Column({
    type: DataType.ENUM(
      'invitation',
      'deposit_reminder',
      'final_reminder',
      'confirmation',
      'payment_received',
      'booking_cancelled',
      'refund_processed',
    ),
    allowNull: false,
  })
  type: string;

  @Column({
    type: DataType.ENUM('email', 'whatsapp'),
    allowNull: false,
  })
  channel: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  subject: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  content: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  recipient_email: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: null,
  })
  recipient_phone: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  external_id: string;

  @Column({
    type: DataType.ENUM('pending', 'sent', 'delivered', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  })
  status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  error_message: string;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  })
  retry_count: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  sent_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  opened_at: Date;

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
  static createTimestamp(instance: Notifications) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Notifications) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => WeddingGroups)
  wedding_group: WeddingGroups;

  @BelongsTo(() => Guests)
  guest: Guests;

  @BelongsTo(() => Bookings)
  booking: Bookings;
}
