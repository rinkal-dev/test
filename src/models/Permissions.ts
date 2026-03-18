import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
  HasMany,
  BelongsToMany,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { RoleHasPermissions } from './index';
import { Roles } from 'src/models';

@Table({
  modelName: 'permissions',
  timestamps: false,
})
export class Permissions extends Model {
  @ForeignKey(() => RoleHasPermissions)
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
    unique: true,
  })
  name: string;

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
  static createTimestamp(instance: Permissions) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Permissions) {
    instance.updated_at = new Date();
  }

  @BelongsToMany(() => Roles, () => RoleHasPermissions)
  roles: Roles[];

  // @HasMany(() => RoleHasPermissions)
  // permission_details: RoleHasPermissions[];
}
