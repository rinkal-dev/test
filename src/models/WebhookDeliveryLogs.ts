import {
  Table,
  Column,
  Model,
  DataType,
  BeforeCreate,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Webhooks } from './Webhooks';

@Table({
  modelName: 'webhook_delivery_logs',
  timestamps: false,
})
export class WebhookDeliveryLogs extends Model {
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

  @ForeignKey(() => Webhooks)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  webhook_id: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  event_type: string;

  @Column({
    type: DataType.JSON,
    allowNull: false,
  })
  payload: object;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: null,
  })
  response_status: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  response_body: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: null,
  })
  duration_ms: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: false,
    defaultValue: 1,
  })
  attempt_number: number;

  @Column({
    type: DataType.ENUM('pending', 'success', 'failed'),
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
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  next_retry_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  created_at: Date;

  @BeforeCreate
  static createTimestamp(instance: WebhookDeliveryLogs) {
    instance.created_at = new Date();
  }

  // Relationships
  @BelongsTo(() => Webhooks)
  webhook: Webhooks;
}
