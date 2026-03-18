import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
} from 'sequelize-typescript';
import { Admins } from './Admins';

@Table({
  tableName: 'activity_logs',
  timestamps: false,
})
export class ActivityLogs extends Model {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    unique: true,
  })
  uuid: string;

  @ForeignKey(() => Admins)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  admin_id: number | null;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  action: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  entity_type: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  entity_id: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  entity_name: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  description: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata: Record<string, any> | null;

  @Column({
    type: DataType.STRING(45),
    allowNull: true,
  })
  ip_address: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  user_agent: string | null;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  request_path: string | null;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
  })
  request_method: string | null;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  created_at: Date;

  // Associations
  @BelongsTo(() => Admins)
  admin: Admins;
}
