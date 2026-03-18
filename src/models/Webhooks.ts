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
import { Admins } from './Admins';
import { WebhookDeliveryLogs } from './WebhookDeliveryLogs';

@Table({
  modelName: 'webhooks',
  timestamps: false,
  paranoid: true,
  deletedAt: 'deleted_at',
})
export class Webhooks extends Model {
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
    type: DataType.STRING(255),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: false,
  })
  url: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  secret_key: string;

  @Column({
    type: DataType.JSON,
    allowNull: false,
  })
  events: string[];

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_active: boolean;

  @Column({
    type: DataType.SMALLINT,
    allowNull: false,
    defaultValue: 3,
  })
  retry_count: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 5000,
  })
  timeout_ms: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  description: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  last_triggered_at: Date;

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

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  deleted_at: Date;

  @BeforeCreate
  static createTimestamp(instance: Webhooks) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Webhooks) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => Admins)
  created_by_admin: Admins;

  @HasMany(() => WebhookDeliveryLogs)
  delivery_logs: WebhookDeliveryLogs[];
}
