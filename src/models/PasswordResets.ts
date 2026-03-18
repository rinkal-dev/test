import {
  Table,
  Column,
  Model,
  DataType,
  BeforeCreate,
} from 'sequelize-typescript';

@Table({
  modelName: 'password_resets',
  timestamps: false,
})
export class PasswordResets extends Model {
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
  static createTimestamp(instance: PasswordResets) {
    instance.created_at = new Date();
  }
}
