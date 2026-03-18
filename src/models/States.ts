import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Countries } from './Countries';
import { Cities } from './Cities';

@Table({
  modelName: 'states',
  timestamps: false,
})
export class States extends Model {
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

  @ForeignKey(() => Countries)
  @Column({
    allowNull: false,
    type: DataType.BIGINT.UNSIGNED,
  })
  country_id: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
  })
  code: string;

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
  static createTimestamp(instance: States) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: States) {
    instance.updated_at = new Date();
  }

  @BelongsTo(() => Countries)
  country: Countries;

  @HasMany(() => Cities)
  cities: Cities[];
}
