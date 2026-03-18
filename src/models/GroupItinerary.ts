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

@Table({
  tableName: 'group_itinerary',
  modelName: 'group_itinerary',
  timestamps: false,
})
export class GroupItinerary extends Model {
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
    type: DataType.STRING(255),
    allowNull: false,
  })
  title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    defaultValue: null,
  })
  description: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  event_date: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    defaultValue: null,
  })
  event_time: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    defaultValue: null,
  })
  location: string;

  @Column({
    type: DataType.ENUM('drink', 'beach', 'wedding', 'food', 'relax', 'other'),
    allowNull: false,
    defaultValue: 'other',
  })
  icon_type: string;

  @Column({
    type: DataType.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
  })
  sort_order: number;

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
  static createTimestamp(instance: GroupItinerary) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: GroupItinerary) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => WeddingGroups)
  wedding_group: WeddingGroups;
}
