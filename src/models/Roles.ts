import {
  Table,
  Column,
  Model,
  DataType,
  BelongsToMany,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { RoleHasPermissions } from './RoleHasPermissions';
import { Permissions } from './Permissions';
import { Admins } from './Admins';
import { ModelHasRoles } from './ModelHasRoles';

@Table({
  modelName: 'roles',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
})
export class Roles extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
    type: DataType.BIGINT.UNSIGNED,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    // Unique constraint handled by partial index in DB (allows reuse after soft delete)
  })
  name: string;

  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    unique: true,
  })
  uuid: string;

  @ForeignKey(() => Admins)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
  })
  created_by: number;

  @BelongsTo(() => Admins, 'created_by')
  created_by_admin: Admins;

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

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  deleted_at: Date;

  @BelongsToMany(() => Permissions, () => RoleHasPermissions)
  permissions: Permissions[];

  @BelongsToMany(() => Admins, () => ModelHasRoles)
  admins: Admins[];

  // @HasMany(() => RoleHasPermissions)
  // permissions: RoleHasPermissions[];
}
