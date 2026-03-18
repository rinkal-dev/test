import {
  Table,
  Column,
  Model,
  DataType,
  BeforeCreate,
} from 'sequelize-typescript';

@Table({
  modelName: 'admin_password_resets',
  timestamps: false,
})
export class AdminPasswordResets extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  token: string;

  @Column({
    type: DataType.DATE,
    defaultValue: null,
    allowNull: true,
  })
  created_at: Date;

  @BeforeCreate
  static createTimestamp(instance: AdminPasswordResets) {
    instance.created_at = new Date();
  }
}
