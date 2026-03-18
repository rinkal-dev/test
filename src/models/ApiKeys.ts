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
import { Admins } from './Admins';

@Table({
  modelName: 'api_keys',
  timestamps: false,
  paranoid: true,
  deletedAt: 'deleted_at',
})
export class ApiKeys extends Model {
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
    type: DataType.STRING(255),
    allowNull: false,
  })
  key_hash: string;

  @Column({
    type: DataType.STRING(12),
    allowNull: false,
  })
  key_prefix: string;

  @Column({
    type: DataType.JSON,
    allowNull: false,
  })
  permissions: string[];

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_active: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  last_used_at: Date;

  @Column({
    type: DataType.STRING(45),
    allowNull: true,
    defaultValue: null,
  })
  last_used_ip: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
  })
  usage_count: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: null,
  })
  rate_limit: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  expires_at: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  description: string;

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
  static createTimestamp(instance: ApiKeys) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: ApiKeys) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => Admins)
  created_by_admin: Admins;
}
