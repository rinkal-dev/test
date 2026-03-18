import {
  Table,
  Column,
  Model,
  DataType,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { ModelHasRoles } from './ModelHasRoles';
import { Roles } from './Roles';

@Table({
  modelName: 'admins',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
})
export class Admins extends Model {
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
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
    // Unique constraint handled by partial index in DB (allows reuse after soft delete)
  })
  email: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  email_verified_at: Date;

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
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: null,
  })
  mobile: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  mobile_verified_at: Date;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    defaultValue: null,
  })
  profile_image: string;

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

  @ForeignKey(() => Admins)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    defaultValue: null,
  })
  created_by: number;

  @BelongsTo(() => Admins, 'created_by')
  creator: Admins;

  @BelongsToMany(() => Roles, {
    through: {
      model: () => ModelHasRoles,
      scope: { model_type: 'Admin' },
    },
    foreignKey: 'model_id',
    otherKey: 'role_id',
  })
  roles: Roles[];
}
