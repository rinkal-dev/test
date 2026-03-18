import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Roles } from './Roles';
import { Admins } from './Admins';
import { Users } from './Users';

@Table({
  modelName: 'model_has_roles',
  timestamps: false,
})
export class ModelHasRoles extends Model {
  @ForeignKey(() => Roles)
  @Column({
    primaryKey: true,
    type: DataType.BIGINT.UNSIGNED,
  })
  role_id: number;

  @Column({
    primaryKey: true,
    type: DataType.STRING,
  })
  model_type: string;

  @ForeignKey(() => Admins)
  // @ForeignKey(() => Users)
  @Column({
    primaryKey: true,
    type: DataType.BIGINT.UNSIGNED,
  })
  model_id: number;

  @BelongsTo(() => Roles)
  role: Roles;
}
