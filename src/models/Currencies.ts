import {
  Table,
  Column,
  Model,
  DataType,
  BeforeUpdate,
  BeforeCreate,
} from 'sequelize-typescript';

@Table({
  modelName: 'currencies',
  timestamps: false,
})
export class Currencies extends Model {
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
    type: DataType.STRING(3),
    allowNull: false,
    unique: true,
    comment: 'ISO 4217 currency code (USD, EUR, GBP, etc.)',
  })
  code: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: 'Full currency name (US Dollar, Euro, etc.)',
  })
  name: string;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    comment: 'Currency symbol ($, €, £, etc.)',
  })
  symbol: string;

  @Column({
    type: DataType.DECIMAL(12, 6),
    allowNull: false,
    defaultValue: 1.0,
    comment: 'Exchange rate relative to base currency',
  })
  exchange_rate: number;

  @Column({
    type: DataType.SMALLINT,
    allowNull: false,
    defaultValue: 2,
    comment: 'Number of decimal places (usually 2, some currencies use 0 or 3)',
  })
  decimal_places: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Only one currency can be default',
  })
  is_default: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether available for selection in bookings',
  })
  is_active: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether Stripe supports this currency',
  })
  stripe_supported: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    defaultValue: null,
    comment: 'When exchange rate was last updated',
  })
  exchange_rate_updated_at: Date;

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
  static createTimestamp(instance: Currencies) {
    instance.created_at = new Date();
  }

  @BeforeUpdate
  static updateTimestamp(instance: Currencies) {
    instance.updated_at = new Date();
  }
}
