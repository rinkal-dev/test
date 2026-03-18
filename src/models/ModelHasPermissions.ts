import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
  modelName: 'model_has_permissions',
  timestamps: false,
})
export class ModelHasPermissions extends Model {
  @Column({
    primaryKey: true,
    type: DataType.BIGINT.UNSIGNED,
  })
  permission_id: number;

  @Column({
    primaryKey: true,
    type: DataType.STRING,
  })
  model_type: string;

  @Column({
    primaryKey: true,
    type: DataType.BIGINT.UNSIGNED,
  })
  model_id: number;
}
