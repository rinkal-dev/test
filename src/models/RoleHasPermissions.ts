import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  HasMany,
} from 'sequelize-typescript';
import { Roles, Permissions } from './index';

@Table({
  modelName: 'role_has_permissions',
  timestamps: false,
})
export class RoleHasPermissions extends Model {
  @ForeignKey(() => Permissions)
  @Column({
    primaryKey: true,
    type: DataType.BIGINT.UNSIGNED,
  })
  permission_id: number;

  @ForeignKey(() => Roles)
  @Column({
    primaryKey: true,
    type: DataType.BIGINT.UNSIGNED,
  })
  role_id: number;

  // @BelongsTo(() => Permissions)
  // permission: Permissions;

  // @BelongsTo(() => Roles)
  // role: Roles;
}
