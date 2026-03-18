import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
} from 'sequelize-typescript';
import { SupportTickets } from './SupportTickets';
import { Admins } from './Admins';

@Table({
  tableName: 'ticket_messages',
  timestamps: false,
})
export class TicketMessages extends Model {
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

  @ForeignKey(() => SupportTickets)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  ticket_id: number;

  // Admin who sent the message (null if from guest)
  @ForeignKey(() => Admins)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  admin_id: number | null;

  // Author name for display (admin name or guest name)
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  author_name: string;

  // Message content
  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  message: string;

  // Internal notes (only visible to admins)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  is_internal: boolean;

  // Is this message from a guest (vs admin)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  is_from_guest: boolean;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  created_at: Date;

  // Associations
  @BelongsTo(() => SupportTickets)
  ticket: SupportTickets;

  @BelongsTo(() => Admins)
  admin: Admins;
}
