import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { States } from './States';

@Table({
  modelName: 'cities',
  timestamps: false,
})
export class Cities extends Model {
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

  @ForeignKey(() => States)
  @Column({
    allowNull: false,
    type: DataType.BIGINT.UNSIGNED,
  })
  state_id: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '0 = Inactive, 1 = Active',
  })
  is_active: boolean;

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
  static createTimestamp(instance: Cities) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Cities) {
    instance.updated_at = new Date();
  }

  @BelongsTo(() => States)
  state: States;
}
