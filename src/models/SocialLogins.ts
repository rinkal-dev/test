import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
} from 'sequelize-typescript';

@Table({
  modelName: 'social_logins',
  timestamps: false,
})
export class SocialLogins extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
    type: DataType.BIGINT.UNSIGNED,
  })
  id: number;

  @Column({
    allowNull: false,
    type: DataType.BIGINT.UNSIGNED,
  })
  user_id: number;

  @Column({
    type: DataType.STRING(250),
    allowNull: false,
  })
  social_id: string;

  @Column({
    type: DataType.TINYINT({ length: 1 }).UNSIGNED,
    comment: '1 = Google, 2 = Facebook, 3 = Twitter, 4 = Apple',
    allowNull: false,
  })
  type: string;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: false,
  })
  data: string;

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
  static createTimestamp(instance: SocialLogins) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: SocialLogins) {
    instance.updated_at = new Date();
  }
}
