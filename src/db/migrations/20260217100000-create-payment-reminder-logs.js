'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payment_reminder_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reminder_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Type: 30_days, 14_days, 7_days, 2_days',
      },
      sent_via: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'backend',
        comment: 'Source: n8n or backend',
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Index for quick lookups by booking_id and reminder_type
    await queryInterface.addIndex('payment_reminder_logs', ['booking_id', 'reminder_type'], {
      name: 'idx_payment_reminder_logs_booking_type',
    });

    // Index for checking reminders sent today
    await queryInterface.addIndex('payment_reminder_logs', ['sent_at'], {
      name: 'idx_payment_reminder_logs_sent_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payment_reminder_logs');
  },
};
