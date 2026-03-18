import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
  HasMany,
} from 'sequelize-typescript';
import { PersonalAccessTokens } from './PersonalAccessTokens';

@Table({
  modelName: 'users',
  timestamps: false,
})
export class Users extends Model {
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
  name: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  username: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
    unique: true,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    defaultValue: null,
  })
  remember_token: string;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    defaultValue: 'en',
  })
  locale: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '0 = Inactive, 1 = Active',
  })
  is_active: boolean;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    defaultValue: null,
  })
  isd_code: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: null,
  })
  mobile: string;

  @Column({
    type: DataType.INTEGER({ length: 10 }).UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  email_otp: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  email_otp_expired_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  email_verified_at: Date;

  @Column({
    type: DataType.INTEGER({ length: 10 }).UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  mobile_otp: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  mobile_otp_expired_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  mobile_verified_at: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  profile_photo: string;

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
  static createTimestamp(instance: Users) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Users) {
    instance.updated_at = new Date();
  }

  @HasMany(() => PersonalAccessTokens)
  login_details: PersonalAccessTokens;
}
