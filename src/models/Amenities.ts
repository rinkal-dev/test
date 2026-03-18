import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Hotels } from './Hotels';
import { HotelAmenities } from './HotelAmenities';
import { Admins } from './Admins';

@Table({
  modelName: 'amenities',
  timestamps: false,
})
export class Amenities extends Model {
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
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  name: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'star',
  })
  icon: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'general',
  })
  category: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_active: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  sort_order: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  updated_at: Date;

  @ForeignKey(() => Admins)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  created_by: number;

  @BelongsTo(() => Admins, 'created_by')
  creator: Admins;

  @BeforeCreate
  static createTimestamp(instance: Amenities) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Amenities) {
    instance.updated_at = new Date();
  }

  // Many-to-many relationship with Hotels
  @BelongsToMany(() => Hotels, () => HotelAmenities)
  hotels: Hotels[];
}
