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
  HasOne,
} from 'sequelize-typescript';
import { Bookings } from './Bookings';
import { Invoices } from './Invoices';
import { Refunds } from './Refunds';

@Table({
  modelName: 'payments',
  timestamps: false,
})
export class Payments extends Model {
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
    allowNull: true,
    defaultValue: null,
  })
  booking_id: number | null;

  @Column({
    type: DataType.ENUM('deposit', 'final'),
    allowNull: false,
  })
  payment_type: string;

  @Column({
    type: DataType.ENUM('stripe', 'wetravel', 'manual'),
    allowNull: false,
  })
  payment_gateway: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  })
  currency: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  transaction_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  payment_intent_id: string;

  @Column({
    type: DataType.ENUM('pending', 'processing', 'success', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
  })
  status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  failure_reason: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    defaultValue: null,
  })
  metadata: object;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  paid_at: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  invoice_generated: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  invoice_generated_at: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  invoice_generation_attempts: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  invoice_generation_error: string;

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
  static createTimestamp(instance: Payments) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Payments) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => Bookings)
  booking: Bookings;

  @HasOne(() => Invoices)
  invoice: Invoices;

  @HasMany(() => Refunds)
  refunds: Refunds[];
}
