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
import { v4 as uuidv4 } from 'uuid';
import { Bookings } from './Bookings';
import { Guests } from './Guests';

export type TransferStatus = 'pending' | 'confirmed' | 'not_needed' | 'cancelled';

@Table({
  modelName: 'guest_flights',
  timestamps: false,
})
export class GuestFlights extends Model {
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

  @ForeignKey(() => Bookings)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
  })
  booking_id: number;

  @ForeignKey(() => Guests)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
  })
  guest_id: number;

  // Arrival Flight Details
  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  arrival_airline: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  arrival_flight_number: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  arrival_date: string;

  @Column({
    type: DataType.TIME,
    allowNull: true,
  })
  arrival_time: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  arrival_airport: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  arrival_terminal: string;

  // Departure Flight Details
  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  departure_airline: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  departure_flight_number: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  departure_date: string;

  @Column({
    type: DataType.TIME,
    allowNull: true,
  })
  departure_time: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  departure_airport: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  departure_terminal: string;

  // Transfer Requirements
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  needs_arrival_transfer: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  needs_departure_transfer: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
  })
  passengers_count: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  transfer_notes: string;

  // Admin Management Fields
  @Column({
    type: DataType.ENUM('pending', 'confirmed', 'not_needed', 'cancelled'),
    defaultValue: 'pending',
  })
  arrival_transfer_status: TransferStatus;

  @Column({
    type: DataType.ENUM('pending', 'confirmed', 'not_needed', 'cancelled'),
    defaultValue: 'pending',
  })
  departure_transfer_status: TransferStatus;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  admin_notes: string;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  created_at: Date;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  updated_at: Date;

  // Associations
  @BelongsTo(() => Bookings)
  booking: Bookings;

  @BelongsTo(() => Guests)
  guest: Guests;

  // Hooks
  @BeforeCreate
  static addUuid(instance: GuestFlights) {
    if (!instance.uuid) {
      instance.uuid = uuidv4();
    }
  }

  @BeforeUpdate
  static updateTimestamp(instance: GuestFlights) {
    instance.updated_at = new Date();
  }
}
