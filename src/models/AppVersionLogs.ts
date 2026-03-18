import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
} from 'sequelize-typescript';

@Table({
  modelName: 'app_version_logs',
  timestamps: false,
})
export class AppVersionLogs extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
    type: DataType.BIGINT.UNSIGNED,
  })
  id: number;

  @Column({
    type: DataType.INTEGER({ length: 10 }).UNSIGNED,
    allowNull: false,
  })
  android_version: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  is_android_force_update: boolean;

  @Column({
    type: DataType.INTEGER({ length: 10 }).UNSIGNED,
    allowNull: false,
  })
  ios_version: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  is_ios_force_update: boolean;

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
  static createTimestamp(instance: AppVersionLogs) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: AppVersionLogs) {
    instance.updated_at = new Date();
  }
}
