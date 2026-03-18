import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BeforeCreate,
} from 'sequelize-typescript';
import { Hotels } from './Hotels';
import { Amenities } from './Amenities';

@Table({
  modelName: 'hotel_amenities',
  timestamps: false,
})
export class HotelAmenities extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
    type: DataType.BIGINT.UNSIGNED,
  })
  id: number;

  @ForeignKey(() => Hotels)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  hotel_id: number;

  @ForeignKey(() => Amenities)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  amenity_id: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  created_at: Date;

  @BeforeCreate
  static createTimestamp(instance: HotelAmenities) {
    instance.created_at = new Date();
  }
}
