import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
  HasMany,
} from 'sequelize-typescript';
import { States } from './States';

@Table({
  modelName: 'countries',
  timestamps: false,
})
export class Countries extends Model<Countries> {
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
    allowNull: false,
    type: DataType.STRING(50),
  })
  name: string;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
  })
  code: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  isd_code: string;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
  })
  currency_code: string;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
  })
  emoji: string;

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
  static createTimestamp(instance: Countries) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Countries) {
    instance.updated_at = new Date();
  }

  @HasMany(() => States)
  states: States[];
}
