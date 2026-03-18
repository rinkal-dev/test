import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { WeddingGroups } from './WeddingGroups';
import { Bookings } from './Bookings';
import { Guests } from './Guests';
import { Admins } from './Admins';
import { TicketMessages } from './TicketMessages';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Table({
  tableName: 'support_tickets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class SupportTickets extends Model {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    unique: true,
  })
  uuid: string;

  // Ticket number for display (e.g., TKT-2026-0001)
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    unique: true,
  })
  ticket_number: string;

  // Optional link to wedding group
  @ForeignKey(() => WeddingGroups)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  wedding_group_id: number | null;

  // Optional link to booking
  @ForeignKey(() => Bookings)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  booking_id: number | null;

  // Optional link to registered guest
  @ForeignKey(() => Guests)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  guest_id: number | null;

  // Guest info (for non-registered or display purposes)
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  guest_name: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  guest_email: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  guest_phone: string | null;

  // Ticket details
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  subject: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  message: string;

  @Column({
    type: DataType.ENUM(...Object.values(TicketStatus)),
    allowNull: false,
    defaultValue: TicketStatus.OPEN,
  })
  status: TicketStatus;

  @Column({
    type: DataType.ENUM(...Object.values(TicketPriority)),
    allowNull: false,
    defaultValue: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  // Assignment
  @ForeignKey(() => Admins)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  assigned_to: number | null;

  // Timestamps
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  resolved_at: Date | null;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  closed_at: Date | null;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  created_at: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  updated_at: Date;

  // Associations
  @BelongsTo(() => WeddingGroups)
  wedding_group: WeddingGroups;

  @BelongsTo(() => Bookings)
  booking: Bookings;

  @BelongsTo(() => Guests)
  guest: Guests;

  @BelongsTo(() => Admins, 'assigned_to')
  assigned_admin: Admins;

  @HasMany(() => TicketMessages)
  messages: TicketMessages[];
}
