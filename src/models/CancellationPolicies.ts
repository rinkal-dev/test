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
  modelName: 'cancellation_policies',
  timestamps: false,
})
export class CancellationPolicies extends Model {
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
    type: DataType.INTEGER.UNSIGNED,
    allowNull: false,
  })
  days_before_event: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: false,
  })
  refund_percentage: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  description: string;

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
  static createTimestamp(instance: CancellationPolicies) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: CancellationPolicies) {
    instance.updated_at = new Date();
  }

  // Relationships
  @BelongsTo(() => WeddingGroups)
  wedding_group: WeddingGroups;
}
