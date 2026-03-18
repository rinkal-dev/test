'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('wedding_groups', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      uuid: {
        type: Sequelize.CHAR(36),
        unique: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Event title e.g., Smith-Johnson Wedding',
      },
      bride_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      groom_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      event_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      event_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      booking_window_start: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'When guests can start booking',
      },
      booking_window_end: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'When booking closes',
      },
      booking_link: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        comment: 'Unique booking link for guests',
      },
      hotel_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      deposit_type: {
        type: Sequelize.ENUM('fixed', 'percentage'),
        allowNull: false,
      },
      deposit_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Deposit amount or percentage based on deposit_type',
      },
      final_payment_due_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
        comment: 'Days before event for final payment',
      },
      contact_name: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
        comment: 'Primary contact person (planner/family)',
      },
      contact_email: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      },
      contact_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null,
      },
      whatsapp_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Enable WhatsApp notifications for this group',
      },
      invitations_sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'When invitations were sent to guests',
      },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
      },
      created_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'admins',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
      },
    });

    // Add indexes for frequently queried columns
    await queryInterface.addIndex('wedding_groups', ['hotel_id']);
    await queryInterface.addIndex('wedding_groups', ['status']);
    await queryInterface.addIndex('wedding_groups', ['event_start_date']);
    await queryInterface.addIndex('wedding_groups', ['booking_link']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('wedding_groups');
  },
};
