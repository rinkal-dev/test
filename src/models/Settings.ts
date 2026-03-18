import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

export const KEYS = {
  APP_VERSIONS: 'app_versions',
};

export const DEVICES = {
  IOS: 'ios',
  ANDROID: 'android',
};
export const ANDROID = 'android';

@Table({
  modelName: 'settings',
  timestamps: false,
})
export class Settings extends Model {
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
    type: DataType.STRING(100),
    allowNull: false,
  })
  key: string;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: false,
  })
  values: string;

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
  static createTimestamp(instance: Settings) {
    instance.uuid = uuidv4();
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Settings) {
    instance.updated_at = new Date();
  }
}
