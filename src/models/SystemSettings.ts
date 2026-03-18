import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Unique,
  Default,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Admins } from './Admins';

@Table({
  tableName: 'system_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class SystemSettings extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Unique
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  uuid: string;

  @Unique
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  key: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  value: string;

  @Default('general')
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  category: string;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
  })
  is_secret: boolean;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
  })
  is_encrypted: boolean;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  description: string;

  @ForeignKey(() => Admins)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  updated_by: number;

  @BelongsTo(() => Admins)
  updatedByUser: Admins;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
