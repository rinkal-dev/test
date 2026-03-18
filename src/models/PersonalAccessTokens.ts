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
import { Users } from './Users';

@Table({
  modelName: 'personal_access_tokens',
  timestamps: false,
})
export class PersonalAccessTokens extends Model {
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
  tokenable_type: string;

  @ForeignKey(() => Users)
  @Column({
    allowNull: false,
    type: DataType.BIGINT.UNSIGNED,
  })
  tokenable_id: number;

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  access_token: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  access_token_expired_at: Date;

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  refresh_token: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  refresh_token_expired_at: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  device_name: string;

  @Column({
    type: DataType.TINYINT({ length: 1 }).UNSIGNED,
    comment: '1: ios, 2: android, 3:web',
    allowNull: false,
  })
  device_type: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  device_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  ip: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  fcm_key: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  abilities: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  last_used_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  expires_at: Date;

  @Column({
    type: DataType.DATE,
    defaultValue: null,
    allowNull: true,
  })
  created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  updated_at: Date;

  @BeforeCreate
  static createTimestamp(instance: PersonalAccessTokens) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: PersonalAccessTokens) {
    instance.updated_at = new Date();
  }

  @BelongsTo(() => Users)
  user: Users;
}
