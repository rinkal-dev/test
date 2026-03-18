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
import { WeddingGroups } from './WeddingGroups';
import { BookingAddons } from './BookingAddons';

@Table({
  modelName: 'group_addons',
  timestamps: false,
})
export class GroupAddons extends Model {
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

  @Column({
    type: DataType.ENUM(
      'extra_adult',
      'extra_child',
      'extra_bed',
      'breakfast',
      'airport_transfer',
      'late_checkout',
      'early_checkin',
      'other',
    ),
    allowNull: false,
  })
  addon_type: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  description: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  price: number;

  @Column({
    type: DataType.ENUM('per_stay', 'per_night', 'per_guest', 'per_guest_per_night'),
    allowNull: false,
    defaultValue: 'per_stay',
  })
  pricing_type: 'per_stay' | 'per_night' | 'per_guest' | 'per_guest_per_night';

  @Column({
    type: DataType.ENUM('all_guests', 'adults_only', 'children_only'),
    allowNull: false,
    defaultValue: 'all_guests',
  })
  applies_to: 'all_guests' | 'adults_only' | 'children_only';

  @Column({
    type: DataType.TINYINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
  })
  max_quantity: number;

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
  static createTimestamp(instance: GroupAddons) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: GroupAddons) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => WeddingGroups)
  wedding_group: WeddingGroups;

  @HasMany(() => BookingAddons)
  booking_addons: BookingAddons[];
}
