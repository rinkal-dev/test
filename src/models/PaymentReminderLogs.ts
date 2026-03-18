import {
  Table,
  Column,
  Model,
  DataType,
  BeforeCreate,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Bookings } from './Bookings';

@Table({
  modelName: 'payment_reminder_logs',
  timestamps: false,
})
export class PaymentReminderLogs extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
    type: DataType.INTEGER,
  })
  id: number;

  @ForeignKey(() => Bookings)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  booking_id: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    comment: 'Type: 30_days, 14_days, 7_days, 2_days',
  })
  reminder_type: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'backend',
    comment: 'Source: n8n or backend',
  })
  sent_via: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  sent_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  created_at: Date;

  @BeforeCreate
  static createTimestamp(instance: PaymentReminderLogs) {
    const now = new Date();
    instance.sent_at = instance.sent_at || now;
    instance.created_at = now;
  }

  // Relationships
  @BelongsTo(() => Bookings)
  booking: Bookings;
}
