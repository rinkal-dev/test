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
import { Payments } from './Payments';
import { Admins } from './Admins';
import { CancellationPolicies } from './CancellationPolicies';

@Table({
  modelName: 'refunds',
  timestamps: false,
})
export class Refunds extends Model {
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

  @ForeignKey(() => Payments)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  payment_id: number;

  @Column({
    type: DataType.ENUM('stripe', 'wetravel', 'manual'),
    allowNull: false,
  })
  refund_gateway: string;

  @Column({
    type: DataType.ENUM('full', 'partial'),
    allowNull: false,
  })
  refund_type: string;

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
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  reason: string;

  @Column({
    type: DataType.ENUM('pending', 'approved', 'denied', 'processing', 'processed', 'failed'),
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

  @ForeignKey(() => Admins)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  processed_by: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  notes: string;

  @ForeignKey(() => CancellationPolicies)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  cancellation_policy_id: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: null,
  })
  policy_refund_percentage: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  })
  original_payment_amount: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  })
  max_refundable_amount: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  processed_at: Date;

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
  static createTimestamp(instance: Refunds) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Refunds) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => Bookings)
  booking: Bookings;

  @BelongsTo(() => Payments)
  payment: Payments;

  @BelongsTo(() => Admins)
  processed_by_admin: Admins;

  @BelongsTo(() => CancellationPolicies)
  cancellation_policy: CancellationPolicies;
}
