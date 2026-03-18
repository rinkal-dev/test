import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { WeddingGroups } from './WeddingGroups';
import { RoomTypes } from './RoomTypes';

@Table({
  modelName: 'group_room_blocks',
  timestamps: false,
})
export class GroupRoomBlocks extends Model {
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

  @ForeignKey(() => WeddingGroups)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  wedding_group_id: number;

  @ForeignKey(() => RoomTypes)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  room_type_id: number;

  @Column({
    type: DataType.INTEGER.UNSIGNED,
    allowNull: false,
  })
  rooms_allocated: number;

  @Column({
    type: DataType.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  })
  rooms_booked: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  price_per_night: number;

  // Price type: per_room (default) or per_person
  @Column({
    type: DataType.ENUM('per_room', 'per_person'),
    allowNull: false,
    defaultValue: 'per_room',
  })
  price_type: 'per_room' | 'per_person';

  // Variable day-of-week pricing
  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  })
  rate_sun_wed: number; // Sun, Mon, Tue, Wed rate

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  })
  rate_thu_sat: number; // Thu, Fri, Sat rate

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: false,
    defaultValue: 2,
  })
  base_occupancy: number; // Adults included in base rate

  // Extra person charges (per night)
  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
  })
  extra_adult_per_night: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  })
  extra_child_per_night: number; // Child 4-12 years

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  })
  extra_teen_per_night: number; // Teen 13-17 years

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  min_nights: number;

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  max_nights: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_active: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
  })
  updated_at: Date;

  @BeforeCreate
  static createTimestamp(instance: GroupRoomBlocks) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: GroupRoomBlocks) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => WeddingGroups)
  wedding_group: WeddingGroups;

  @BelongsTo(() => RoomTypes)
  room_type: RoomTypes;
}
